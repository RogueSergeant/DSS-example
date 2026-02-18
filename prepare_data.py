"""
Data Preparation & Schema — Brief 1
Reads Global_Superstore.xls, builds star-schema tables,
computes calculated fields, and exports nine JSON files.
"""

import json
import math
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.interpolate import PchipInterpolator

warnings.filterwarnings("ignore")

SRC = Path(__file__).parent
XLS = SRC / "Global Superstore.xls"
OUT = SRC / "data"
OUT.mkdir(exist_ok=True)

RETURN_MARKETS = {"US", "United States", "EU", "LATAM", "APAC"}
MARKETS_WITH_RETURN_DATA = {"US", "EU", "LATAM", "APAC"}  # normalised market names

# Markets in Returns sheet that map to Orders market names
RETURN_MARKET_MAP = {"United States": "US"}

# ---------------------------------------------------------------------------
# 1. Load raw sheets
# ---------------------------------------------------------------------------
print("Loading Excel sheets …")
orders_raw = pd.read_excel(XLS, sheet_name="Orders")
returns_raw = pd.read_excel(XLS, sheet_name="Returns")
people_raw = pd.read_excel(XLS, sheet_name="People")

print(f"  Orders : {orders_raw.shape}")
print(f"  Returns: {returns_raw.shape}")
print(f"  People : {people_raw.shape}")

# ---------------------------------------------------------------------------
# 2. Cleaning
# ---------------------------------------------------------------------------
print("Cleaning …")

# 2.1 Orders -----------------------------------------------------------------
orders = orders_raw.copy()
orders["Discount"] = orders["Discount"].round(2)
orders["delivery_days"] = (orders["Ship Date"] - orders["Order Date"]).dt.days

# 2.2 Returns ----------------------------------------------------------------
returns = returns_raw.copy()
# Normalise market names so join works
returns["Market"] = returns["Market"].replace(RETURN_MARKET_MAP)
returned_order_ids = set(returns["Order ID"].unique())

orders["is_returned"] = orders["Order ID"].isin(returned_order_ids)

# 2.3 People -----------------------------------------------------------------
# Drop AMEA row (Larry Hughes) — no matching region in Orders
people = people_raw.copy()
people = people[people["Region"] != "AMEA"].copy()
people = people.rename(columns={"Person": "regional_manager", "Region": "Region"})

# ---------------------------------------------------------------------------
# 3. Calculated fields — Phase 1 (needed before dimensions)
# ---------------------------------------------------------------------------

# 3.1 discount_band ----------------------------------------------------------
def discount_band(d):
    if d == 0.0:
        return "None"
    elif d <= 0.15:
        return "1–15%"
    elif d <= 0.30:
        return "16–30%"
    elif d <= 0.50:
        return "31–50%"
    else:
        return "51%+"

orders["discount_band"] = orders["Discount"].apply(discount_band)
orders["is_heavy_discount"] = orders["Discount"] >= 0.30

# 3.2 geography_key ----------------------------------------------------------
orders["geography_key"] = orders["Country"] + "|" + orders["Region"]

# ---------------------------------------------------------------------------
# 4. Build dim_geography (needs discount_regime computation)
# ---------------------------------------------------------------------------
print("Building dim_geography …")

geo_cols = ["Country", "Region", "Market", "City", "State"]
geo = orders[geo_cols + ["geography_key"]].drop_duplicates(subset=["geography_key"])

# Join People on Region (excludes EMEA because Larry Hughes was dropped)
geo = geo.merge(people, on="Region", how="left")

# has_return_data — per market
geo["has_return_data"] = geo["Market"].isin(MARKETS_WITH_RETURN_DATA)

# 4.1 discount_regime ---------------------------------------------------------
print("  Computing discount_regime per country …")

country_disc = orders.groupby(["Country", "Discount"]).size().reset_index(name="cnt")
country_total = orders.groupby("Country").size().reset_index(name="total")
country_disc = country_disc.merge(country_total, on="Country")
country_disc["pct"] = country_disc["cnt"] / country_disc["total"]

regime_rows = []
for country, grp in country_disc.groupby("Country"):
    total = grp["total"].iloc[0]
    zero_pct = grp.loc[grp["Discount"] == 0.0, "pct"].sum()
    nonzero = grp[grp["Discount"] != 0.0].copy()
    n_distinct = len(grp)
    n_nonzero_distinct = len(nonzero)

    if zero_pct > 0.90:
        regime_rows.append({"Country": country, "discount_regime": "Zero discount",
                            "fixed_discount_rate": None})
        continue

    # Check "Fixed at X%" — >90% share a single non-zero value
    top_val = grp.sort_values("pct", ascending=False).iloc[0]
    if top_val["Discount"] != 0.0 and top_val["pct"] > 0.90:
        regime_rows.append({"Country": country, "discount_regime": "Fixed",
                            "fixed_discount_rate": float(top_val["Discount"])})
        continue

    # Check "Mostly fixed at X%" — 2-3 distinct values; dominant >70%
    if n_distinct <= 3:
        dominant = grp.sort_values("pct", ascending=False).iloc[0]
        if dominant["Discount"] != 0.0 and dominant["pct"] > 0.70:
            regime_rows.append({"Country": country, "discount_regime": "Fixed",
                                "fixed_discount_rate": float(dominant["Discount"])})
            continue
        # Also check: dominant might be zero, second might be >70% of non-zero
        if dominant["Discount"] == 0.0 and len(nonzero) > 0:
            dom_nz = nonzero.sort_values("pct", ascending=False).iloc[0]
            if dom_nz["pct"] > 0.70:
                regime_rows.append({"Country": country, "discount_regime": "Fixed",
                                    "fixed_discount_rate": float(dom_nz["Discount"])})
                continue

    regime_rows.append({"Country": country, "discount_regime": "Variable",
                        "fixed_discount_rate": None})

regime_df = pd.DataFrame(regime_rows)
geo = geo.merge(regime_df, on="Country", how="left")

# Rename columns to snake_case for dim_geography
dim_geography = geo.rename(columns={
    "City": "city",
    "State": "state",
    "Country": "country",
    "Region": "region",
    "Market": "market",
}).copy()

# Keep only one row per geography_key (deduplicate multi-city entries per key)
# Actually geography_key = Country|Region, but city/state vary within that.
# The brief defines geography_key as Country|Region, so we need one row per unique key.
# We'll keep a representative city/state (first occurrence).
dim_geography = dim_geography.drop_duplicates(subset=["geography_key"])

dim_geography = dim_geography[["geography_key", "city", "state", "country", "region",
                                "market", "regional_manager", "discount_regime",
                                "has_return_data", "fixed_discount_rate"]]

print(f"  dim_geography: {len(dim_geography)} rows")
print(f"  Regime counts:\n{dim_geography['discount_regime'].value_counts().to_string()}")

# ---------------------------------------------------------------------------
# 5. Build dim_date
# ---------------------------------------------------------------------------
print("Building dim_date …")
dates = orders["Order Date"].dropna().unique()
date_df = pd.DataFrame({"date_key": pd.to_datetime(dates)})
date_df = date_df.drop_duplicates().sort_values("date_key").reset_index(drop=True)
date_df["year"] = date_df["date_key"].dt.year
date_df["quarter"] = date_df["date_key"].dt.quarter
date_df["month"] = date_df["date_key"].dt.month
date_df["year_quarter"] = date_df["year"].astype(str) + "-Q" + date_df["quarter"].astype(str)

dim_date = date_df.copy()
print(f"  dim_date: {len(dim_date)} rows")

# ---------------------------------------------------------------------------
# 6. Build dim_product (needs breakeven_discount from variable-regime countries)
# ---------------------------------------------------------------------------
print("Building dim_product …")

# Identify variable-regime countries
variable_countries = set(
    dim_geography.loc[dim_geography["discount_regime"] == "Variable", "country"]
)

# 6.1 Breakeven discount per sub-category ------------------------------------
print("  Computing breakeven_discount per sub-category …")

# Filter to variable-regime countries only
var_orders = orders[orders["Country"].isin(variable_countries)].copy()
var_orders["margin"] = var_orders["Profit"] / var_orders["Sales"]

# For each sub-category, compute average margin at each observed discount rate
breakeven_map = {}
for subcat, grp in var_orders.groupby("Sub-Category"):
    disc_margin = grp.groupby("Discount")["margin"].mean().sort_index()

    if len(disc_margin) < 2:
        breakeven_map[subcat] = None
        continue

    x = disc_margin.index.values.astype(float)
    y = disc_margin.values.astype(float)

    # Use PCHIP (monotone cubic interpolation)
    try:
        interp = PchipInterpolator(x, y)
        # Search for zero crossing between min and max discount
        x_fine = np.linspace(x.min(), x.max(), 10000)
        y_fine = interp(x_fine)

        # Find zero crossings
        crossings = []
        for i in range(len(y_fine) - 1):
            if y_fine[i] * y_fine[i + 1] < 0:
                # Linear interpolation for precise crossing
                x0 = x_fine[i] - y_fine[i] * (x_fine[i + 1] - x_fine[i]) / (y_fine[i + 1] - y_fine[i])
                crossings.append(x0)

        if crossings:
            # Round to nearest 0.05 for the reference values
            raw_be = crossings[0]
            breakeven_map[subcat] = round(raw_be, 2)
        else:
            # If margin is always positive, breakeven is beyond observed range
            breakeven_map[subcat] = None
    except Exception:
        breakeven_map[subcat] = None

print("  Breakeven discounts:")
for sc in sorted(breakeven_map.keys()):
    val = breakeven_map[sc]
    print(f"    {sc}: {val}")

# Build dim_product
prod_cols = ["Product ID", "Product Name", "Category", "Sub-Category"]
dim_product = orders[prod_cols].drop_duplicates(subset=["Product ID"]).copy()
dim_product = dim_product.rename(columns={
    "Product ID": "product_key",
    "Product Name": "product_name",
    "Category": "category",
    "Sub-Category": "sub_category",
})
dim_product["breakeven_discount"] = dim_product["sub_category"].map(breakeven_map)
print(f"  dim_product: {len(dim_product)} rows")

# ---------------------------------------------------------------------------
# 7. Build dim_customer
# ---------------------------------------------------------------------------
print("Building dim_customer …")

# is_copier_buyer — computed over full dataset
copier_buyers = set(
    orders.loc[orders["Sub-Category"] == "Copiers", "Customer ID"].unique()
)

cust_agg = orders.groupby("Customer ID").agg(
    customer_name=("Customer Name", "first"),
    segment=("Segment", "first"),
    lifetime_sales=("Sales", "sum"),
    lifetime_profit=("Profit", "sum"),
).reset_index()

cust_agg = cust_agg.rename(columns={"Customer ID": "customer_key"})
cust_agg["is_copier_buyer"] = cust_agg["customer_key"].isin(copier_buyers)
cust_agg["lifetime_margin"] = cust_agg["lifetime_profit"] / cust_agg["lifetime_sales"]

dim_customer = cust_agg[["customer_key", "customer_name", "segment",
                          "is_copier_buyer", "lifetime_sales", "lifetime_profit",
                          "lifetime_margin"]].copy()
print(f"  dim_customer: {len(dim_customer)} rows")

# ---------------------------------------------------------------------------
# 8. Build fact_orders
# ---------------------------------------------------------------------------
print("Building fact_orders …")

fact_orders = pd.DataFrame({
    "row_id": orders["Row ID"],
    "order_id": orders["Order ID"],
    "date_key": orders["Order Date"],
    "customer_key": orders["Customer ID"],
    "product_key": orders["Product ID"],
    "geography_key": orders["geography_key"],
    "sales": orders["Sales"],
    "quantity": orders["Quantity"],
    "discount": orders["Discount"],
    "profit": orders["Profit"],
    "shipping_cost": orders["Shipping Cost"],
    "ship_mode": orders["Ship Mode"],
    "order_priority": orders["Order Priority"],
    "delivery_days": orders["delivery_days"],
    "is_returned": orders["is_returned"],
    "discount_band": orders["discount_band"],
    "is_heavy_discount": orders["is_heavy_discount"],
})

print(f"  fact_orders: {len(fact_orders)} rows")

# ---------------------------------------------------------------------------
# 9. JSON Exports
# ---------------------------------------------------------------------------
print("Generating JSON exports …")


def to_json_file(df, filename):
    """Write a DataFrame to a JSON file with proper types."""
    path = OUT / filename
    # Convert to records, handling NaN/NaT
    records = json.loads(df.to_json(orient="records", date_format="iso", default_handler=str))
    with open(path, "w") as f:
        json.dump(records, f, indent=2, allow_nan=False, default=str)
    print(f"  Wrote {path.name} ({len(records)} records)")


# Helper: merge fact + dims for full detail
detail = fact_orders.merge(dim_date, on="date_key", how="left")
detail = detail.merge(dim_customer, on="customer_key", how="left")
detail = detail.merge(dim_product, on="product_key", how="left")
detail = detail.merge(dim_geography, on="geography_key", how="left")


# 9.1 summary_overview.json — Year × Market × Category ----------------------
print("  summary_overview …")
detail["margin_pct"] = detail["profit"] / detail["sales"]
ov = detail.groupby(["year", "market", "category"]).agg(
    sales=("sales", "sum"),
    profit=("profit", "sum"),
    customer_count=("customer_key", "nunique"),
).reset_index()
ov["margin_pct"] = ov["profit"] / ov["sales"]
ov["sales"] = ov["sales"].round(2)
ov["profit"] = ov["profit"].round(2)
ov["margin_pct"] = ov["margin_pct"].round(6)
to_json_file(ov, "summary_overview.json")


# 9.2 summary_discount.json — Quarter × Discount Band -----------------------
print("  summary_discount …")
disc = detail.copy()
disc["year_quarter"] = disc["year"].astype(str) + "-Q" + disc["quarter"].astype(str)
sd = disc.groupby(["year_quarter", "discount_band"]).agg(
    order_count=("row_id", "count"),
    profit=("profit", "sum"),
    sales=("sales", "sum"),
).reset_index()
sd["margin_pct"] = (sd["profit"] / sd["sales"]).round(6)
sd["profit"] = sd["profit"].round(2)
sd = sd.drop(columns=["sales"])
to_json_file(sd, "summary_discount.json")


# 9.3 summary_country_regime.json — Country ----------------------------------
print("  summary_country_regime …")

# Compute country-level aggregates from orders
country_agg = detail.groupby("country").agg(
    profit=("profit", "sum"),
    sales=("sales", "sum"),
    order_count=("row_id", "count"),
).reset_index()
country_agg["margin_pct"] = (country_agg["profit"] / country_agg["sales"]).round(6)
country_agg["profit"] = country_agg["profit"].round(2)

# Get regime info from dim_geography (one row per country)
geo_country = dim_geography[["country", "region", "market", "regional_manager",
                              "discount_regime", "fixed_discount_rate",
                              "has_return_data"]].drop_duplicates(subset=["country"])

scr = country_agg.merge(geo_country, on="country", how="left")

# Annual loss for fixed-regime countries: sum of profit where discount > 0
# (approximation: lost margin from giving fixed discounts)
# More precisely: loss = sum of (discount * sales) for each fixed-discount country
fixed_countries = set(dim_geography.loc[dim_geography["discount_regime"] == "Fixed", "country"])
country_loss = detail[detail["country"].isin(fixed_countries)].groupby("country").agg(
    total_discount_cost=("sales", lambda x: 0),  # placeholder
).reset_index()

# Compute annual loss as: for fixed-discount countries, the negative profit from discounted orders
# We define annual_loss as total profit lost per year (averaged)
years_in_data = detail["year"].nunique()
for c in fixed_countries:
    c_data = detail[detail["country"] == c]
    # Loss = profit that would have been earned at zero discount minus actual profit
    # Simpler: annual_loss = negative profit from discounted lines / years
    discounted = c_data[c_data["discount"] > 0]
    loss = -discounted["profit"].sum() if discounted["profit"].sum() < 0 else 0
    if c in scr["country"].values:
        scr.loc[scr["country"] == c, "annual_loss"] = round(loss / years_in_data, 2)

scr["annual_loss"] = scr.get("annual_loss", pd.Series(dtype=float)).fillna(0).round(2)
if "annual_loss" not in scr.columns:
    scr["annual_loss"] = 0.0

scr = scr[["country", "discount_regime", "fixed_discount_rate", "margin_pct",
            "profit", "annual_loss", "market", "region", "regional_manager",
            "order_count", "has_return_data"]]
to_json_file(scr, "summary_country_regime.json")


# 9.4 summary_manager.json — Manager × Year ---------------------------------
print("  summary_manager …")

# Map manager to each order via region
mgr_detail = detail.copy()
mgr_detail = mgr_detail[mgr_detail["regional_manager"].notna()]

mgr_raw = mgr_detail.groupby(["regional_manager", "year"]).agg(
    sales=("sales", "sum"),
    profit=("profit", "sum"),
).reset_index()
mgr_raw["margin_pct"] = (mgr_raw["profit"] / mgr_raw["sales"]).round(6)
mgr_raw["sales"] = mgr_raw["sales"].round(2)
mgr_raw["profit"] = mgr_raw["profit"].round(2)

# Policy-adjusted: for fixed-discount countries under each manager,
# recompute profit as if discount = 0 (remove discount effect)
# i.e., adjusted_profit = profit + (discount * sales) for fixed-country lines
mgr_adj_records = []
for (mgr, yr), grp in mgr_detail.groupby(["regional_manager", "year"]):
    fixed_lines = grp[grp["country"].isin(fixed_countries)]
    adj_profit = grp["profit"].sum() + (fixed_lines["discount"] * fixed_lines["sales"]).sum()
    adj_margin = adj_profit / grp["sales"].sum() if grp["sales"].sum() != 0 else 0
    # Count fixed countries under this manager
    fc = grp[grp["country"].isin(fixed_countries)]["country"].nunique()
    mgr_adj_records.append({
        "regional_manager": mgr,
        "year": yr,
        "adjusted_profit": round(float(adj_profit), 2),
        "adjusted_margin_pct": round(float(adj_margin), 6),
        "fixed_country_count": int(fc),
    })

mgr_adj = pd.DataFrame(mgr_adj_records)
sm = mgr_raw.merge(mgr_adj, on=["regional_manager", "year"], how="left")
to_json_file(sm, "summary_manager.json")


# 9.5 summary_product.json — Sub-Category -----------------------------------
print("  summary_product …")

subcat_stats = []
for subcat, grp in detail.groupby("sub_category"):
    zero_disc = grp[grp["discount"] == 0]
    zero_margin = zero_disc["profit"].sum() / zero_disc["sales"].sum() if zero_disc["sales"].sum() != 0 else None
    heavy = grp[grp["is_heavy_discount"]]
    non_heavy = grp[~grp["is_heavy_discount"]]
    discounted = grp[grp["discount"] > 0]
    avg_disc_margin = discounted["profit"].sum() / discounted["sales"].sum() if discounted["sales"].sum() != 0 else None

    be = breakeven_map.get(subcat)
    # Recommended ceiling = breakeven rounded down to nearest 0.05
    rec_ceiling = None
    if be is not None:
        rec_ceiling = math.floor(be / 0.05) * 0.05
        rec_ceiling = round(rec_ceiling, 2)

    subcat_stats.append({
        "sub_category": subcat,
        "zero_discount_margin": round(zero_margin, 6) if zero_margin is not None else None,
        "breakeven_discount": round(be, 2) if be is not None else None,
        "recommended_ceiling": rec_ceiling,
        "avg_discounted_margin": round(avg_disc_margin, 6) if avg_disc_margin is not None else None,
        "order_count_heavy_discount": int(heavy.shape[0]),
        "order_count_not_heavy_discount": int(non_heavy.shape[0]),
    })

sp = pd.DataFrame(subcat_stats)
to_json_file(sp, "summary_product.json")


# 9.6 whatif_discount_curve.json — Discount rate 0.00–0.70 at 0.01 steps -----
print("  whatif_discount_curve …")

# Use variable-country data
var_detail = detail[detail["country"].isin(variable_countries)].copy()
var_detail["margin"] = var_detail["profit"] / var_detail["sales"]

disc_margins = var_detail.groupby("discount").agg(
    avg_margin=("margin", "mean"),
    sales=("sales", "sum"),
    profit=("profit", "sum"),
    count=("row_id", "count"),
).reset_index()

# Fit PCHIP to all data points
x_obs = disc_margins["discount"].values.astype(float)
y_obs = (disc_margins["profit"] / disc_margins["sales"]).values.astype(float)
# Use margin computed as total profit / total sales per discount level
y_obs2 = disc_margins["avg_margin"].values.astype(float)

sort_idx = np.argsort(x_obs)
x_obs = x_obs[sort_idx]
y_obs2 = y_obs2[sort_idx]

interp = PchipInterpolator(x_obs, y_obs2)
x_curve = np.round(np.arange(0.0, 0.71, 0.01), 2)
y_curve = interp(x_curve)

wdc = pd.DataFrame({
    "discount_rate": x_curve,
    "expected_margin_pct": np.round(y_curve, 6),
})
to_json_file(wdc, "whatif_discount_curve.json")


# 9.7 whatif_product_breakeven.json — Sub-Category ---------------------------
print("  whatif_product_breakeven …")
wpb_records = []
for subcat in sorted(breakeven_map.keys()):
    be = breakeven_map[subcat]
    # zero-discount margin
    zd = detail[(detail["sub_category"] == subcat) & (detail["discount"] == 0)]
    zm = zd["profit"].sum() / zd["sales"].sum() if zd["sales"].sum() != 0 else None

    rec_ceiling = None
    if be is not None:
        rec_ceiling = math.floor(be / 0.05) * 0.05
        rec_ceiling = round(rec_ceiling, 2)

    wpb_records.append({
        "sub_category": subcat,
        "breakeven_discount": round(be, 2) if be is not None else None,
        "zero_discount_margin": round(zm, 6) if zm is not None else None,
        "recommended_ceiling": rec_ceiling,
    })

wpb = pd.DataFrame(wpb_records)
to_json_file(wpb, "whatif_product_breakeven.json")


# 9.8 summary_customers.json — Customer -------------------------------------
print("  summary_customers …")

cust_orders = detail.groupby("customer_key").agg(
    order_count=("order_id", "nunique"),
).reset_index()

sc = dim_customer.merge(cust_orders, on="customer_key", how="left")
sc["lifetime_sales"] = sc["lifetime_sales"].round(2)
sc["lifetime_profit"] = sc["lifetime_profit"].round(2)
sc["lifetime_margin"] = sc["lifetime_margin"].round(6)
sc = sc[["customer_key", "customer_name", "segment", "lifetime_sales",
          "lifetime_profit", "lifetime_margin", "order_count", "is_copier_buyer"]]
to_json_file(sc, "summary_customers.json")


# 9.9 detail_orders.json — Full fact + dimensions ---------------------------
print("  detail_orders …")

# Convert date_key to string for JSON serialisation
detail_out = detail.copy()
detail_out["date_key"] = detail_out["date_key"].dt.strftime("%Y-%m-%d")
detail_out["sales"] = detail_out["sales"].round(2)
detail_out["profit"] = detail_out["profit"].round(2)
detail_out["shipping_cost"] = detail_out["shipping_cost"].round(2)
detail_out["discount"] = detail_out["discount"].round(2)
if "lifetime_sales" in detail_out.columns:
    detail_out["lifetime_sales"] = detail_out["lifetime_sales"].round(2)
if "lifetime_profit" in detail_out.columns:
    detail_out["lifetime_profit"] = detail_out["lifetime_profit"].round(2)
if "lifetime_margin" in detail_out.columns:
    detail_out["lifetime_margin"] = detail_out["lifetime_margin"].round(6)
if "margin_pct" in detail_out.columns:
    detail_out["margin_pct"] = detail_out["margin_pct"].round(6)
to_json_file(detail_out, "detail_orders.json")

# ---------------------------------------------------------------------------
# 10. Save star-schema tables as CSV (for reference / debugging)
# ---------------------------------------------------------------------------
print("Saving star schema CSVs …")
fact_orders.to_csv(OUT / "fact_orders.csv", index=False)
dim_date_out = dim_date.copy()
dim_date_out["date_key"] = dim_date_out["date_key"].dt.strftime("%Y-%m-%d")
dim_date_out.to_csv(OUT / "dim_date.csv", index=False)
dim_customer.to_csv(OUT / "dim_customer.csv", index=False)
dim_product.to_csv(OUT / "dim_product.csv", index=False)
dim_geography.to_csv(OUT / "dim_geography.csv", index=False)

print("\nDone. All files written to", OUT)

# Data Dictionary & Pipeline Guide

## Quick Start

```bash
pip install pandas openpyxl xlrd scipy numpy
python prepare_data.py
```

This reads `Global Superstore.xls` and writes all outputs to the `data/` directory.
Re-running the script is idempotent — it overwrites all outputs cleanly.

### Dependencies

| Package | Version tested | Purpose |
|---------|---------------|---------|
| pandas | 3.0+ | DataFrames, Excel I/O, aggregation |
| openpyxl | 3.1+ | .xls reading support |
| xlrd | 2.0+ | .xls reading support |
| scipy | 1.17+ | PCHIP monotone interpolation (breakeven curves) |
| numpy | 2.4+ | Numerical arrays |

---

## Source Data

**File:** `Global Superstore.xls` (18 MB, three sheets)

| Sheet | Rows | Columns | Grain |
|-------|------|---------|-------|
| Orders | 51,290 | 24 | One row per order line item |
| Returns | 1,173 | 3 | One row per returned order |
| People | 13 | 2 | One row per regional manager |

---

## Star Schema

All tables are exported as CSVs in `data/` for inspection, and consumed by the JSON
exports for downstream dashboard pages.

```
dim_date ──< fact_orders >── dim_customer
                  │
             dim_product
                  │
             dim_geography
```

All joins are many-to-one (many fact rows to one dimension row).

### fact_orders (51,290 rows)

Primary key: `row_id`

| Column | Type | Description |
|--------|------|-------------|
| `row_id` | int (PK) | Unique line-item identifier from source Row ID |
| `order_id` | string (FK) | Order-level identifier; repeats for multi-item orders |
| `date_key` | date (FK) | Order Date → joins to `dim_date` |
| `customer_key` | string (FK) | Customer ID → joins to `dim_customer` |
| `product_key` | string (FK) | Product ID → joins to `dim_product` |
| `geography_key` | string (FK) | `Country\|Region` composite → joins to `dim_geography` |
| `sales` | float | Revenue in USD |
| `quantity` | int | Units sold |
| `discount` | float | Discount rate, rounded to 2 d.p. (0.00 = no discount) |
| `profit` | float | Profit in USD |
| `shipping_cost` | float | Shipping cost in USD |
| `ship_mode` | string | Same Day / First Class / Second Class / Standard Class |
| `order_priority` | string | Critical / High / Medium / Low |
| `delivery_days` | int | Ship Date minus Order Date in calendar days |
| `is_returned` | boolean | True if Order ID appears in Returns sheet |
| `discount_band` | string | Categorical: None / 1–15% / 16–30% / 31–50% / 51%+ |
| `is_heavy_discount` | boolean | True if discount >= 0.30 |

### dim_date (1,430 rows)

Primary key: `date_key`

| Column | Type | Description |
|--------|------|-------------|
| `date_key` | date (PK) | Unique order date |
| `year` | int | 2011–2014 |
| `quarter` | int | 1–4 |
| `month` | int | 1–12 |
| `year_quarter` | string | e.g. `"2014-Q3"` |

### dim_customer (1,590 rows)

Primary key: `customer_key`

| Column | Type | Description |
|--------|------|-------------|
| `customer_key` | string (PK) | Customer ID from source |
| `customer_name` | string | Full name |
| `segment` | string | Consumer / Corporate / Home Office |
| `is_copier_buyer` | boolean | True if customer has any Copiers sub-category order (stable label, computed over full dataset before filtering) |
| `lifetime_sales` | float | Sum of sales across all orders |
| `lifetime_profit` | float | Sum of profit across all orders |
| `lifetime_margin` | float | lifetime_profit / lifetime_sales (decimal, e.g. 0.12 = 12%) |

### dim_product (10,292 rows)

Primary key: `product_key`

| Column | Type | Description |
|--------|------|-------------|
| `product_key` | string (PK) | Product ID from source |
| `product_name` | string | Full product name |
| `category` | string | Technology / Furniture / Office Supplies |
| `sub_category` | string | 17 sub-categories (Accessories, Appliances, Art, Binders, Bookcases, Chairs, Copiers, Envelopes, Fasteners, Furnishings, Labels, Machines, Paper, Phones, Storage, Supplies, Tables) |
| `breakeven_discount` | float | Discount rate at which sub-category's average margin crosses zero. Computed via PCHIP interpolation on variable-regime countries only. Null if no crossing found. |

### dim_geography (152 rows)

Primary key: `geography_key`

| Column | Type | Description |
|--------|------|-------------|
| `geography_key` | string (PK) | `Country\|Region` composite key |
| `city` | string | Representative city (first occurrence for this key) |
| `state` | string | State/province |
| `country` | string | Country name (147 unique countries) |
| `region` | string | Region label (13 unique: Africa, Canada, Caribbean, Central, Central Asia, EMEA, East, North, North Asia, Oceania, South, Southeast Asia, West) |
| `market` | string | Market grouping (7 unique: APAC, Africa, Canada, EMEA, EU, LATAM, US) |
| `regional_manager` | string/null | Manager name from People sheet. **Null for EMEA** (see caveats). |
| `discount_regime` | string | Zero discount / Fixed / Variable (see below) |
| `has_return_data` | boolean | True for US, EU, LATAM, APAC markets only |
| `fixed_discount_rate` | float/null | Dominant discount rate for Fixed-regime countries. Null for others. |

---

## Calculated Fields

### discount_band

Applied per row in fact_orders based on the `discount` value.

| Band | Condition |
|------|-----------|
| `None` | discount = 0.00 |
| `1–15%` | 0.00 < discount <= 0.15 |
| `16–30%` | 0.15 < discount <= 0.30 |
| `31–50%` | 0.30 < discount <= 0.50 |
| `51%+` | discount > 0.50 |

### discount_regime

Classified per country by examining the distribution of discount values across all order lines.

| Regime | Rule | Count |
|--------|------|-------|
| **Zero discount** | >90% of lines have discount = 0.00 | 106 geography keys |
| **Fixed** | >90% of lines share a single non-zero value, OR 2–3 distinct values where the dominant non-zero value >70% | 24 countries |
| **Variable** | Multiple discount rates; no single value dominates | 22 geography keys |

The 24 Fixed-regime countries and their dominant rates:

| Country | Rate | Country | Rate |
|---------|------|---------|------|
| Argentina | 0.40 | Pakistan | 0.50 |
| Denmark | 0.50 | Panama | 0.40 |
| Haiti | 0.40 | Papua New Guinea | 0.50 |
| Honduras | 0.40 | Peru | 0.40 |
| Ireland | 0.50 | Portugal | 0.50 |
| Kazakhstan | 0.70 | South Korea | 0.50 |
| Lithuania | 0.70 | Sweden | 0.50 |
| Netherlands | 0.50 | Tajikistan | 0.70 |
| Nigeria | 0.70 | Turkey | 0.60 |
| Turkmenistan | 0.70 | UAE | 0.70 |
| Uganda | 0.70 | Venezuela | 0.40 |
| Yemen | 0.70 | Zimbabwe | 0.70 |

### breakeven_discount

Per sub-category, the discount rate at which average margin crosses zero.

**Method:**
1. Filter to variable-regime countries only (removes systematic policy distortion).
2. Compute average margin (profit/sales per line, then mean) at each observed discount rate.
3. Fit a PCHIP (monotone cubic Hermite) interpolation curve.
4. Find the first x-value where the curve crosses y = 0.

| Sub-Category | Breakeven | Sub-Category | Breakeven |
|-------------|-----------|-------------|-----------|
| Storage | 0.19 | Chairs | 0.27 |
| Supplies | 0.21 | Copiers | 0.27 |
| Tables | 0.21 | Accessories | 0.28 |
| Bookcases | 0.24 | Appliances | 0.28 |
| Machines | 0.24 | Furnishings | 0.28 |
| Art | 0.25 | Fasteners | 0.30 |
| Phones | 0.26 | Envelopes | 0.32 |
| | | Labels | 0.32 |
| | | Paper | 0.32 |
| | | Binders | 0.33 |

### recommended_ceiling

`breakeven_discount` rounded **down** to the nearest 0.05. This is the safe maximum
discount that keeps the sub-category profitable.

### annual_loss

For Fixed-regime countries: the absolute value of negative profit from discounted order
lines, averaged across the 4 years (2011–2014). Zero for non-fixed countries.

### Policy-adjusted profit/margin (summary_manager.json)

For each manager-year combination, `adjusted_profit` adds back the discount-times-sales
amount for all lines from Fixed-regime countries under that manager. This estimates
what profit would have been if those countries had zero discount.

---

## JSON Export Files

All files are in `data/`. Convention: `snake_case` field names, percentages as decimals
(0.117 not 11.7), monetary values in USD to 2 d.p., counts as integers, booleans as
true/false.

### summary_overview.json (84 records)

**Grain:** Year x Market x Category
**Consuming page:** Page 1 (Executive Overview)

| Field | Type | Description |
|-------|------|-------------|
| `year` | int | 2011–2014 |
| `market` | string | APAC / Africa / Canada / EMEA / EU / LATAM / US |
| `category` | string | Technology / Furniture / Office Supplies |
| `sales` | float | Total sales |
| `profit` | float | Total profit |
| `margin_pct` | float | profit / sales |
| `customer_count` | int | Distinct customers |

### summary_discount.json (80 records)

**Grain:** Year-Quarter x Discount Band
**Consuming page:** Page 2 (Discount Impact)

| Field | Type | Description |
|-------|------|-------------|
| `year_quarter` | string | e.g. `"2014-Q3"` |
| `discount_band` | string | None / 1–15% / 16–30% / 31–50% / 51%+ |
| `order_count` | int | Line items in this band |
| `profit` | float | Total profit |
| `margin_pct` | float | profit / sales |

### summary_country_regime.json (147 records)

**Grain:** Country
**Consuming page:** Page 3 (Country Discount Regimes)

| Field | Type | Description |
|-------|------|-------------|
| `country` | string | Country name |
| `discount_regime` | string | Zero discount / Fixed / Variable |
| `fixed_discount_rate` | float/null | Dominant rate for Fixed countries |
| `margin_pct` | float | Overall margin for this country |
| `profit` | float | Total profit |
| `annual_loss` | float | Annualised loss from fixed-discount policy |
| `market` | string | Market grouping |
| `region` | string | Region label |
| `regional_manager` | string/null | Null for EMEA |
| `order_count` | int | Total line items |
| `has_return_data` | boolean | True for US/EU/LATAM/APAC |

### summary_manager.json (48 records)

**Grain:** Manager x Year
**Consuming page:** Page 4 (Manager & Product Policy)

| Field | Type | Description |
|-------|------|-------------|
| `regional_manager` | string | Manager name (12 managers; EMEA excluded) |
| `year` | int | 2011–2014 |
| `sales` | float | Total sales under this manager |
| `profit` | float | Raw profit |
| `margin_pct` | float | Raw margin |
| `adjusted_profit` | float | Profit with fixed-country discounts removed |
| `adjusted_margin_pct` | float | Adjusted margin |
| `fixed_country_count` | int | Number of Fixed-regime countries under this manager |

### summary_product.json (17 records)

**Grain:** Sub-Category
**Consuming page:** Page 4 (Manager & Product Policy)

| Field | Type | Description |
|-------|------|-------------|
| `sub_category` | string | Product sub-category |
| `zero_discount_margin` | float | Margin when discount = 0 |
| `breakeven_discount` | float | Discount at which margin crosses zero |
| `recommended_ceiling` | float | Breakeven floored to nearest 0.05 |
| `avg_discounted_margin` | float | Average margin across all discounted lines |
| `order_count_heavy_discount` | int | Lines with discount >= 0.30 |
| `order_count_not_heavy_discount` | int | Lines with discount < 0.30 |

### whatif_discount_curve.json (71 records)

**Grain:** Discount rate (0.00 to 0.70 at 0.01 steps)
**Consuming page:** Page 5 (What-If Calculator)

| Field | Type | Description |
|-------|------|-------------|
| `discount_rate` | float | 0.00, 0.01, 0.02, … 0.70 |
| `expected_margin_pct` | float | PCHIP-interpolated expected margin at this rate, derived from variable-country data |

**Usage:** This curve provides the backbone for the what-if discount simulator.
Plot discount_rate on x-axis, expected_margin_pct on y-axis. The curve crosses
zero at approximately 0.28 (the aggregate breakeven point). Brief 2 defines
the interactive what-if logic that consumes this curve.

### whatif_product_breakeven.json (17 records)

**Grain:** Sub-Category
**Consuming page:** Page 5 (What-If Calculator)

| Field | Type | Description |
|-------|------|-------------|
| `sub_category` | string | Product sub-category |
| `breakeven_discount` | float | Discount rate where margin = 0 |
| `zero_discount_margin` | float | Margin at zero discount |
| `recommended_ceiling` | float | Safe max discount (breakeven floored to 0.05) |

### summary_customers.json (1,590 records)

**Grain:** Customer
**Consuming page:** Page 6 (Customer Analysis)

| Field | Type | Description |
|-------|------|-------------|
| `customer_key` | string | Customer ID |
| `customer_name` | string | Full name |
| `segment` | string | Consumer / Corporate / Home Office |
| `lifetime_sales` | float | Total sales |
| `lifetime_profit` | float | Total profit |
| `lifetime_margin` | float | lifetime_profit / lifetime_sales |
| `order_count` | int | Distinct orders |
| `is_copier_buyer` | boolean | Has any Copiers sub-category order |

### detail_orders.json (51,290 records)

**Grain:** Order line item (full fact + all dimensions joined)
**Consuming pages:** Appendices, Page 5 (line-level what-if calculations)

Contains all columns from `fact_orders` plus all dimension columns joined in.
This is the denormalised detail table for drill-downs and line-level recalculations.

**Note:** This file is ~59 MB. For web dashboards, consider lazy-loading or
server-side pagination. For client-side JS, streaming JSON parsers may be needed.

---

## Data Caveats

These must be surfaced in the dashboard. They are recorded here so they are not lost
between development stages.

| # | Caveat | Affects | Display guidance |
|---|--------|---------|-----------------|
| 1 | Returns data covers US, EU, LATAM, and APAC only. Africa, Canada, and EMEA show zero returns because no data exists — not because there are no returns. | Appendix G, any return-rate analysis | Use `has_return_data` flag. Show footnote: "Return data unavailable for Africa, Canada, and EMEA markets." |
| 2 | Return flags operate at order level. Every line item in a returned order is flagged `is_returned = true`, even if only one item was actually returned. | Appendix G, return counts | Footnote: "Returns are flagged at order level; individual line-item return status is unknown." |
| 3 | `discount_regime` is inferred from observed data patterns, not confirmed from source ERP/POS records. | Page 3 | Footnote: "Discount regimes are inferred from order data distributions and have not been validated against source system configuration." |
| 4 | EMEA has no assigned regional manager. The People sheet lists "Larry Hughes" for region "AMEA", but no "AMEA" region exists in Orders — the correct label is "EMEA". | Page 3, Page 4 | Callout box: "EMEA regional manager is unassigned due to a data-entry mismatch ('AMEA' vs 'EMEA') in the People master list." |
| 5 | Dataset covers 2011–2014 only. | All pages | Footer on every page: "Data period: 2011–2014." |
| 6 | Countries with fewer than 50 order lines have unreliable aggregates. | Pages 3, Appendix A | Flag affected rows in tables. 34 countries have < 50 lines. |

### Countries with fewer than 50 order lines

To identify these programmatically from `summary_country_regime.json`:
```javascript
data.filter(r => r.order_count < 50)
```

---

## Page-to-File Mapping

For downstream brief developers, here is which JSON files each dashboard page consumes:

| Dashboard Page | Primary JSON | Secondary JSON | Notes |
|----------------|-------------|----------------|-------|
| Page 1: Executive Overview | `summary_overview.json` | | Year x Market x Category aggregates |
| Page 2: Discount Impact | `summary_discount.json` | | Quarter x Discount Band |
| Page 3: Country Regimes | `summary_country_regime.json` | | Includes caveats 3, 4, 6 |
| Page 4: Manager & Product Policy | `summary_manager.json`, `summary_product.json` | | Manager adjusted vs raw; product breakeven |
| Page 5: What-If Calculator | `whatif_discount_curve.json`, `whatif_product_breakeven.json` | `detail_orders.json` | Curve for simulator; detail for line-level recalc |
| Page 6: Customer Analysis | `summary_customers.json` | | Lifetime value, copier buyers |
| Appendices | `detail_orders.json` | | Full denormalised detail |

---

## Extending the Pipeline

To add new calculated fields or aggregations:

1. **New fact columns** — Add to the `fact_orders` DataFrame construction (Section 8 of `prepare_data.py`).
2. **New dimension attributes** — Add to the relevant `dim_*` construction section.
3. **New JSON exports** — Add a new section after Section 9.9, following the pattern: aggregate from `detail` DataFrame, call `to_json_file()`.
4. **Changing regime classification** — Edit the loop in Section 4.1. The thresholds (90% for Zero/Fixed, 70% for Mostly fixed, 2-3 distinct values) are hardcoded inline.
5. **Changing breakeven method** — Edit Section 6.1. Currently uses PCHIP interpolation. To switch to linear interpolation, replace `PchipInterpolator` with `scipy.interpolate.interp1d`.

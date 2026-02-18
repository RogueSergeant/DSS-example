/** Shared data types matching JSON schemas in public/data/ */

export interface OverviewRow {
  year: number;
  market: string;
  category: string;
  sales: number;
  profit: number;
  customer_count: number;
  margin_pct: number;
}

export interface DiscountRow {
  year_quarter: string;
  discount_band: string;
  order_count: number;
  profit: number;
  margin_pct: number;
}

export interface CountryRegimeRow {
  country: string;
  discount_regime: string;
  fixed_discount_rate: number | null;
  margin_pct: number;
  profit: number;
  annual_loss: number;
  market: string;
  region: string;
  regional_manager: string | null;
  order_count: number;
  has_return_data: boolean;
}

export interface ManagerRow {
  regional_manager: string;
  year: number;
  sales: number;
  profit: number;
  margin_pct: number;
  adjusted_profit: number;
  adjusted_margin_pct: number;
  fixed_country_count: number;
}

export interface ProductRow {
  sub_category: string;
  zero_discount_margin: number;
  breakeven_discount: number;
  recommended_ceiling: number;
  avg_discounted_margin: number;
  order_count_heavy_discount: number;
  order_count_not_heavy_discount: number;
}

export interface CustomerRow {
  customer_key: string;
  customer_name: string;
  segment: string;
  lifetime_sales: number;
  lifetime_profit: number;
  lifetime_margin: number;
  order_count: number;
  is_copier_buyer: boolean;
}

export interface WhatIfCurvePoint {
  discount_rate: number;
  avg_margin: number;
  order_count: number;
  interpolated: boolean;
}

export interface WhatIfCurveData {
  curve: WhatIfCurvePoint[];
}

export interface BreakevenRow {
  sub_category: string;
  breakeven_discount: number;
  zero_discount_margin: number;
  recommended_ceiling: number;
}

export type YearFilter = 2011 | 2012 | 2013 | 2014 | 'All';

export type PageId =
  | 'overview'
  | 'two-problems'
  | 'fixed-policies'
  | 'products-people'
  | 'what-if'
  | 'copier-buyers'
  | 'appendix-a'
  | 'appendix-b'
  | 'appendix-c'
  | 'appendix-d'
  | 'appendix-e'
  | 'appendix-f'
  | 'appendix-g'
  | 'appendix-h';

/** Shared formatting utilities */

export function fmtDollar(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${v < 0 ? '-' : ''}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${v < 0 ? '-' : ''}$${(abs / 1_000).toFixed(0)}K`;
  return `${v < 0 ? '-' : ''}$${abs.toFixed(0)}`;
}

export function fmtPct(v: number, decimals = 1): string {
  return `${(v * 100).toFixed(decimals)}%`;
}

export function fmtPctPp(v: number): string {
  const pp = v * 100;
  return `${pp >= 0 ? '+' : ''}${pp.toFixed(1)}pp`;
}

export function fmtNumber(v: number): string {
  return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

const SYMBOL: Record<string, string> = { BDT: "৳", USD: "$" };

// Currency-aware money, with K/M compaction for big numbers.
export function money(amount: number, currency: string = "USD", compact = true): string {
  const sym = SYMBOL[currency] ?? "";
  const abs = Math.abs(amount);
  if (compact && abs >= 1_000_000) return `${sym}${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`;
  if (compact && abs >= 1000) return `${sym}${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`;
  return `${sym}${amount.toLocaleString()}`;
}

export function fmtBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const n = bytes / Math.pow(1024, i);
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

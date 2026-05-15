export function formatDate(ts: any): string {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString();
  } catch (_) {
    return String(ts);
  }
}

// Shared display formatting for HUD + game-over modal.

// Distance is tracked in meters (see PX_PER_METER); switch to km past 1000 m.
export function fmtDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

// Candle timestamp (ms epoch) -> compact date, e.g. "Mar 14, 2024". With
// `withTime` (intraday ranges) the year is dropped for the time-of-day instead:
// "Mar 14, 10:30 AM".
export function fmtDate(t: number, withTime = false): string {
  if (!t) return '—';
  const d = new Date(t);
  if (withTime) {
    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${date}, ${time}`;
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

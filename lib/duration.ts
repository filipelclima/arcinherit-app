export function formatDuration(seconds: bigint): string {
  const days = Number(seconds) / 86400
  if (days >= 365) return `${Math.round(days / 365)} year${Math.round(days / 365) > 1 ? 's' : ''}`
  if (days >= 30) return `${Math.round(days / 30)} month${Math.round(days / 30) > 1 ? 's' : ''}`
  return `${Math.round(days)} days`
}

export function formatResetTime(resetAt: Date | null, now = new Date()): string {
  if (!resetAt) return '';
  const diffMs = resetAt.getTime() - now.getTime();
  if (!Number.isFinite(diffMs)) return '';
  if (diffMs <= 0) return 'now';
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours > 0 ? `${days}d ${restHours}h` : `${days}d`;
}

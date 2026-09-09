export function formatBytes(bytes: number): string {
  if (!bytes) return '0 Bytes';
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 4);
  return `${parseFloat((bytes / 1024 ** unit).toFixed(2))} ${['Bytes', 'KB', 'MB', 'GB', 'TB'][unit]}`;
}

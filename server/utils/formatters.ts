export function formatMetaLine(recencyLabel?: string, publishedDate?: string, source?: string): string {
  const parts: string[] = [];
  if (recencyLabel && recencyLabel.trim()) parts.push(recencyLabel.trim());
  if (publishedDate && publishedDate.trim()) parts.push(publishedDate.trim());
  if (source && source.trim()) parts.push(source.trim());
  return parts.join(" · ");
}

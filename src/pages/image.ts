type ImageWidth = 480 | 800 | 1280;

export function imageUrl(source: string, width: ImageWidth): string {
  const match = /^\/images\/([a-z0-9-]+\.webp)$/.exec(source);
  if (!match) throw new Error(`Unsupported catalog image: ${source}`);
  return `/image/${width}/${match[1]}`;
}

const assets = import.meta.glob("../assets/botanicals/processed/*.webp", {
  eager: true,
  import: "default",
}) as Record<string, string>;

export const botanicalDataUrls: string[] = Object.keys(assets)
  .sort()
  .map((path) => assets[path]);

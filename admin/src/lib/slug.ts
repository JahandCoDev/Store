export function slugify(input: string): string {
  const normalized = (input ?? "").toLowerCase().trim();
  const collapsed = normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  return collapsed;
}

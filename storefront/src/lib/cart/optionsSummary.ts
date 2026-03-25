import type { CartItem } from "./types";

export function cartOptionLines(options: CartItem["options"] | undefined): string[] {
  if (!options) return [];

  const lines: string[] = [];

  if (options.size) lines.push(`Size: ${options.size}`);
  if (options.color) lines.push(`Color: ${options.color}`);

  if (options.backDesign?.enabled) {
    const num = options.backDesign.designNumber;
    lines.push(num ? `Back design: #${num}` : "Back design: Yes");
  }

  if (options.specialText?.enabled) {
    const placements: string[] = [];
    if (options.specialText.front) placements.push("Front");
    if (options.specialText.back) placements.push("Back");

    const placementLabel = placements.length ? placements.join(" + ") : "Selected";
    const text = (options.specialText.text ?? "").trim();

    if (text) {
      lines.push(`Special text (${placementLabel}): “${text.slice(0, 10)}”`);
    } else {
      lines.push(`Special text (${placementLabel})`);
    }
  }

  return lines;
}

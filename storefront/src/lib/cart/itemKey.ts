import type { CartItem } from "./types";

export function buildCartItemKey(productId: string, options: CartItem["options"] | undefined, variantId?: string | null): string {
  const size = options?.size ?? "";
  const color = options?.color ?? "";

  const backEnabled = options?.backDesign?.enabled ? "1" : "0";
  const backNum = options?.backDesign?.designNumber ?? "";

  const specialEnabled = options?.specialText?.enabled ? "1" : "0";
  const specialFront = options?.specialText?.front ? "1" : "0";
  const specialBack = options?.specialText?.back ? "1" : "0";
  const text = (options?.specialText?.text ?? "").slice(0, 10);

  const fx = options?.specialText?.frontPos?.x;
  const fy = options?.specialText?.frontPos?.y;
  const bx = options?.specialText?.backPos?.x;
  const by = options?.specialText?.backPos?.y;

  const pos = [
    fx == null ? "" : Math.round(fx),
    fy == null ? "" : Math.round(fy),
    bx == null ? "" : Math.round(bx),
    by == null ? "" : Math.round(by),
  ].join(",");

  return [
    productId,
    `vr:${variantId ?? ""}`,
    `sz:${size}`,
    `cl:${color}`,
    `bd:${backEnabled}:${backNum}`,
    `st:${specialEnabled}:${specialFront}${specialBack}:${text}`,
    `pos:${pos}`,
  ].join("|");
}

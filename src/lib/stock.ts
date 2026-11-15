import type { Product } from "@/lib/types";

export type StockInfo = {
  /** Can be added to the cart at all. */
  available: boolean;
  /** Tracked count, or null when the shop doesn't track this product's stock. */
  left: number | null;
  /** Show the "Only N left" label. */
  low: boolean;
  /** Most a shopper can put in the cart (100 when not tracked). */
  maxQuantity: number;
};

export const MAX_PER_ITEM = 100;

/** One place that decides how stock shows up in the shop. The database re-checks it when ordering. */
export function stockInfo(product: Pick<Product, "in_stock" | "stock_quantity">, lowThreshold: number): StockInfo {
  const left = typeof product.stock_quantity === "number" ? product.stock_quantity : null;
  const available = product.in_stock && (left === null || left > 0);
  return {
    available,
    left,
    low: available && left !== null && left <= lowThreshold,
    maxQuantity: !available ? 0 : left === null ? MAX_PER_ITEM : Math.min(left, MAX_PER_ITEM)
  };
}

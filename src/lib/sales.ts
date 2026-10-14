import { formatPrice } from "./format";
import type { SaleItem, SaleStatus } from "./types";

export const SALE_STATUS: Record<SaleStatus, string> = {
  available: "Zu verkaufen",
  reserved: "Reserviert",
  sold: "Verkauft",
};

/** Title, price and description, ready to paste into Kleinanzeigen & Co. */
export function adText(item: SaleItem) {
  return [item.name, formatPrice(item.price_cents), item.description].filter(Boolean).join("\n\n");
}

/** "89,90" for the price field */
export function priceInput(cents: number | null) {
  return cents != null ? (cents / 100).toFixed(2).replace(".", ",") : "";
}

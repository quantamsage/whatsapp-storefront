import { CartItem } from "@/lib/types";
import { formatMoney } from "@/lib/format";

type MessageInput = {
  name: string;
  phone: string;
  location?: string;
  items: CartItem[];
  total: number;
  currency: string;
  /** Short order reference when the order was saved. */
  reference?: string | null;
};

export function buildWhatsAppMessage({ name, phone, location, items, total, currency, reference }: MessageInput) {
  const money = (amount: number) => formatMoney(amount, currency);
  const lines = [
    reference ? `New order #${reference}` : "New order",
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Location: ${location?.trim() || "Will share on WhatsApp"}`,
    "Items:",
    ...items.map((item) => {
      const variant = item.variant ? ` (${item.variant})` : "";
      return `- ${item.name}${variant} x${item.quantity} = ${money(item.price * item.quantity)}`;
    }),
    `Total: ${money(total)}`
  ];
  return lines.join("\n");
}

export const whatsappLink = (number: string, text: string) =>
  `https://wa.me/${number}?text=${encodeURIComponent(text)}`;

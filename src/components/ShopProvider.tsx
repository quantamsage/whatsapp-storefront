"use client";

import { createContext, useContext } from "react";
import { formatMoney, formatOption } from "@/lib/format";

export type ShopSettings = {
  storeName: string;
  currency: string;
  whatsappNumber: string;
  optionLabel: string;
  optionUnit: string;
  lowStockThreshold: number;
};

const ShopContext = createContext<ShopSettings | null>(null);

/** Makes the shop settings (from the admin) available to client components. */
export function ShopProvider({ settings, children }: { settings: ShopSettings; children: React.ReactNode }) {
  return <ShopContext.Provider value={settings}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const settings = useContext(ShopContext);
  if (!settings) throw new Error("useShop must be used inside <ShopProvider>");
  return {
    ...settings,
    money: (amount: number) => formatMoney(amount, settings.currency),
    option: (size: number | string) => formatOption(size, settings.optionUnit)
  };
}

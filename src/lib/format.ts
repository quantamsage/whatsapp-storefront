/** Format a price in the shop's currency, e.g. "KES 1,500" or "$12.50". */
export const formatMoney = (amount: number, currency: string) => {
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2
  }).format(amount);
};

/** "500" + "g" -> "500g"; "Large" + "" -> "Large". */
export const formatOption = (size: number | string, unit: string) => `${size}${unit}`;

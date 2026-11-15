export type SiteContent = {
  store_name: string;
  logo_url: string;
  hero_badge: string;
  hero_title: string;
  hero_subtitle: string;
  cta_primary: string;
  cta_secondary: string;
  why_title: string;
  why_bullets: string[];
  panel_images: string[];
  brand_primary: string;
  brand_primary_strong: string;
  brand_primary_soft: string;
  brand_accent: string;
  brand_accent_soft: string;
  /** ISO 4217 code, e.g. KES, USD, UGX. Used for every price in the shop. */
  currency: string;
  /** Digits only, with country code, e.g. 254712345678. Orders are sent here. */
  whatsapp_number: string;
  /** One line shown in the footer and in link previews. */
  tagline: string;
  /** What product options are called ("Size", "Bag size", "Decant") and their unit ("ml", "g", or nothing). */
  option_label: string;
  option_unit: string;
  /** Show "Only N left" when a tracked stock count is at or below this. */
  low_stock_threshold: number;
};

export const CURRENCIES = ["KES", "UGX", "TZS", "RWF", "NGN", "GHS", "ZAR", "USD", "EUR", "GBP"] as const;

const DEFAULT_PANEL_IMAGES: string[] = [];

export const defaultSiteContent: SiteContent = {
  store_name: "My Shop",
  logo_url: "/logo.svg",
  hero_badge: "Order on WhatsApp",
  hero_title: "Welcome to the shop",
  hero_subtitle:
    "Browse the catalogue, add what you like to your cart, and send the order to us on WhatsApp in one tap.",
  cta_primary: "Shop now",
  cta_secondary: "Contact us",
  why_title: "Why shop here?",
  why_bullets: [
    "Clear prices and up-to-date stock.",
    "Order in seconds over WhatsApp.",
    "Friendly, quick replies."
  ],
  panel_images: DEFAULT_PANEL_IMAGES,
  brand_primary: "#1f6b4f",
  brand_primary_strong: "#16503b",
  brand_primary_soft: "#dcefe6",
  brand_accent: "#c7a14a",
  brand_accent_soft: "#f4ead2",
  currency: "KES",
  whatsapp_number: "",
  tagline: "Order fast via WhatsApp.",
  option_label: "Size",
  option_unit: "",
  low_stock_threshold: 3
};

const cleanString = (value: unknown, fallback: string) => {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const cleanStringArray = (
  value: unknown,
  fallback: string[],
  minItems?: number
) => {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const cleaned = value
    .filter((item) => typeof item === "string")
    .map((item) => (item as string).trim())
    .filter(Boolean);
  if (cleaned.length === 0) {
    return fallback;
  }
  if (minItems && cleaned.length < minItems) {
    const merged = [...cleaned];
    for (const item of fallback) {
      if (merged.length >= minItems) {
        break;
      }
      if (!merged.includes(item)) {
        merged.push(item);
      }
    }
    return merged.slice(0, minItems);
  }
  return cleaned;
};

const cleanCurrency = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const code = value.trim().toUpperCase();
  try {
    new Intl.NumberFormat("en", { style: "currency", currency: code });
    return /^[A-Z]{3}$/.test(code) ? code : fallback;
  } catch {
    return fallback;
  }
};

/** Keep digits only; wa.me links need the full international number without "+". */
export const cleanPhoneDigits = (value: unknown) =>
  typeof value === "string" ? value.replace(/\D/g, "").slice(0, 15) : "";

const cleanInt = (value: unknown, fallback: number, min: number, max: number) => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
};

const isHexColor = (value: string) => /^#[0-9A-Fa-f]{6}$/.test(value);

const cleanColor = (value: unknown, fallback: string) => {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  return isHexColor(trimmed) ? trimmed : fallback;
};

export const normalizeSiteContent = (
  value?: Partial<SiteContent> | null
): SiteContent => {
  return {
    store_name: cleanString(value?.store_name, defaultSiteContent.store_name),
    logo_url: cleanString(value?.logo_url, defaultSiteContent.logo_url),
    hero_badge: cleanString(value?.hero_badge, defaultSiteContent.hero_badge),
    hero_title: cleanString(value?.hero_title, defaultSiteContent.hero_title),
    hero_subtitle: cleanString(
      value?.hero_subtitle,
      defaultSiteContent.hero_subtitle
    ),
    cta_primary: cleanString(
      value?.cta_primary,
      defaultSiteContent.cta_primary
    ),
    cta_secondary: cleanString(
      value?.cta_secondary,
      defaultSiteContent.cta_secondary
    ),
    why_title: cleanString(value?.why_title, defaultSiteContent.why_title),
    why_bullets: cleanStringArray(
      value?.why_bullets,
      defaultSiteContent.why_bullets,
      3
    ),
    panel_images: cleanStringArray(
      value?.panel_images,
      defaultSiteContent.panel_images,
      6
    ).slice(0, 6),
    brand_primary: cleanColor(
      value?.brand_primary,
      defaultSiteContent.brand_primary
    ),
    brand_primary_strong: cleanColor(
      value?.brand_primary_strong,
      defaultSiteContent.brand_primary_strong
    ),
    brand_primary_soft: cleanColor(
      value?.brand_primary_soft,
      defaultSiteContent.brand_primary_soft
    ),
    brand_accent: cleanColor(value?.brand_accent, defaultSiteContent.brand_accent),
    brand_accent_soft: cleanColor(
      value?.brand_accent_soft,
      defaultSiteContent.brand_accent_soft
    ),
    currency: cleanCurrency(value?.currency, defaultSiteContent.currency),
    // Saved in the admin; the env var is a fallback for setups from before this setting existed.
    whatsapp_number:
      cleanPhoneDigits(value?.whatsapp_number) ||
      cleanPhoneDigits(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER),
    tagline: cleanString(value?.tagline, defaultSiteContent.tagline),
    option_label: cleanString(value?.option_label, defaultSiteContent.option_label).slice(0, 30),
    option_unit: typeof value?.option_unit === "string" ? value.option_unit.trim().slice(0, 10) : "",
    low_stock_threshold: cleanInt(value?.low_stock_threshold, defaultSiteContent.low_stock_threshold, 0, 1000)
  };
};

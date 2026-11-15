export type Category = {
  id: string;
  name: string;
  created_at?: string;
};

export type DecantSize = {
  size_ml: number;
  price?: number;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  description: string | null;
  image_urls: string[] | null;
  category_id: string | null;
  is_decant?: boolean | null;
  decant_sizes?: DecantSize[] | null;
  in_stock: boolean;
  /** null = stock not tracked for this product. */
  stock_quantity?: number | null;
  created_at?: string;
};

export type CartItem = {
  key: string;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string | null;
  /** Display label for the chosen option, e.g. "500g". */
  variant?: string | null;
  /** The chosen option's size value, sent to the server so it can look up the price. */
  size?: number | null;
  /** Stock cap when the item was added; the server checks again at checkout. */
  max_quantity?: number | null;
};

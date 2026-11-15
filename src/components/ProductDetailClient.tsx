"use client";

import Image from "next/image";
import { useState } from "react";
import { Product, DecantSize } from "@/lib/types";
import { useCartStore } from "@/lib/cartStore";
import { stockInfo } from "@/lib/stock";
import { useShop } from "@/components/ShopProvider";
import QuantityStepper from "@/components/QuantityStepper";

export default function ProductDetailClient({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem);
  const inCart = useCartStore((state) =>
    state.items.filter((i) => i.product_id === product.id).reduce((n, i) => n + i.quantity, 0)
  );
  const shop = useShop();
  const stock = stockInfo(product, shop.lowStockThreshold);
  // Stock is shared by all options of a product, so count what's already in the cart.
  const canAdd = Math.max(0, stock.maxQuantity - inCart);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const decantSizes = Array.isArray(product.decant_sizes)
    ? (product.decant_sizes as DecantSize[])
    : [];

  const [selectedSize, setSelectedSize] = useState<DecantSize | null>(
    decantSizes[0] ?? null
  );

  const allImages = product.image_urls ?? [];
  const [activeImage, setActiveImage] = useState(allImages[0] || "");

  const price = selectedSize?.price ?? product.price;
  const variantLabel = selectedSize ? shop.option(selectedSize.size_ml) : null;

  const handleAdd = () => {
    if (canAdd < 1) return;
    addItem({
      product_id: product.id,
      name: product.name,
      price,
      quantity: Math.min(quantity, canAdd),
      image_url: activeImage,
      variant: variantLabel,
      size: selectedSize?.size_ml ?? null,
      max_quantity: stock.maxQuantity
    });
    setQuantity(1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* Image gallery */}
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-2xl bg-sand">
          {activeImage ? (
            <Image
              src={activeImage}
              alt={product.name}
              width={600}
              height={600}
              className="h-96 w-full object-cover"
            />
          ) : (
            <div className="flex h-96 w-full items-center justify-center text-sm text-slate-400">
              No image
            </div>
          )}
          {!stock.available && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60">
              <span className="badge-oos text-sm px-4 py-1.5">Sold out</span>
            </div>
          )}
        </div>
        {allImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {allImages.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => setActiveImage(url)}
                className={`flex-shrink-0 overflow-hidden rounded-xl transition ${
                  activeImage === url
                    ? "ring-2 ring-offset-1"
                    : "opacity-60 hover:opacity-90"
                }`}
                style={activeImage === url ? { outline: "2px solid var(--brand-primary)", outlineOffset: "2px" } : {}}
              >
                <Image
                  src={url}
                  alt={`${product.name} view ${i + 1}`}
                  width={80}
                  height={80}
                  className="h-16 w-16 object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="space-y-5">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {!stock.available ? (
              <span className="badge-oos">Sold out</span>
            ) : stock.low ? (
              <span className="badge-low">Only {stock.left} left</span>
            ) : (
              <span className="badge-in">In stock</span>
            )}
          </div>
          <h1 className="font-display text-3xl leading-tight">{product.name}</h1>
          <p className="mt-1.5 text-xl font-semibold text-brand">{shop.money(price)}</p>
        </div>

        {product.description && (
          <p className="text-sm leading-relaxed text-slate-600">{product.description}</p>
        )}

        {decantSizes.length > 0 && (
          <div className="space-y-2">
            <p className="label" id="option-label">{shop.optionLabel}</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="option-label">
              {decantSizes.map((size) => (
                <button
                  key={size.size_ml}
                  type="button"
                  role="radio"
                  aria-checked={selectedSize?.size_ml === size.size_ml}
                  onClick={() => setSelectedSize(size)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                    selectedSize?.size_ml === size.size_ml
                      ? "border-transparent text-white"
                      : "border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                  style={
                    selectedSize?.size_ml === size.size_ml
                      ? { background: "var(--brand-primary)", borderColor: "var(--brand-primary)" }
                      : {}
                  }
                >
                  {shop.option(size.size_ml)} — {shop.money(size.price ?? 0)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <QuantityStepper
            quantity={quantity}
            onIncrement={() => setQuantity((q) => Math.min(q + 1, Math.max(1, canAdd)))}
            onDecrement={() => setQuantity((q) => Math.max(1, q - 1))}
          />
          <button
            className={`btn-primary flex flex-1 items-center justify-center gap-2 py-2.5 transition disabled:cursor-not-allowed disabled:opacity-50 ${
              added ? "opacity-90" : ""
            }`}
            onClick={handleAdd}
            disabled={canAdd < 1}
          >
            {added ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Added!
              </>
            ) : (
              !stock.available ? "Sold out" : canAdd < 1 ? "All in your cart" : "Add to cart"
            )}
          </button>
        </div>
        {stock.available && stock.left !== null && inCart > 0 && (
          <p className="text-xs text-slate-500">
            {inCart} already in your cart · {stock.left} in stock
          </p>
        )}
      </div>
    </div>
  );
}


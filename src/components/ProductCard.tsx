"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Product } from "@/lib/types";
import { useCartStore } from "@/lib/cartStore";
import { stockInfo } from "@/lib/stock";
import { useShop } from "@/components/ShopProvider";

function Toast({ show }: { show: boolean }) {
  return (
    <div className={`toast${show ? " show" : ""}`} aria-live="polite">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      Added to cart
    </div>
  );
}

export default function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem);
  const shop = useShop();
  const stock = stockInfo(product, shop.lowStockThreshold);
  const hasOptions = Boolean(product.is_decant && product.decant_sizes?.length);
  const imageUrl = product.image_urls?.[0] || "";
  const [showToast, setShowToast] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAdd = () => {
    if (!stock.available) return;
    addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image_url: imageUrl,
      max_quantity: stock.maxQuantity
    });
    setShowToast(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowToast(false), 2000);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <>
      <Toast show={showToast} />
      <div className="card group flex flex-col gap-0 overflow-hidden p-0">
        <Link href={`/product/${product.id}`} className="block">
          <div className="relative overflow-hidden bg-sand">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={product.name}
                width={400}
                height={400}
                className="h-52 w-full object-cover transition duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-52 w-full items-center justify-center bg-sand text-sm text-slate-400">
                No image
              </div>
            )}
            {/* Stock badge */}
            <div className="absolute left-2 top-2">
              {!stock.available ? (
                <span className="badge-oos">Sold out</span>
              ) : stock.low ? (
                <span className="badge-low">Only {stock.left} left</span>
              ) : (
                <span className="badge-in">In stock</span>
              )}
            </div>
            {/* Options tag */}
            {hasOptions && (
              <div className="absolute right-2 top-2">
                <span className="inline-flex items-center rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-700 shadow-soft">
                  {product.decant_sizes!.length} {shop.optionLabel.toLowerCase()}s
                </span>
              </div>
            )}
          </div>
          <div className="px-4 pb-2 pt-3">
            <h3 className="font-medium leading-snug text-slate-900">{product.name}</h3>
            <p className="mt-0.5 text-sm font-semibold text-brand">{hasOptions ? "From " : ""}{shop.money(product.price)}</p>
            {product.description && (
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">{product.description}</p>
            )}
          </div>
        </Link>
        <div className="mt-auto px-4 pb-4">
          {hasOptions && stock.available ? (
            <Link href={`/product/${product.id}`} className="btn-outline block w-full py-2 text-center text-sm">
              Choose {shop.optionLabel.toLowerCase()}
            </Link>
          ) : (
            <button
              className="btn-primary w-full py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleAdd}
              disabled={!stock.available}
            >
              {stock.available ? "Add to cart" : "Sold out"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

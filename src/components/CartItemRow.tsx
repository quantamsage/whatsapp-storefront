"use client";

import Image from "next/image";
import { CartItem } from "@/lib/types";
import QuantityStepper from "@/components/QuantityStepper";
import { useCartStore } from "@/lib/cartStore";
import { useShop } from "@/components/ShopProvider";

export default function CartItemRow({ item }: { item: CartItem }) {
  const increment = useCartStore((state) => state.increment);
  const decrement = useCartStore((state) => state.decrement);
  const removeItem = useCartStore((state) => state.removeItem);
  const { money } = useShop();
  const atMax = item.max_quantity != null && item.quantity >= item.max_quantity;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            width={80}
            height={80}
            className="h-20 w-20 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-sand text-xs text-slate-500">
            No image
          </div>
        )}
        <div>
          <p className="font-medium">{item.name}</p>
          {item.variant && (
            <p className="text-xs text-slate-500">{item.variant}</p>
          )}
          <p className="text-sm text-slate-600">
            {money(item.price)} each
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <QuantityStepper
          quantity={item.quantity}
          onIncrement={() => increment(item.key)}
          incrementDisabled={atMax}
          onDecrement={() => decrement(item.key)}
        />
        <p className="min-w-[6rem] text-right text-sm font-semibold">
          {money(item.price * item.quantity)}
        </p>
        <button
          className="btn-danger"
          onClick={() => removeItem(item.key)}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

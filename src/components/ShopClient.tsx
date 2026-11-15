"use client";

import { useMemo, useState } from "react";
import { Category, Product } from "@/lib/types";
import ProductCard from "@/components/ProductCard";
import { useShop } from "@/components/ShopProvider";
import { stockInfo } from "@/lib/stock";

const SORTS = {
  featured: "Featured",
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  name: "Name A–Z"
} as const;
type SortKey = keyof typeof SORTS;

export default function ShopClient({
  categories,
  products
}: {
  categories: Category[];
  products: Product[];
}) {
  const [selected, setSelected] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("featured");
  const [inStockOnly, setInStockOnly] = useState(false);
  const shop = useShop();

  const filtered = useMemo(() => {
    let list = selected === "all" ? products : products.filter((p) => p.category_id === selected);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q)
      );
    }
    if (inStockOnly) {
      list = list.filter((p) => stockInfo(p, shop.lowStockThreshold).available);
    }
    const sorted = [...list];
    const time = (p: Product) => (p.created_at ? Date.parse(p.created_at) : 0);
    switch (sort) {
      case "newest": sorted.sort((a, b) => time(b) - time(a)); break;
      case "price-asc": sorted.sort((a, b) => a.price - b.price); break;
      case "price-desc": sorted.sort((a, b) => b.price - a.price); break;
      case "name": sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
      default: // featured: available first, then newest (the server's order)
        sorted.sort((a, b) =>
          Number(stockInfo(b, shop.lowStockThreshold).available) - Number(stockInfo(a, shop.lowStockThreshold).available));
    }
    return sorted;
  }, [products, selected, search, sort, inStockOnly, shop.lowStockThreshold]);

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="space-y-1">
        <h1 className="font-display text-3xl">Shop</h1>
        <p className="text-sm text-slate-500">
          {products.length} product{products.length !== 1 ? "s" : ""} in the shop
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="search"
          className="input pl-9 pr-4"
          placeholder="Search products…"
          aria-label="Search products"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Sort and stock filter */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Sort
          <select className="input w-auto py-1.5" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            {Object.entries(SORTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)} />
          In stock only
        </label>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        <button
          className={`pill transition ${selected === "all" ? "border-transparent text-white" : "hover:border-slate-300"}`}
          style={selected === "all" ? { background: "var(--brand-primary)", borderColor: "var(--brand-primary)" } : {}}
          onClick={() => setSelected("all")}
        >
          All ({products.length})
        </button>
        {categories.map((category) => {
          const count = products.filter((p) => p.category_id === category.id).length;
          return (
            <button
              key={category.id}
              className={`pill transition ${selected === category.id ? "border-transparent text-white" : "hover:border-slate-300"}`}
              style={selected === category.id ? { background: "var(--brand-primary)", borderColor: "var(--brand-primary)" } : {}}
              onClick={() => setSelected(category.id)}
            >
              {category.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="card space-y-2 text-center">
          <p className="text-slate-600">No products found{search ? ` for "${search}"` : inStockOnly ? " in stock here" : " in this category"}.</p>
          {search && (
            <button className="btn-ghost text-sm" onClick={() => setSearch("")}>Clear search</button>
          )}
        </div>
      ) : (
        <>
          {search && (
            <p className="text-sm text-slate-500">{filtered.length} result{filtered.length !== 1 ? "s" : ""} for &quot;{search}&quot;</p>
          )}
          <div className="product-grid">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

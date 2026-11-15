"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Category, Product, DecantSize } from "@/lib/types";
import { useShop } from "@/components/ShopProvider";

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "product-images";

const initialForm = {
  name: "",
  price: "",
  description: "",
  category_id: "",
  in_stock: true,
  stock_quantity: "",
  is_decant: false,
  options: [] as OptionRow[],
  image_url_input: ""
};

type OptionRow = { size: string; price: string };

type ImageSlot = {
  src: string;
  file?: File;
  remote?: string;
};

/** Turn the option rows into the stored [{size_ml, price}] list, or explain what's wrong. */
const parseOptions = (rows: OptionRow[]): { sizes: DecantSize[] | null; error: string | null } => {
  const filled = rows.filter((r) => r.size.trim() || r.price.trim());
  if (filled.length === 0) return { sizes: null, error: "Add at least one option, or untick \"Has options\"." };
  const sizes: DecantSize[] = [];
  for (const r of filled) {
    const size = Number(r.size);
    const price = Number(r.price);
    if (!Number.isFinite(size) || size <= 0) return { sizes: null, error: "Each option needs a size above 0." };
    if (!Number.isFinite(price) || price <= 0) return { sizes: null, error: "Each option needs a price above 0." };
    if (sizes.some((s) => s.size_ml === size)) return { sizes: null, error: `The size ${size} is listed twice.` };
    sizes.push({ size_ml: size, price });
  }
  return { sizes: sizes.sort((a, b) => a.size_ml - b.size_ml), error: null };
};

function ImagePreviewCard({ slot, onRemove }: { slot: ImageSlot; onRemove: () => void }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-sand">
      <div className="relative aspect-square w-full">
        <Image src={slot.src} alt="Product image" fill sizes="160px" className="object-cover" />
      </div>
      <div className="absolute left-1.5 top-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white">
          {slot.file ? "Device" : "URL"}
        </span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition group-hover:opacity-100 hover:bg-red-600"
        title="Remove"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}

function SuccessToast({ message, show }: { message: string; show: boolean }) {
  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-soft"
      style={{
        background: "var(--brand-primary)",
        transform: `translateX(-50%) translateY(${show ? "0" : "80px"})`,
        opacity: show ? 1 : 0,
        transition: "transform 350ms cubic-bezier(0.22,1,0.36,1), opacity 350ms ease",
        pointerEvents: "none",
        whiteSpace: "nowrap"
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      {message}
    </div>
  );
}

export default function AdminProductForm({
  categories,
  editingProduct,
  onSaved,
  onCancelEdit
}: {
  categories: Category[];
  editingProduct: Product | null;
  onSaved: () => void;
  onCancelEdit: () => void;
}) {
  const [form, setForm] = useState(initialForm);
  const [slots, setSlots] = useState<ImageSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shop = useShop();
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (editingProduct) {
      setForm({
        name: editingProduct.name,
        price: String(editingProduct.price),
        description: editingProduct.description || "",
        category_id: editingProduct.category_id || "",
        in_stock: editingProduct.in_stock,
        stock_quantity: editingProduct.stock_quantity == null ? "" : String(editingProduct.stock_quantity),
        is_decant: Boolean(editingProduct.is_decant),
        options: (editingProduct.decant_sizes ?? []).map((o) => ({ size: String(o.size_ml), price: String(o.price ?? "") })),
        image_url_input: ""
      });
      setSlots((editingProduct.image_urls ?? []).map((url) => ({ src: url, remote: url })));
      setError(null);
    } else {
      setForm(initialForm);
      setSlots([]);
      setError(null);
    }
  }, [editingProduct]);

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setShowSuccess(true);
    if (successTimer.current) clearTimeout(successTimer.current);
    successTimer.current = setTimeout(() => setShowSuccess(false), 3500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newSlots: ImageSlot[] = Array.from(files).map((file) => ({
      src: URL.createObjectURL(file),
      file
    }));
    setSlots((prev) => [...prev, ...newSlots]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddUrl = () => {
    const url = form.image_url_input.trim();
    if (!url) return;
    if (!url.startsWith("http")) {
      setError("Please enter a valid URL starting with http.");
      return;
    }
    setSlots((prev) => [...prev, { src: url, remote: url }]);
    setForm((prev) => ({ ...prev, image_url_input: "" }));
    setError(null);
  };

  const removeSlot = (index: number) => {
    setSlots((prev) => {
      const next = [...prev];
      if (next[index].file) URL.revokeObjectURL(next[index].src);
      next.splice(index, 1);
      return next;
    });
  };

  const resolveUrls = async (): Promise<string[]> => {
    const supabase = supabaseBrowser();
    if (!supabase) throw new Error("Supabase env vars missing.");
    const resolved: string[] = [];
    for (const slot of slots) {
      if (slot.remote) {
        resolved.push(slot.remote);
      } else if (slot.file) {
        const path = `products/${crypto.randomUUID()}-${slot.file.name.replace(/\s+/g, "-")}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, slot.file);
        if (upErr) throw upErr;
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        if (!data?.publicUrl) throw new Error("No public URL for uploaded image.");
        resolved.push(data.publicUrl);
      }
    }
    return resolved;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Product name is required.");
      return;
    }
    let decantSizes: DecantSize[] | null = null;
    let price = Number(form.price);
    if (form.is_decant) {
      const parsed = parseOptions(form.options);
      if (parsed.error) {
        setError(parsed.error);
        return;
      }
      decantSizes = parsed.sizes;
      // The listed price is the cheapest option, shown as "From ..." in the shop.
      price = Math.min(...decantSizes!.map((o) => o.price ?? Infinity));
    } else if (!form.price || !Number.isFinite(price) || price <= 0) {
      setError("Price must be a number above 0.");
      return;
    }
    let stockQuantity: number | null = null;
    if (form.stock_quantity.trim() !== "") {
      stockQuantity = Number(form.stock_quantity);
      if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
        setError("Stock must be a whole number, 0 or more. Leave it empty if you don't track stock.");
        return;
      }
    }

    setLoading(true);

    let imageUrls: string[] = [];
    try {
      imageUrls = await resolveUrls();
    } catch (upErr: unknown) {
      setError(`Image upload failed: ${upErr instanceof Error ? upErr.message : String(upErr)}`);
      setLoading(false);
      return;
    }

    const payload = {
      name: form.name.trim(),
      price,
      description: form.description.trim() || null,
      category_id: form.category_id || null,
      in_stock: form.in_stock,
      stock_quantity: stockQuantity,
      is_decant: form.is_decant,
      decant_sizes: decantSizes,
      image_urls: imageUrls
    };

    const supabase = supabaseBrowser();
    if (!supabase) {
      setError("Supabase env vars missing. Check .env.local.");
      setLoading(false);
      return;
    }

    if (editingProduct) {
      const { error: updateError } = await supabase
        .from("products").update(payload).eq("id", editingProduct.id);
      if (updateError) { setError(updateError.message); setLoading(false); return; }
      showToast(`"${form.name.trim()}" updated successfully!`);
    } else {
      const { error: insertError } = await supabase.from("products").insert(payload);
      if (insertError) { setError(insertError.message); setLoading(false); return; }
      showToast(`"${form.name.trim()}" added to your shop!`);
      setForm(initialForm);
      setSlots([]);
    }

    setLoading(false);
    onSaved();
  };

  return (
    <>
      <SuccessToast message={successMsg} show={showSuccess} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-medium">
            {editingProduct ? `Editing: ${editingProduct.name}` : "Add new product"}
          </h2>
          {editingProduct && (
            <button type="button" className="btn-ghost text-xs" onClick={onCancelEdit}>
              ✕ Cancel
            </button>
          )}
        </div>

        {/* Core fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="label">Product name <span className="text-red-500">*</span></label>
            <input className="input" placeholder="e.g. House Blend" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <label className="label" htmlFor="product-price">Price ({shop.currency}) {!form.is_decant && <span className="text-red-500">*</span>}</label>
            <input id="product-price" className="input" type="number" min="0" step="0.01" placeholder="e.g. 1500"
              value={form.is_decant ? "" : form.price} disabled={form.is_decant}
              onChange={(e) => setForm({ ...form, price: e.target.value })} />
            {form.is_decant && <p className="text-xs text-slate-500">Set per option below. The shop shows the lowest as &ldquo;From&rdquo;.</p>}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="label">Description</label>
            <textarea className="input min-h-[90px]" placeholder="What it is, what it's made of, who it's for…"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="label">Category</label>
            <select className="input" value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Uncategorized</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="label" htmlFor="product-stock">Stock <span className="font-normal text-slate-400">(leave empty to not track)</span></label>
            <input id="product-stock" className="input" type="number" min="0" step="1" placeholder="e.g. 12"
              value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} />
            <p className="text-xs text-slate-500">Goes down automatically with each saved order. At 0 it shows as sold out.</p>
          </div>
          <div className="flex flex-wrap items-center gap-5 sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input type="checkbox" className="h-4 w-4 accent-emerald-600"
                checked={form.in_stock} onChange={(e) => setForm({ ...form, in_stock: e.target.checked })} />
              Available to order
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input type="checkbox" className="h-4 w-4 accent-emerald-600"
                checked={form.is_decant}
                onChange={(e) => setForm({
                  ...form,
                  is_decant: e.target.checked,
                  options: e.target.checked && form.options.length === 0 ? [{ size: "", price: form.price }] : form.options
                })} />
              Has options ({shop.optionLabel.toLowerCase()})
            </label>
          </div>
        </div>

        {/* Options, e.g. sizes with their own price */}
        {form.is_decant && (
          <div className="space-y-3 rounded-xl border border-dashed border-slate-200 p-4">
            <p className="label">{shop.optionLabel} options</p>
            {form.options.map((row, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <input className="input w-32" type="number" min="0" step="any" aria-label={`Option ${i + 1} size`}
                  placeholder={`Size${shop.optionUnit ? ` (${shop.optionUnit})` : ""}`} value={row.size}
                  onChange={(e) => setForm({ ...form, options: form.options.map((r, j) => j === i ? { ...r, size: e.target.value } : r) })} />
                <input className="input w-36" type="number" min="0" step="0.01" aria-label={`Option ${i + 1} price`}
                  placeholder={`Price (${shop.currency})`} value={row.price}
                  onChange={(e) => setForm({ ...form, options: form.options.map((r, j) => j === i ? { ...r, price: e.target.value } : r) })} />
                <button type="button" className="btn-ghost text-xs"
                  onClick={() => setForm({ ...form, options: form.options.filter((_, j) => j !== i) })}>
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="btn-outline text-sm"
              onClick={() => setForm({ ...form, options: [...form.options, { size: "", price: "" }] })}>
              + Add option
            </button>
            <p className="text-xs text-slate-500">
              Shown to shoppers as {shop.option(250)}, {shop.option(500)}… Stock (above) is shared by all options.
              Change the wording under Content → Shop settings.
            </p>
          </div>
        )}

        {/* Images section */}
        <div className="space-y-3">
          <label className="label">Product images</label>

          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="btn-outline flex items-center gap-2 text-sm">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            Choose from device
          </button>

          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Or paste an image URL — https://..."
              value={form.image_url_input}
              onChange={(e) => setForm({ ...form, image_url_input: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddUrl(); } }}
            />
            <button type="button" className="btn-primary shrink-0 px-4 text-sm"
              onClick={handleAddUrl} disabled={!form.image_url_input.trim()}>
              Add URL
            </button>
          </div>

          {slots.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {slots.map((slot, i) => (
                <ImagePreviewCard key={i} slot={slot} onRemove={() => removeSlot(i)} />
              ))}
            </div>
          ) : (
            <div
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-8 text-slate-400 transition hover:border-slate-300"
              onClick={() => fileInputRef.current?.click()}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <p className="text-sm">Click to add images, or paste a URL above</p>
            </div>
          )}

          <p className="text-xs text-slate-400">
            Device images upload to Supabase Storage on Save. URL images are saved directly.
          </p>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <div className="flex flex-wrap gap-3 pt-1">
          <button className="btn-primary px-6 py-2.5" type="submit" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                Saving…
              </span>
            ) : editingProduct ? "Update product" : "Add product"}
          </button>
          {editingProduct && (
            <button type="button" className="btn-outline" onClick={onCancelEdit}>Cancel</button>
          )}
        </div>
      </form>
    </>
  );
}

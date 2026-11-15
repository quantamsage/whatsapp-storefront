export default function AdminGuidePage() {
  return (
    <div className="card space-y-6">
      <h1 className="font-display text-2xl">Admin guide</h1>

      <section className="space-y-2">
        <h2 className="font-medium">First-time setup</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>Open <strong>Content</strong> and fill in <strong>Shop settings</strong>: shop name, currency, WhatsApp number (with country code, e.g. 254712345678) and what your product options are called (&ldquo;Size&rdquo;, &ldquo;Bag size&rdquo;…).</li>
          <li>Pick your brand colours and upload a logo on the same page.</li>
          <li>Create your <strong>Categories</strong>, then add <strong>Products</strong>.</li>
        </ol>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Adding a product</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>Enter a name, price, category and short description, and add 1–3 photos.</li>
          <li>To track stock, type how many you have. Each saved order lowers it, and at 0 the product shows as sold out. Leave it empty if you don&apos;t want to track it.</li>
          <li>If it comes in different sizes with different prices, tick <strong>Has options</strong> and add one row per size.</li>
          <li>Save. The shop updates straight away.</li>
        </ol>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Orders</h2>
        <p className="text-sm text-slate-700">
          Shoppers send their order to you on WhatsApp. Each one is also saved under <strong>Orders</strong> with a
          reference number that matches the WhatsApp message, so you can track it from pending to delivered.
        </p>
      </section>
    </div>
  );
}

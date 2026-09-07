// niners-buy — Cloudflare Worker
// Turns a plain link on 9nersstudio.com into a HitPay checkout with the product already in the cart.
//   GET /rain-off            -> 1 can
//   GET /rain-off?qty=2      -> 2 cans (1..10)
// Flow: mint a cart id, create the cart on HitPay's storefront API with the item, 302 the customer
// to https://hitpay.shop/9ners/checkout/<cart>. If anything fails, fall back to the normal product URL.
// No secrets: the two headers HitPay's own storefront sends are the store domain and the public business id.

const STORE = 'https://hitpay.shop/9ners';
const API = 'https://api-shop.hit-pay.com/v1/carts/';
const BUSINESS_ID = 'a29a5c63-2b9d-4358-b3c7-26bb5e821846';
const SITE = 'https://9nersstudio.com';

const PRODUCTS = {
  'rain-off': {
    id: 'a2b08c63-e189-4f9f-afbc-3bd6036a7e5c',
    name: 'Rain Off | Hydrophobic Glass Coating Spray (100g)',
    fallback: STORE + '/product/rain-off-hydrophobic-glass-coating-spray-100g?express_checkout=true',
  },
};

const ULID_CHARS = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function ulid() {
  let t = Date.now(), time = '';
  for (let i = 0; i < 10; i++) { time = ULID_CHARS[t % 32] + time; t = Math.floor(t / 32); }
  const rnd = crypto.getRandomValues(new Uint8Array(16));
  let rand = '';
  for (let i = 0; i < 16; i++) rand += ULID_CHARS[rnd[i] % 32];
  return time + rand;
}

function redirect(url) {
  return new Response(null, { status: 302, headers: { Location: url, 'Cache-Control': 'no-store' } });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const slug = url.pathname.replace(/^\/+|\/+$/g, '');
    if (!slug) return redirect(SITE + '/shop/');
    const product = Object.hasOwn(PRODUCTS, slug) ? PRODUCTS[slug] : undefined;
    if (!product) return redirect(SITE + '/shop/');

    const qty = Math.min(10, Math.max(1, parseInt(url.searchParams.get('qty') || '1', 10) || 1));
    const cart = ulid();

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(API + cart, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'hitpay-domain': 'hitpay.shop',
          'hitpay-identifier': BUSINESS_ID,
        },
        body: JSON.stringify({ product_id: product.id, quantity: qty, product_item_name: product.name, remark: null }),
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error('cart create ' + res.status);
      const data = await res.json();
      if (data.cart_id !== cart) throw new Error('cart id mismatch');
      return redirect(STORE + '/checkout/' + cart);
    } catch (err) {
      // Never strand a customer: send them to the product on the store instead.
      return redirect(product.fallback);
    }
  },
};

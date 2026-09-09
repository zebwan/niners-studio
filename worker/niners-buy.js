// niners-buy — Cloudflare Worker
// Turns a plain link on 9nersstudio.com into a HitPay checkout with the products already in the cart.
//   GET /rain-off                      -> 1 can
//   GET /rain-off?qty=2                -> 2 cans (1..10)
//   GET /checkout?items=rain-off:2     -> any number of lines, "slug:qty" comma-separated (the site's cart drawer)
// Flow: mint a cart id, create the cart on HitPay's storefront API with the lines, 302 the customer
// to https://hitpay.shop/9ners/checkout/<cart>. If anything fails, fall back to the normal product URL.
// No secrets: the two headers HitPay's own storefront sends are the store domain and the public business id.

const STORE = 'https://hitpay.shop/9ners';
const API = 'https://api-shop.hit-pay.com/v1/carts/';
const BUSINESS_ID = 'a29a5c63-2b9d-4358-b3c7-26bb5e821846';
const SITE = 'https://9nersstudio.com';
const MAX_QTY = 10;

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

function clampQty(v) {
  return Math.min(MAX_QTY, Math.max(1, parseInt(v || '1', 10) || 1));
}

// Resolve the request into [{product, qty}] or null.
function linesFor(url) {
  const slug = url.pathname.replace(/^\/+|\/+$/g, '');
  if (slug === 'checkout') {
    const lines = [];
    for (const part of (url.searchParams.get('items') || '').split(',')) {
      const [s, q] = part.split(':');
      if (Object.hasOwn(PRODUCTS, s)) lines.push({ product: PRODUCTS[s], qty: clampQty(q) });
    }
    return lines.length ? lines.slice(0, 20) : null;
  }
  if (Object.hasOwn(PRODUCTS, slug)) return [{ product: PRODUCTS[slug], qty: clampQty(url.searchParams.get('qty')) }];
  return null;
}

async function addLine(cart, line, signal) {
  const res = await fetch(API + cart, {
    method: 'POST',
    signal,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'hitpay-domain': 'hitpay.shop',
      'hitpay-identifier': BUSINESS_ID,
    },
    body: JSON.stringify({ product_id: line.product.id, quantity: line.qty, product_item_name: line.product.name, remark: null }),
  });
  if (!res.ok) throw new Error('cart create ' + res.status);
  const data = await res.json();
  if (data.cart_id !== cart) throw new Error('cart id mismatch');
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const lines = linesFor(url);
    if (!lines) return redirect(SITE + '/shop/');

    const cart = ulid();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      // HitPay merges repeat POSTs of the same product into one line, so sequential adds are safe.
      for (const line of lines) await addLine(cart, line, controller.signal);
      clearTimeout(timer);
      return redirect(STORE + '/checkout/' + cart);
    } catch (err) {
      clearTimeout(timer);
      // Never strand a customer: send them to the first product on the store instead.
      return redirect(lines[0].product.fallback);
    }
  },
};

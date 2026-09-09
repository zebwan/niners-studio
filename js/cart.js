/* 9NERS cart. Runs on every page: puts a cart button in the header, keeps the cart in localStorage,
   and draws the slide-in drawer. Checkout hands the lines to the niners-buy relay, which creates the
   HitPay cart and lands the customer on HitPay's checkout. Buttons keep a real href as a no-JS fallback. */
(function(){
  var RELAY = 'https://niners-buy.zebwan00.workers.dev';
  var KEY = 'niners_cart';
  var MAX = 10;
  var CATALOG = {
    'rain-off': { name: 'Rain Off', cat: 'Hydrophobic glass coating spray · 100g', price: 38, img: '/images/rainoff-front-cut.webp', url: '/shop/rain-off/' }
  };
  var BAG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8h12l1 12H5L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>';
  var X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  var state = load();
  var drawer, body, sub, checkout, countEl;

  function load(){
    try { var d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d && d.items) return d; } catch (e) {}
    return { v: 1, items: {} };
  }
  function save(){ try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function count(){ var n = 0; for (var k in state.items) n += state.items[k]; return n; }
  function rm(n){ return 'RM ' + n; }
  function clamp(q){ q = parseInt(q, 10); if (isNaN(q)) q = 1; return Math.max(0, Math.min(MAX, q)); }

  function setQty(slug, q){
    if (!CATALOG[slug]) return;
    q = clamp(q);
    if (q === 0) delete state.items[slug]; else state.items[slug] = q;
    save(); render();
  }
  function add(slug, q){ if (!CATALOG[slug]) return; setQty(slug, (state.items[slug] || 0) + clamp(q || 1)); }

  function checkoutUrl(){
    var slugs = Object.keys(state.items);
    if (!slugs.length) return RELAY;
    if (slugs.length === 1) return RELAY + '/' + slugs[0] + '?qty=' + state.items[slugs[0]];
    return RELAY + '/checkout?items=' + encodeURIComponent(slugs.map(function(s){ return s + ':' + state.items[s]; }).join(','));
  }

  /* header button, grouped with the WhatsApp button and burger so the header keeps its three-part layout */
  function mountHeader(){
    var nav = document.querySelector('header .nav'); if (!nav) return;
    var right = document.createElement('div'); right.className = 'nav-right';
    var wa = null, burger = null;
    Array.prototype.forEach.call(nav.children, function(c){
      if (c.classList.contains('btn-wa')) wa = c;
      if (c.classList.contains('menu-btn')) burger = c;
    });
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'cart-btn'; btn.setAttribute('aria-label', 'Cart');
    btn.innerHTML = BAG + '<span class="cart-count" hidden>0</span>';
    btn.addEventListener('click', open);
    right.appendChild(btn);
    if (wa) right.appendChild(wa);
    if (burger) right.appendChild(burger);
    nav.appendChild(right);
    countEl = btn.querySelector('.cart-count');
  }

  function mountDrawer(){
    drawer = document.createElement('div');
    drawer.className = 'cart-drawer'; drawer.id = 'cartDrawer'; drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML =
      '<div class="cd-backdrop"></div>' +
      '<aside class="cd-panel" role="dialog" aria-modal="true" aria-label="Your cart" data-lenis-prevent>' +
        '<div class="cd-head"><h2 class="cd-title">Your cart</h2><button type="button" class="cd-close">Close ' + X + '</button></div>' +
        '<div class="cd-body"></div>' +
        '<div class="cd-foot">' +
          '<div class="cd-row"><span>Subtotal</span><b class="cd-sub"></b></div>' +
          '<p class="cd-note">Delivery is RM 8 within West Malaysia, or free if you collect at the studio. You choose at checkout.</p>' +
          '<a class="btn btn-purple cd-checkout" href="' + RELAY + '">Checkout</a>' +
          '<button type="button" class="btn btn-ghost-dk cd-continue">Continue shopping</button>' +
        '</div>' +
        '<div class="cd-checker"></div>' +
      '</aside>';
    document.body.appendChild(drawer);
    body = drawer.querySelector('.cd-body');
    sub = drawer.querySelector('.cd-sub');
    checkout = drawer.querySelector('.cd-checkout');
    drawer.querySelector('.cd-backdrop').addEventListener('click', close);
    drawer.querySelector('.cd-close').addEventListener('click', close);
    drawer.querySelector('.cd-continue').addEventListener('click', close);
    body.addEventListener('click', function(e){
      var b = e.target.closest('button'); if (!b) return;
      var line = b.closest('.cd-line'); if (!line) return;
      var slug = line.getAttribute('data-slug'), q = state.items[slug] || 0;
      if (b.classList.contains('cd-remove')) setQty(slug, 0);
      else if (b.getAttribute('data-step') === '+') setQty(slug, q + 1);
      else if (b.getAttribute('data-step') === '-') setQty(slug, q - 1);
    });
  }

  function render(){
    var slugs = Object.keys(state.items), n = count(), total = 0;
    if (countEl){ countEl.textContent = n; countEl.hidden = n === 0; }
    if (!drawer) return;
    if (!slugs.length){
      drawer.setAttribute('data-empty', '1');
      body.innerHTML = '<div class="cd-empty"><h3>Your cart is empty</h3><p>Add Rain Off and it will show up here.</p><a class="btn btn-ghost-dk" href="/shop/">Browse car care</a></div>';
      return;
    }
    drawer.removeAttribute('data-empty');
    body.innerHTML = slugs.map(function(s){
      var p = CATALOG[s], q = state.items[s]; total += p.price * q;
      return '<div class="cd-line" data-slug="' + s + '">' +
        '<img class="cd-thumb" src="' + p.img + '" alt="" width="76" height="76" loading="lazy" decoding="async">' +
        '<div class="cd-info"><b>' + p.name + '</b><span>' + p.cat + '</span>' +
          '<div class="qty" aria-label="Quantity"><button type="button" data-step="-" aria-label="Fewer">−</button><span class="qty-n">' + q + '</span><button type="button" data-step="+" aria-label="More">+</button></div>' +
        '</div>' +
        '<div class="cd-price"><b>' + rm(p.price * q) + '</b><button type="button" class="cd-remove">Remove</button></div>' +
      '</div>';
    }).join('');
    sub.textContent = rm(total);
    checkout.href = checkoutUrl();
  }

  function open(){
    if (!drawer) return;
    render();
    drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('mm-lock');
    var c = drawer.querySelector('.cd-close'); if (c) c.focus();
  }
  function close(){
    if (!drawer || !drawer.classList.contains('open')) return;
    drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true');
    var mm = document.getElementById('mobMenu');
    if (!(mm && mm.classList.contains('open'))) document.body.classList.remove('mm-lock');
  }

  /* add-to-cart links and quantity steppers anywhere on the page */
  document.addEventListener('click', function(e){
    var addBtn = e.target.closest('[data-add]');
    if (addBtn){
      e.preventDefault();
      var q = 1, box = addBtn.closest('.buy-box') || addBtn.parentElement;
      var inp = box && box.querySelector('[data-qty] input');
      if (inp) q = clamp(inp.value) || 1;
      add(addBtn.getAttribute('data-add'), q);
      if (inp) inp.value = 1;
      open();
      return;
    }
    var step = e.target.closest('[data-qty] button');
    if (step){
      var input = step.parentElement.querySelector('input'); if (!input) return;
      var v = clamp(input.value) || 1;
      v = step.textContent.trim() === '+' ? v + 1 : v - 1;
      input.value = Math.max(1, Math.min(MAX, v));
    }
  });
  document.addEventListener('change', function(e){
    var input = e.target.closest('[data-qty] input'); if (!input) return;
    input.value = Math.max(1, clamp(input.value) || 1);
  });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); });
  window.addEventListener('storage', function(e){ if (e.key === KEY){ state = load(); render(); } });

  function init(){ mountHeader(); mountDrawer(); render(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

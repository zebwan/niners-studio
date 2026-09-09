(function(){
  var root = document.documentElement;
  window.__rv = 1;

  /* lazy videos: play when near viewport, pause when far */
  function wireVideos(){
    var vids = document.querySelectorAll('video[data-lazy]');
    if(!('IntersectionObserver' in window)){
      vids.forEach(function(v){ var p = v.play(); if(p && p.catch) p.catch(function(){}); });
      return;
    }
    var vio = new IntersectionObserver(function(es){
      es.forEach(function(e){
        var v = e.target;
        if(e.isIntersecting){ var p = v.play(); if(p && p.catch) p.catch(function(){}); }
        else if(!v.paused){ v.pause(); }
      });
    }, {rootMargin: '250px 0px'});
    vids.forEach(function(v){ vio.observe(v); });
  }
  wireVideos();

  /* entry reveals: titles rise word by word, other text lights up word by word, both left to right */
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!('IntersectionObserver' in window) || reduced){ root.classList.add('rv-all'); return; }

  var TITLES = 'h1.h-disp,h2.h-disp,h1.mega,h2.mega-2';
  var TEXT   = 'p,li,h3,h4,dt,dd,figcaption,.eyebrow,.kicker,.lead,.price-line,footer a';
  var PREHID = ':is(section,footer) :is(p,li,h3,h4,dt,dd,figcaption,.eyebrow,.kicker,.lead,.price-line)';
  var SKIP   = 'header,.mob-menu,.cart-drawer,.instagram-media,form,.btn,.chip,.rv,[data-rv-skip],[aria-hidden="true"]';
  var NOWALK = /^(BR|SVG|IMG|VIDEO|INPUT|SELECT|TEXTAREA|BUTTON|SCRIPT|STYLE|IFRAME)$/;

  try {
    var counts = new Map();
    function baseDelay(el){
      var g = el.closest('.sec-head') || el.parentElement || document.body;
      var n = counts.get(g) || 0;
      counts.set(g, n + 1);
      return Math.min(n, 5) * 110;
    }

    function wrapWords(el, cls, inner){
      var words = [];
      (function walk(n){
        if(n.nodeType === 3){
          if(!n.nodeValue.trim()) return;
          var frag = document.createDocumentFragment();
          n.nodeValue.split(/(\s+)/).forEach(function(p){
            if(!p) return;
            if(/^\s+$/.test(p)){ frag.appendChild(document.createTextNode(p)); return; }
            var w = document.createElement('span'); w.className = cls;
            if(inner){ var i = document.createElement('span'); i.className = inner; i.textContent = p; w.appendChild(i); words.push(i); }
            else { w.textContent = p; words.push(w); }
            frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if(n.nodeType === 1 && !NOWALK.test(n.tagName) && !n.classList.contains('hw') && !n.classList.contains('tw')){
          Array.prototype.slice.call(n.childNodes).forEach(walk);
        }
      })(el);
      return words;
    }

    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(e.isIntersecting){ e.target.classList.add(e.target.classList.contains('rv-title') ? 'in' : 'on'); io.unobserve(e.target); }
      });
    }, {rootMargin: '0px 0px -8% 0px', threshold: 0});

    /* titles */
    document.querySelectorAll(TITLES).forEach(function(el){
      if(el.closest(SKIP)){ el.classList.add('rv-show'); return; }
      var base = baseDelay(el);
      var words = wrapWords(el, 'tw', 'twi');
      words.forEach(function(w, i){ w.style.transitionDelay = (base + i * 55) + 'ms'; });
      el.classList.add('rv-title');
      el.setAttribute('data-rv', '1');
      io.observe(el);
    });

    /* everything else */
    document.querySelectorAll(TEXT).forEach(function(el){
      if(el.closest('[data-rv]')) { el.classList.add('rv-ready', 'on'); return; }   /* already inside a wrapped block */
      if(el.closest(SKIP) || el.matches(TITLES)){ el.classList.add('rv-ready', 'on'); return; }
      var words = wrapWords(el, 'hw');
      el.setAttribute('data-rv', '1');
      el.classList.add('rv-ready');
      if(!words.length){ el.classList.add('on'); return; }
      var base = baseDelay(el), step = Math.min(26, 1400 / words.length);
      words.forEach(function(w, i){ w.style.transitionDelay = Math.round(base + i * step) + 'ms'; });
      io.observe(el);
    });

    /* anything the stylesheet pre-hides that we did not touch (embeds, forms, nested blocks): show it */
    document.querySelectorAll(PREHID).forEach(function(el){
      if(!el.classList.contains('rv-ready')) el.classList.add('rv-ready', 'on');
    });
  } catch(err){
    root.classList.add('rv-all');
  }
})();

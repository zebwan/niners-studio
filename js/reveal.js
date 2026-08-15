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

  if(!('IntersectionObserver' in window)){ root.classList.add('rv-all'); return; }

  var TITLES = 'h1.h-disp,h2.h-disp,h1.mega,h2.mega-2';
  var FADES  = '.eyebrow,.kicker,.lead';

  var counts = new Map();
  function delayFor(el){
    var g = el.closest('.sec-head') || el.parentElement || document.body;
    var n = counts.get(g) || 0;
    counts.set(g, n + 1);
    return n * 110;
  }

  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, {rootMargin: '0px 0px -10% 0px', threshold: 0});

  document.querySelectorAll(TITLES + ',' + FADES).forEach(function(el){
    var isTitle = el.matches(TITLES);
    if(el.closest('.rv') || el.closest('.mob-menu')){
      el.classList.add(isTitle ? 'rv-show' : 'in');
      return;
    }
    if(isTitle){
      var base = delayFor(el);
      var parts = el.innerHTML.split(/<br\s*\/?>/i);
      el.innerHTML = parts.map(function(seg){
        return '<span class="ln"><span class="ln-in">' + seg + '</span></span>';
      }).join('');
      el.classList.add('rv-title');
      el.querySelectorAll('.ln').forEach(function(ln, i){
        ln.querySelector('.ln-in').style.transitionDelay = (base + i * 85) + 'ms';
        io.observe(ln);
      });
    } else {
      el.style.transitionDelay = delayFor(el) + 'ms';
      io.observe(el);
    }
  });
})();

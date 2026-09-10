/* 9NERS shared page behaviour: the marquees, the photo that follows the cursor on a list,
   the before/after handle and the closing tagline. All of it is optional per page: each
   piece looks for its own markup and stops if the page does not use it. */
(function(){
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* marquees: every [data-mq] set carries its speed in px/s, so rows of different
     widths drift at the same pace and stay in step when the window is resized */
  function sizeMarquees(){
    var sets = document.querySelectorAll('[data-mq]');
    for (var i = 0; i < sets.length; i++){
      var s = sets[i], sp = parseFloat(s.getAttribute('data-mq')) || 60;
      if (s.scrollWidth > 0) s.style.animationDuration = (s.scrollWidth / sp) + 's';
    }
  }

  /* a list where the photo of the hovered row follows the pointer */
  function initFloat(){
    var fl = document.querySelector('.svc-float');
    if (!fl || !matchMedia('(hover:hover) and (pointer:fine)').matches || reduced) return;
    var scope = fl.closest('section') || document.body;
    var imgs = fl.querySelectorAll('img'), tx = 0, ty = 0, cx = 0, cy = 0, raf = null, on = false;
    function tick(){
      cx += (tx - cx) * .16; cy += (ty - cy) * .16;
      fl.style.left = cx + 'px'; fl.style.top = cy + 'px';
      if (on || Math.abs(tx - cx) > .5 || Math.abs(ty - cy) > .5) raf = requestAnimationFrame(tick); else raf = null;
    }
    scope.addEventListener('mousemove', function(e){
      tx = e.clientX + 60; ty = e.clientY;
      if (!raf) raf = requestAnimationFrame(tick);
    });
    var rows = scope.querySelectorAll('.svc-row');
    for (var i = 0; i < rows.length; i++){
      (function(row){
        row.addEventListener('mouseenter', function(e){
          var n = +row.getAttribute('data-img');
          for (var k = 0; k < imgs.length; k++) imgs[k].classList.toggle('on', k === n);
          if (!on){ cx = e.clientX + 60; cy = e.clientY; }
          on = true; fl.classList.add('on');
        });
        row.addEventListener('mouseleave', function(){ on = false; fl.classList.remove('on'); });
      })(rows[i]);
    }
  }

  /* before / after: the range input is invisible and covers the frame */
  function initBA(){
    var frame = document.getElementById('baFrame'); if (!frame) return;
    var range = frame.querySelector('.ba-range'); if (!range) return;
    range.addEventListener('input', function(){ frame.style.setProperty('--p', this.value + '%'); });
    if (reduced || !('IntersectionObserver' in window)) return;
    var wiggled = false;
    new IntersectionObserver(function(entries, obs){
      if (!entries[0].isIntersecting || wiggled) return;
      wiggled = true; obs.disconnect();
      var t0 = null;
      function step(ts){
        if (!t0) t0 = ts;
        var t = Math.min(1, (ts - t0) / 1400);
        var p = 50 + Math.sin(t * Math.PI * 2) * 6 * (1 - t);
        frame.style.setProperty('--p', p + '%'); range.value = p;
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }, {threshold: .5}).observe(frame);
  }

  /* the closing tagline fills the column: one line on a desktop, two stacked on a phone.
     Measured with a Range so the width is the real text, and against the wrap's CONTENT
     width, otherwise the 24px side padding counts as usable space and the last word clips. */
  function initTagline(){
    var band = document.querySelector('.tag-band'); if (!band) return;
    var wrap = band.querySelector('.wrap'), inner = band.querySelector('.tb-in'),
        lines = band.querySelectorAll('.tb-line'), rng = document.createRange();
    if (!wrap || !inner || !lines.length) return;
    function textWidth(el){ rng.selectNodeContents(el); return rng.getBoundingClientRect().width; }
    return function fit(){
      var cs = getComputedStyle(wrap);
      var w = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      if (!(w > 0)) return;
      inner.style.fontSize = '';
      for (var i = 0; i < lines.length; i++) lines[i].style.fontSize = '';
      if (getComputedStyle(lines[0]).display === 'block'){
        for (var j = 0; j < lines.length; j++){
          var el = lines[j], fs = parseFloat(getComputedStyle(el).fontSize), tw = textWidth(el);
          if (tw > 0) el.style.fontSize = (fs * w / tw * .97) + 'px';
        }
      } else {
        var f0 = parseFloat(getComputedStyle(inner).fontSize), iw = textWidth(inner);
        if (iw > 0) inner.style.fontSize = (f0 * w / iw * .98) + 'px';
      }
    };
  }

  function start(){
    var fitTagline = initTagline();
    function relayout(){ sizeMarquees(); if (fitTagline) fitTagline(); }
    relayout(); initFloat(); initBA();
    addEventListener('resize', relayout);
    addEventListener('load', relayout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

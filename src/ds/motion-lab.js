/* ADAM/MOTION — src/ds/motion-lab.js · foundation motion playground hooks */
(function(){
  function replay(btn){
    btn.classList.remove('mot-play__btn--pop');
    void btn.offsetWidth;
    btn.classList.add('mot-play__btn--pop');
    setTimeout(function(){btn.classList.remove('mot-play__btn--pop');},520);
  }
  function runCurve(card){
    if(!card)return;
    var run=card.querySelector('[data-curve-run]');
    var dot=card.querySelector('[data-curve-dot]');
    if(!run||!dot)return;
    dot.style.setProperty('--run',((run.clientWidth||210)-10)+'px');
    run.classList.remove('mot-curve__run--go');
    void run.offsetWidth;
    run.classList.add('mot-curve__run--go');
  }
  function bind(){
    document.querySelectorAll('[data-mot]').forEach(function(b){
      if(b.dataset.bound) return; b.dataset.bound='1';
      b.addEventListener('click',function(){replay(b);});
    });
    var r=document.querySelector('[data-mot-replay]');
    if(r && !r.dataset.bound){
      r.dataset.bound='1';
      r.addEventListener('click',function(){
        document.querySelectorAll('[data-mot]').forEach(replay);
      });
    }
    var s=document.querySelector('[data-stagger-replay]');
    var box=document.querySelector('[data-mot-stagger]');
    if(s && box && !s.dataset.bound){
      s.dataset.bound='1';
      s.addEventListener('click',function(){
        box.classList.add('mot-stagger--replay');
        void box.offsetWidth;
        box.classList.remove('mot-stagger--replay');
        var spans=box.querySelectorAll('span');
        spans.forEach(function(el,i){
          el.style.animation='none';
          void el.offsetWidth;
          el.style.animation='';
          el.style.animationDelay=(i*40)+'ms';
        });
      });
    }
    document.querySelectorAll('[data-curve-replay]').forEach(function(p){
      if(p.dataset.bound)return;
      p.dataset.bound='1';
      p.addEventListener('click',function(){runCurve(p.closest('.mot-curve'));});
    });
    document.querySelectorAll('.mot-curve').forEach(function(card){
      if(card.dataset.seen||!card.offsetParent)return;
      card.dataset.seen='1';
      runCurve(card);
    });
    var rt=document.querySelector('[data-reduced-track]');
    if(rt&&!rt.dataset.bound){
      rt.dataset.bound='1';
      var go=function(){rt.closest('[data-reduced]').classList.toggle('mot-reduced--run');};
      rt.addEventListener('click',go);
      rt.addEventListener('keydown',function(e){
        if(e.key!=='Enter'&&e.key!==' ')return;
        e.preventDefault();
        go();
      });
    }
    var tg=document.querySelector('[data-reduced-toggle]');
    if(tg&&!tg.dataset.bound){
      tg.dataset.bound='1';
      tg.addEventListener('click',function(){
        var box=tg.closest('[data-reduced]');
        var on=tg.getAttribute('aria-pressed')==='true';
        tg.setAttribute('aria-pressed',on?'false':'true');
        box.classList.toggle('mot-reduced--simulate',!on);
      });
    }
  }
  document.addEventListener('ds:doc',bind);
  document.addEventListener('DOMContentLoaded',bind);
  setTimeout(bind,600);
})();

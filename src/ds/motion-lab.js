/* ADAM/MOTION — src/ds/motion-lab.js · foundation motion playground hooks */
(function(){
  function replay(btn){
    btn.classList.remove('mot-play__btn--pop');
    void btn.offsetWidth;
    btn.classList.add('mot-play__btn--pop');
    setTimeout(function(){btn.classList.remove('mot-play__btn--pop');},520);
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
  }
  document.addEventListener('ds:doc',bind);
  document.addEventListener('DOMContentLoaded',bind);
  setTimeout(bind,600);
})();

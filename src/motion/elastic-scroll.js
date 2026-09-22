export function attachElastic(el){
 let pulling=false, startY=0;
 el.addEventListener('touchstart',e=>{startY=e.touches[0].clientY; pulling=true},{passive:true});
 el.addEventListener('touchmove',e=>{
  if(!pulling) return; const dy=e.touches[0].clientY-startY;
  if(dy>0 && el.scrollTop===0) el.classList.toggle('elastic-scroll--pull', dy>24);
 },{passive:true});
 el.addEventListener('touchend',()=>{pulling=false; el.classList.remove('elastic-scroll--pull')});
 el.addEventListener('scroll',()=>{
  const r=el.scrollTop/(el.scrollHeight-el.clientHeight||1);
  const ind=el.querySelector('.elastic-scroll__indicator'); if(ind) ind.style.transform=`scaleX(${r.toFixed(3)})`;
 },{passive:true});
}

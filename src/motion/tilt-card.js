export function attachTilt(card){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
 card.addEventListener('mousemove',e=>{
  const r=card.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width-0.5; const y=(e.clientY-r.top)/r.height-0.5;
  card.style.transform=`perspective(600px) rotateX(${(-y*12).toFixed(1)}deg) rotateY(${(x*12).toFixed(1)}deg)`;
 });
 card.addEventListener('mouseleave',()=>{card.style.transform='perspective(600px) rotateX(0) rotateY(0)'});
}

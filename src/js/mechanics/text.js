// text helpers — subtle scaling p=0 constant, p=1 proportional, 0.38 gentle
export function fitTextSubtle(ctx, text, maxWorldW, baseWorld, scale, family, weight, p=0.38){
  const pow = Math.pow(scale, p - 1);
  let fontWorld = baseWorld * pow;
  ctx.font = `${weight} ${fontWorld}px ${family}`;
  let tw = ctx.measureText(text).width;
  if(tw > maxWorldW){
    const ratio = maxWorldW / tw;
    fontWorld *= ratio;
    ctx.font = `${weight} ${fontWorld}px ${family}`;
    tw = ctx.measureText(text).width;
  }
  let t = text;
  while(tw > maxWorldW && t.length > 4){
    t = t.slice(0,-2) + '…';
    tw = ctx.measureText(t).width;
  }
  return { text: t, font: ctx.font, world: fontWorld };
}
export function subtleFont(baseWorld, scale, p=0.38){
  return baseWorld * Math.pow(scale, p - 1);
}

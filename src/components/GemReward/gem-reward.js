const HUE={sapphire:'hue-rotate(0deg)',citrine:'hue-rotate(38deg) saturate(1.1)','red-beryl':'hue-rotate(310deg) saturate(1.2)',redberyl:'hue-rotate(310deg) saturate(1.2)',amethyst:'hue-rotate(265deg) saturate(1.2)'};
const COPY={sapphire:{title:'Rock Solid Goals',capsule:'+Rs 4lakh · Beyond Target',note:'data in here don’t lie'},citrine:{title:'Golden Streak',capsule:'+Rs 2.5lakh · Top Closer',note:'keep the tempo'},amethyst:{title:'Focus Master',capsule:'+Rs 3lakh · Deep Work',note:'quiet wins'},'red-beryl':{title:'Momentum',capsule:'+Rs 1.8lakh · Sprint Closed',note:'next one matters'}};
export function renderGemReward(category='sapphire', {embed='https://my.spline.design/gem-embed'}={}){
 const c=COPY[category]||COPY.sapphire;
 return `<div class="gem-reward gem-reward--${category}"><iframe class="gem-reward__spline" src="${embed}" title="Gem ceremony" loading="lazy"></iframe><div class="gem-reward__title">${c.title}</div><div class="gem-reward__capsule">${c.capsule}</div><div class="gem-reward__copy">${c.note} · mood quarantined — never inside Operate/Monitor</div></div>`;
}

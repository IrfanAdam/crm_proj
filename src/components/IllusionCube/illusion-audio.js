/* ADAM/SHARED — src/components/IllusionCube/illusion-audio.js · cues, gates, gesture arm */
/* [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-5}] · audio layer (Task 32) — single-bed + pause/hush + visibility */
(function(){
const api={};const E=window.ILLUSION_AUDIO_ENGINE||null;const KEY='illusion-sound';const BED='cube-illusion/audio/ambient.mp3';const WHOOSH='cube-illusion/audio/whoosh.mp3';const log=[];let bedOn=false;let playing=false;
function stored(){try{return window.localStorage.getItem(KEY);}catch(e){return null;}}
function gate(){if(!E)return 'silent';if(stored()==='off')return 'muted';try{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return stored()==='on'?'':'reduced';}catch(e){}if(E.fail())return 'silent';return '';}
function schedule(name,url,gain,loop){if(gate())return Promise.resolve('');if(!E.ready())return Promise.resolve('blocked');try{E.resume();}catch(e){}return E.load(url,name).then(function(buf){if(!buf)return 'silent';if(gate()){if(name==='bed')bedOn=false;return 'muted';}var tries=0;var attempt=function(){var r;try{r=E.play(buf,gain,loop);}catch(e){r=false;}return Promise.resolve(r).then(function(v){if(v!==false)return v;if(++tries<3)return new Promise(function(res){setTimeout(function(){attempt().then(res);},400);});return false;});};return attempt();}).then(function(ok){if(ok==='silent'||ok==='muted'){if(name==='bed'){bedOn=false;playing=false;}return ok;}if(!ok){if(name==='bed')bedOn=false;return 'blocked';}log.push({cue:name,t:E.now()});if(name==='bed')playing=true;return name;},function(){if(name==='bed')bedOn=false;return 'blocked';});}
let wantBed=false;
function unlock(){if(gate())return;if(playing||bedOn)return;if(E&&E.discardStale)E.discardStale();if(!E.ensure()){wantBed=true;return;}try{E.resume();}catch(e){}bedOn=true;wantBed=false;schedule('bed',BED,0.5,true);}
// Non-gesture intent (scroll-into-view): records + prefetches, births nothing.
api.expectBed=function(){if(gate())return '';if(playing||bedOn||wantBed)return 'already';wantBed=true;try{if(E&&E.prime)E.prime(BED,'bed');}catch(e){}return 'wanted';};
api.arm=function(){window.addEventListener('pointerdown',unlock);window.addEventListener('keydown',unlock);};
api.unlock=unlock;
api.status=function(){if(gate())return gate();if(playing)return 'playing';if(E.ready())return 'blocked';return 'armed';};
api.cue=function(name){if(!name)return log.slice();if(name==='whoosh')return schedule(name,WHOOSH,0.3,false);if(name==='bed2'){if(playing)return Promise.resolve('already');return schedule(name,BED,0.2,true);}if(name==='bed'){if(bedOn||playing)return Promise.resolve('already');bedOn=true;return schedule(name,BED,0.5,true);}return Promise.resolve('');};
api.toggle=function(){const off=stored()!=='off';api.setMuted(off);return off?'off':'on';};
api.pause=function(){try{if(E&&E.suspend)E.suspend();}catch(e){}return 'paused';};
api.hush=function(){try{if(E)E.hush();}catch(e){}playing=false;bedOn=false;try{if(E&&E.suspend)E.suspend();}catch(e){}return 'hushed';};api.setMuted=function(m){if(E&&E.setMuted)E.setMuted(m);else try{window.localStorage.setItem(KEY,m?'off':'on');}catch(e){}if(!m){try{if(E&&E.resume)E.resume();}catch(e){}if(!playing&&!bedOn)unlock();}return m;};api.isMuted=function(){return stored()==='off';};api.toggleMute=function(){return api.setMuted(stored()!=='off');};
(function(){var wasPlaying=false;try{document.addEventListener('visibilitychange',function(){if(!E)return;if(document.hidden){wasPlaying=playing;if(playing)try{E.suspend()}catch(e){}}else{if(wasPlaying&&!gate())try{E.resume()}catch(e){}wasPlaying=false;}});window.addEventListener('pagehide',function(){try{if(E)E.hush();}catch(e){}playing=false;bedOn=false;});window.addEventListener('beforeunload',function(){try{if(E)E.hush();}catch(e){}});window.addEventListener('message',function(ev){if(ev.data==='illusion-pause')try{if(E)E.suspend()}catch(e){};if(ev.data==='illusion-hush'||ev.data==='illusion-stop'){try{if(E)E.hush();}catch(e){}playing=false;bedOn=false;try{if(E&&E.suspend)E.suspend();}catch(e){}}});}catch(e){}})();
window.ILLUSION_AUDIO=api;
})();

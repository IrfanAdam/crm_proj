/* ADAM/SHARED — src/components/GemReward/gem-bloom-ext.js · bloom GLSL sources + uniform keys */
// [plan:2026-10-03_144222-gem-realism-round2.md#round-19] · moved verbatim out of gem-bloom.js (line-budget split).
// Export map: GEM_BLOOM_EXT { VS, BLOOM, COMP, KEYS } — read by gem-bloom.js only
(function () {
const VS = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const BLOOM = [
'uniform sampler2D tDiffuse;uniform sampler2D tDepth;uniform vec2 texel;uniform float thresh;varying vec2 vUv;',
'void main(){vec3 s=vec3(0.);float w=0.;',
'for(int i=-1;i<=1;i++){for(int j=-1;j<=1;j++){float g=exp(-float(i*i+j*j)*0.6);vec2 o=vec2(float(i),float(j))*texel;',
'float m=1.0-smoothstep(0.9990,0.9999,texture2D(tDepth,vUv+o).x);',
'vec3 c=texture2D(tDiffuse,vUv+o).rgb;float l=dot(c,vec3(0.2126,0.7152,0.0722));',
's+=c*smoothstep(thresh,thresh+0.05,l)*g*m;w+=g;}}',
'gl_FragColor=vec4(s/w,1.);}'].join('\n');
const COMP = [
'uniform sampler2D tScene;uniform sampler2D tBloom;uniform float intensity;varying vec2 vUv;',
'void main(){vec4 s=texture2D(tScene,vUv);vec3 b=texture2D(tBloom,vUv).rgb;',
'gl_FragColor=vec4(clamp(s.rgb+b*intensity,0.,1.),s.a);}'].join('\n');
const KEYS = ['tDiffuse', 'tDepth', 'tScene', 'tBloom', 'texel', 'thresh', 'intensity'];
window.GEM_BLOOM_EXT = { VS: VS, BLOOM: BLOOM, COMP: COMP, KEYS: KEYS };
})();

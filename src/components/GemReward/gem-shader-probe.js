/* ADAM/SHARED — src/components/GemReward/gem-shader-probe.js · baked-decl ES3 probe (line-budget split) */
// moved verbatim out of gem-shader-ext.js lines 89-102 (probe + F2 comment); consumed via window.GEM_SHADER_PROBE.
(function () {
// F2 guard — compile the EXACT emitted declaration as ES 3.00 on this driver before any material uses it: the
// array constructor plus the dynamic index the trace does are the two things a baked plane set can fail on.
const probe = function (gl, decl, n) {
if (!gl || !decl) return false;
const vs = gl.createShader(gl.VERTEX_SHADER), fs = gl.createShader(gl.FRAGMENT_SHADER), pr = gl.createProgram();
if (!vs || !fs || !pr) return false;
gl.shaderSource(vs, '#version 300 es\nin vec4 p;\nvoid main() { gl_Position = p; }');
gl.shaderSource(fs, '#version 300 es\nprecision highp float;\n#define PLMAX ' + n + '\n' + decl +
'uniform int uC;\nlayout(location = 0) out highp vec4 o;\nvoid main() {\n\tvec4 s = vec4( 0.0 );\n' +
'\tfor ( int i = 0; i < ' + n + '; i++ ) { if ( i >= uC ) break; s += PLB[ i ]; }\n\to = s;\n}');
gl.compileShader(vs); gl.compileShader(fs);
gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
const ok = gl.getShaderParameter(fs, gl.COMPILE_STATUS) && gl.getProgramParameter(pr, gl.LINK_STATUS);
gl.deleteProgram(pr); gl.deleteShader(vs); gl.deleteShader(fs);
return !!ok;
};
window.GEM_SHADER_PROBE = probe;
})();

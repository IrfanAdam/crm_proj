/* ADAM/SHARED — src/components/GemReward/gem-mesh-entry.js · mesh entry strings (line-budget split) */
// moved verbatim out of gem-mesh.js lines 66-71 (VSD/FSY/ENTM); consumed by gem-mesh.js via window.GEM_MESH_ENTRY.
(function () {
const VSD = 'attribute vec4 aNb0;\nattribute vec4 aNb1;\nattribute vec4 aNb2;\nvarying vec4 vNb0;\nvarying vec4 vNb1;\nvarying vec4 vNb2;\n', FSY = 'varying vec4 vNb0;\nvarying vec4 vNb1;\nvarying vec4 vNb2;\n';
const ENTM = 'vec4 entM( vec3 ro, vec3 rd, float tau, float t1, vec3 n1 ) {\n\tfloat h = 1.0, t2 = -1.0;\n\tvec3 n2 = n1;\n' +
'\tfor ( int k = 0; k < 3; k++ ) {\n\t\tvec4 P = k == 0 ? vNb0 : ( k == 1 ? vNb1 : vNb2 );\n\t\tfloat s = dot( P.xyz, ro ) + P.w, den = dot( P.xyz, rd );\n' +
'\t\tif ( s > 1e-5 && den < -1e-6 ) { float t = -s / den; if ( t > t2 && t <= t1 ) { t2 = t; n2 = P.xyz; } }\n\t}\n' +
'\tif ( t2 > 0.0 && dot( n1, n2 ) > 0.9935 ) h = clamp( 0.5 + ( t1 - t2 ) / ( 2.0 * tau * max( t1, 1e-3 ) ), 0.0, 1.0 );\n' +
'\tgNe = normalize( mix( n2, n1, h ) );\n\treturn vec4( mix( t2, t1, h ), -1.0, -1.0, 1.0 );\n}\n';
window.GEM_MESH_ENTRY = { VSD, FSY, ENTM };
})();

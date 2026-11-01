#!/usr/bin/env python3
"""value2/mk_try3.py — rebuild the far-side proxy FS block from the committed bytes (f854e08).
Only src/components/GemReward/gem-shader.js is produced; the body/transmission chunk is untouched.
usage: python3 lanes/value2/mk_try.py <out.js> [beer mir broad fill win rmix kspec sun tirboost]
"""
import sys, hashlib

SRC = "lanes/value2/gem-shader.committed.js"
out = sys.argv[1]
d = [0.10, 0.75, 0.50, 0.28, 0.35, 0.85, 0.62, 0.55, 7.0, 1.15, 2.30]
P = [float(x) for x in (sys.argv[2:13] if len(sys.argv) > 2 else d)]
BEER, MIR, FOLD, BROAD, FILL, WINW, RMIX, KSPEC, SUN, TIRB, GAIN = P

txt = open(SRC).read()
assert hashlib.md5(open(SRC, "rb").read()).hexdigest().startswith("f854e08"), "source is not committed bytes"

# 1) declare the debug uniform (R = first-bounce TIR, G = second-bounce TIR) on the FS header line
old_uni = r"uniform float ior;\nuniform float gain;\nuniform vec3 tint;\n"
assert txt.count(old_uni) == 1
txt = txt.replace(old_uni, old_uni + r"uniform float dbg;\n")
txt = txt.replace("const GAIN = 2.6;", "const GAIN = %.2f;" % GAIN)
assert "const GAIN = %.2f;" % GAIN in txt

# 2) replace the far-side shading block (committed lines 36..68)
lines = txt.split("\n")
start = next(i for i, l in enumerate(lines) if l.startswith("'vec3 n = normalize( vN );"))
end = next(i for i, l in enumerate(lines) if "gl_FragColor = vec4( mix( col + rim * 0.55" in l)

NEW = [
    "'vec3 n = normalize( vN );\\nvec3 w = normalize( vW - cameraPosition );\\nvec3 refr = refract( w, - n, ior );\\nfloat tir = 1.0 - step( 1e-4, dot( refr, refr ) );\\nvec3 dir = normalize( mix( refr, reflect( w, - n ), tir ) );\\n' +",
    "'// second bounce: this fragment IS the far facet of the same cut, so n is the surface the internal\\n// ray meets next — refract out through it (eta = stone->air) or TIR back into the stone.\\nvec3 nf = dot( dir, n ) > 0.0 ? - n : n;\\nvec3 e2 = refract( dir, nf, ior );\\nfloat tir2 = 1.0 - step( 1e-4, dot( e2, e2 ) );\\nvec3 dir2 = normalize( mix( e2, reflect( dir, nf ), tir2 ) );\\n' +",
    "'if ( dbg > 0.5 ) { gl_FragColor = vec4( tir, tir2, 0.5, 1.0 ); return; }\\n' +",
    "'// Beer-Lambert path colour: absorb per unit of travel against the stone tint, so a twice-bounced ray is\\n// deeper AND more saturated than a single pass (specular is added after this, so glints stay achromatic).\\nvec3 sig = max( vec3( 1.0 ) - tint, vec3( 0.02 ) );\\nfloat pathA = 0.9 / clamp( abs( dot( n, w ) ), 0.20, 1.0 );\\nfloat pathB = 0.9 / clamp( abs( dot( dir, n ) ), 0.20, 1.0 );\\nvec3 trans = exp( -sig * min( pathA + tir2 * pathB * 1.5, 3.6 ) * %.2f );\\n' +" % BEER,
    "'vec3 wp = vW + dir2 * 3.0;\\nvec4 cp = projectionMatrix * viewMatrix * vec4( wp, 1.0 );\\nvec2 uv = cp.xy / max( abs( cp.w ), 1e-4 ) * 0.5 + 0.5;\\nfloat inUv = step( 0.0, uv.x ) * step( uv.x, 1.0 ) * step( 0.0, uv.y ) * step( uv.y, 1.0 );\\nfloat winHit = smoothstep( -0.05, 0.55, dot( dir2, w ) );\\n' +",
    "`vec3 win = texture2D( stageTex, clamp( uv, 0.0, 1.0 ) ).rgb * ( winGain * %.2f );\\nvec3 tcl = min( tint * 1.45, vec3( 1.0 ) );\\nvec3 tcf = mix( vec3( 1.0 ), tcl, 0.55 );\\nvec3 mir = reflect( w, - n );\\n` +" % WINW,
    "'#ifdef ENVMAP_TYPE_CUBE_UV\\n' +",
    "`vec3 mirf = normalize( vec3( mir.x, abs( mir.y ) + 0.02, mir.z ) );\\nvec3 m0 = textureCubeUV( envMap, mir, 0.0 ).rgb;\\nvec3 mf = textureCubeUV( envMap, mirf, 0.12 ).rgb;\\nvec3 env = min( m0, vec3( 3.2 ) ) * %.2f + min( mf, vec3( 2.4 ) ) * %.2f + textureCubeUV( envMap, dir2, 0.06 ).rgb * 0.45 + textureCubeUV( envMap, dir, 0.22 ).rgb * 0.28 + textureCubeUV( envMap, n, 0.55 ).rgb * %.2f * tcf + tcl * %.2f * smoothstep( 0.05, -0.55, dir.y );\\n` +" % (MIR, FOLD, BROAD, FILL),
    "'#else\\n' +",
    "'vec3 env = vec3( 0.04 ) * tcf + tcl * %.2f * smoothstep( 0.05, -0.55, dir.y );\\n' +" % FILL,
    "'#endif\\n' +",
    "'vec3 through = mix( env, win, stageOn * ( 1.0 - tir ) * ( 1.0 - tir2 ) * inUv * winHit * 0.55 ) * trans;\\n' +",
    "'float hn = hashf( floor( n * 23.0 ) + floor( vW * 11.0 ) );\\nfloat up = dot( n, normalize( vec3( 0.15, 1.0, 0.1 ) ) );\\nfloat t1r = smoothstep( -0.9, 1.25, up );\\n' +",
    "'t1r = clamp( t1r + ( hn - 0.5 ) * 0.28 - smoothstep( 0.45, 1.05, up ) * 0.28, 0.0, 1.0 );\\nt1r = floor( t1r * 6.0 ) / 6.0;\\nt1r = clamp( t1r + ( hn - 0.5 ) * 0.30, 0.0, 1.0 );\\n' +",
    "`vec3 rampc = mix( rampDeep, rampMid, smoothstep( 0.0, 0.55, t1r ) );\\nrampc = mix( rampc, rampLite, smoothstep( 0.55, 1.0, t1r ) );\\nrampc = mix( rampc, rampPink, step( 0.86, hashf( floor( n * 47.0 ) + 3.7 ) ) * 0.85 );\\nvec3 rcg = rampc * 1.9;\\nrcg *= 1.0 / max( max( rcg.r, max( rcg.g, rcg.b ) ), 0.98 );\\n` +",
    "'through *= mix( vec3( 1.0 ), rcg, %.2f );\\n' +" % RMIX,
    "'// key-light specular on the crown facets: half-vector with the env sun, achromatic, added after Beer-Lambert.\\nvec3 lk = normalize( vec3( 3.0, 5.0, 4.0 ) );\\nfloat kspec = min( pow( max( dot( n, normalize( lk - w ) ), 0.0 ), 240.0 ) * %.2f, 0.55 );\\nfloat gdot = max( dot( dir2, lk ), 0.0 );\\n' +" % KSPEC,
    "`float glint = pow( gdot, 150.0 ) * %.1f;\\nfloat glowMix = smoothstep( 0.88, 0.995, gdot ) * ( 1.0 - clamp( glint, 0.0, 1.0 ) );\\nvec3 rim = tcf * glowMix;\\nvec3 col = through * gain * mix( vec3( 1.0 ), tint, 0.30 ) * mix( 1.0, %.2f, tir );\\nfloat mxc = max( col.r, max( col.g, col.b ) );\ncol *= mxc > 0.72 ? ( 0.72 + ( mxc - 0.72 ) / ( 1.0 + ( mxc - 0.72 ) * 1.6 ) ) / mxc : 1.0;\ngl_FragColor = vec4( mix( col + rim * 0.55, vec3( 1.0 ), clamp( ( glint + kspec ) * mix( 0.8, 1.5, tir ), 0.0, 1.0 ) ), 1.0 );}`;" % (SUN, TIRB),
]
lines[start:end + 1] = NEW
txt = "\n".join(lines)

# 3) the debug uniform on the material
old_ior = "ior: { value: o.ior || 2.4 },"
assert txt.count(old_ior) == 1
txt = txt.replace(old_ior, old_ior + "\ndbg: { value: 0 },")

open(out, "w").write(txt)
print("wrote", out, "lines", txt.count("\n") + 1)

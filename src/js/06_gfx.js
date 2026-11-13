// ================= GRAPHICS: sky dome, sun shadows, bloom, quality presets, ambience =================
const GFX = { quality: 'high', bloom: 0.9 };
try { const s = JSON.parse(localStorage.getItem('blockwild_settings') || '{}'); if (s.gfx) GFX.quality = s.gfx; else if (S.touch) GFX.quality = 'low'; } catch (e) { if (S.touch) GFX.quality = 'low'; }

// ---- sky dome (gradient, sun halo, sunset glow) ----
const skyUniforms = { zenith: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, sunDir: { value: new V3(0, 1, 0) }, sunColor: { value: new THREE.Color(1, 0.9, 0.7) }, sunsetCol: { value: new THREE.Color(1, 0.5, 0.25) }, sunsetK: { value: 0 }, haloK: { value: 1 } };
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(320, 32, 16), new THREE.ShaderMaterial({
  uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 vDir; void main(){ vDir=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform vec3 zenith; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor; uniform vec3 sunsetCol; uniform float sunsetK; uniform float haloK; varying vec3 vDir;
  void main(){ vec3 d=normalize(vDir); float h=d.y; vec3 c=mix(horizon, zenith, pow(clamp(h,0.0,1.0),0.6)); if(h<0.0) c=mix(horizon, horizon*0.75, clamp(-h*4.0,0.0,1.0));
   vec2 hd=normalize(d.xz+1e-4), hs=normalize(sunDir.xz+1e-4); float side=max(dot(hd,hs),0.0);
   c=mix(c, sunsetCol, sunsetK*pow(1.0-abs(h),5.0)*(0.35+0.65*pow(side,3.0)));
   float s=max(dot(d,sunDir),0.0); c+=sunColor*haloK*(pow(s,6.0)*0.22+pow(s,60.0)*0.45);
   gl_FragColor=vec4(c,1.0); }`
}));
skyDome.renderOrder = -10; skyDome.frustumCulled = false; scene.add(skyDome); scene.background = null;

// ---- sun / moon shadows ----
const shadowCam = new THREE.OrthographicCamera(-48, 48, 48, -48, 1, 420); shadowCam.layers.set(1);
let shadowRT = null;
function ensureShadowRT(size) {
  if (shadowRT && shadowRT.width === size) return;
  if (shadowRT) { shadowRT.depthTexture.dispose(); shadowRT.dispose(); }
  shadowRT = new THREE.WebGLRenderTarget(size, size, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  shadowRT.depthTexture = new THREE.DepthTexture(size, size); shadowRT.depthTexture.type = THREE.UnsignedIntType;
  chunkUniforms.shadowTexel.value = 1 / size;
}
const _f = new V3(), _r = new V3(), _u = new V3(), _c = new V3();
function updateShadowCam(lightDir, R, size) {
  shadowCam.left = shadowCam.bottom = -R; shadowCam.right = shadowCam.top = R; shadowCam.updateProjectionMatrix();
  _f.copy(lightDir).negate(); _r.crossVectors(_f, Math.abs(_f.y) > 0.99 ? new V3(0, 0, 1) : new V3(0, 1, 0)).normalize(); _u.crossVectors(_r, _f).normalize();
  const p = player.pos; const tex = 2 * R / size;
  const cr = Math.round(p.dot(_r) / tex) * tex, cu = Math.round(p.dot(_u) / tex) * tex, cf = p.dot(_f);
  _c.copy(_r).multiplyScalar(cr).addScaledVector(_u, cu).addScaledVector(_f, cf);
  shadowCam.position.copy(_c).addScaledVector(_f, -200); shadowCam.up.copy(_u); shadowCam.lookAt(_c); shadowCam.updateMatrixWorld(true);
  chunkUniforms.shadowMatrix.value.multiplyMatrices(shadowCam.projectionMatrix, shadowCam.matrixWorldInverse);
}

// ---- bloom (only emissive blocks: lava, torches, glowstone, portals...) ----
const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); const fsScene = new THREE.Scene(); const fsQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); fsScene.add(fsQuad);
const blurMat = new THREE.ShaderMaterial({ uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2(1, 0) } }, depthTest: false, depthWrite: false,
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
  fragmentShader: `uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv; void main(){ vec3 c=texture2D(tex,vUv).rgb*0.227;
    c+=(texture2D(tex,vUv+dir*1.384).rgb+texture2D(tex,vUv-dir*1.384).rgb)*0.316; c+=(texture2D(tex,vUv+dir*3.23).rgb+texture2D(tex,vUv-dir*3.23).rgb)*0.07; gl_FragColor=vec4(c,1.0); }` });
const compMat = new THREE.ShaderMaterial({ uniforms: { tex: { value: null }, tex2: { value: null }, k: { value: 1 } }, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
  fragmentShader: 'uniform sampler2D tex; uniform sampler2D tex2; uniform float k; varying vec2 vUv; void main(){ vec3 c=(texture2D(tex,vUv).rgb*0.9+texture2D(tex2,vUv).rgb*0.8)*k; gl_FragColor=vec4(c,1.0); }' });
let glowRT = null, blurA = null, blurB = null, blurC = null, blurD = null;
function ensureBloomRT() {
  const w = Math.max(1, Math.floor(renderer.domElement.width / 2)), h = Math.max(1, Math.floor(renderer.domElement.height / 2));
  if (glowRT && glowRT.width === w && glowRT.height === h) return;
  for (const t of [glowRT, blurA, blurB, blurC, blurD]) if (t) t.dispose();
  const o = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
  glowRT = new THREE.WebGLRenderTarget(w, h, o); blurA = new THREE.WebGLRenderTarget(w, h, Object.assign({ depthBuffer: false }, o)); blurB = new THREE.WebGLRenderTarget(w, h, Object.assign({ depthBuffer: false }, o));
  blurC = new THREE.WebGLRenderTarget(w >> 2 || 1, h >> 2 || 1, Object.assign({ depthBuffer: false }, o)); blurD = new THREE.WebGLRenderTarget(w >> 2 || 1, h >> 2 || 1, Object.assign({ depthBuffer: false }, o));
}
function blurPass(src, dst, dx, dy) { blurMat.uniforms.tex.value = src.texture; blurMat.uniforms.dir.value.set(dx / src.width, dy / src.height); fsQuad.material = blurMat; renderer.setRenderTarget(dst); renderer.render(fsScene, fsCam); }
function renderBloom() {
  ensureBloomRT();
  renderer.setRenderTarget(glowRT); renderer.setClearColor(0x000000, 1); renderer.clear(true, true, false);
  const prevMask = camera.layers.mask; camera.layers.set(2); scene.overrideMaterial = glowMat;
  renderer.render(scene, camera);
  scene.overrideMaterial = null; camera.layers.mask = prevMask;
  blurPass(glowRT, blurA, 1, 0); blurPass(blurA, blurB, 0, 1);       // tight glow
  blurPass(blurB, blurC, 2, 0); blurPass(blurC, blurD, 0, 2);       // wide glow
  renderer.setRenderTarget(null);
  compMat.uniforms.tex.value = blurB.texture; compMat.uniforms.tex2.value = blurD.texture; compMat.uniforms.k.value = GFX.bloom; fsQuad.material = compMat; renderer.render(fsScene, fsCam);
}

// ---- per-frame graphics state ----
function gfxSkyColors(dim, day, ss, eyeFluid, eyeSky) {
  const z = skyUniforms.zenith.value, h = skyUniforms.horizon.value;
  if (dim === 'overworld') {
    z.setRGB(0.012, 0.016, 0.045).lerp(new THREE.Color(0.24, 0.48, 0.92), day);
    h.setRGB(0.03, 0.04, 0.09).lerp(new THREE.Color(0.66, 0.83, 1.0), day);
    skyUniforms.sunsetK.value = Math.min(1, ss * 1.7); skyUniforms.haloK.value = 0.25 + day * 0.75;
  } else if (dim === 'nether') { z.setRGB(0.18, 0.03, 0.02); h.setRGB(0.3, 0.07, 0.04); skyUniforms.sunsetK.value = 0; skyUniforms.haloK.value = 0; }
  else { z.setRGB(0.03, 0.015, 0.06); h.setRGB(0.12, 0.07, 0.17); skyUniforms.sunsetK.value = 0; skyUniforms.haloK.value = 0; }
  // underground: fade the horizon/fog towards darkness so caves feel enclosed
  if (dim === 'overworld' && eyeSky < 0.6) { const k = 1 - eyeSky / 0.6; h.lerp(new THREE.Color(0.02, 0.02, 0.03), k * 0.85); z.lerp(new THREE.Color(0.02, 0.02, 0.03), k * 0.85); }
  return h;
}
function gfxFrame(dt, ang, se, day) {
  skyDome.position.copy(camera.position);
  // light direction: sun by day, moon by night
  const sun = new V3(Math.cos(ang), Math.sin(ang), 0.13).normalize();
  const useMoon = se < 0; const L = useMoon ? sun.clone().negate() : sun;
  skyUniforms.sunDir.value.copy(sun); chunkUniforms.sunDir.value.copy(L);
  sunMesh.material.color.setRGB(1, 1, 1).lerp(new THREE.Color(1, 0.62, 0.38), skyUniforms.sunsetK.value * 0.8);
  const elev = Math.abs(se);
  chunkUniforms.sunK.value = world && world.dim === 'overworld' ? smoothstep(0.03, 0.2, elev) * (useMoon ? 0.35 : 1) : 0;
  chunkUniforms.skyRefl.value.copy(skyUniforms.horizon.value).lerp(skyUniforms.zenith.value, 0.4);
  // morning mist in valleys, light haze otherwise
  const t = S.time; const morning = (t > 0.95 || t < 0.08) ? 1 : 0; chunkUniforms.mist.value = world && world.dim === 'overworld' ? 0.15 + 0.3 * morning : world && world.dim === 'nether' ? 0.2 : 0;
  chunkUniforms.mistY.value = world && world.dim === 'nether' ? NSEA + 10 : SEA + 7;
  // ambient particles
  if (world && !S.paused) {
    const P = player.pos; const n = world.dim === 'nether' ? 6 : world.dim === 'end' ? 4 : 0;
    for (let i = 0; i < n * dt * 10; i++) { if (Math.random() > 0.1) continue; const x = P.x + (Math.random() - 0.5) * 24, y = P.y + (Math.random() - 0.3) * 12, z = P.z + (Math.random() - 0.5) * 24;
      if (world.dim === 'nether') Particles.emit(x, y, z, 1, [[0.5, 0.45, 0.42], [0.8, 0.3, 0.2], [0.3, 0.28, 0.27]], 0.2, 5, 0.25, 0.1, 0.8);
      else Particles.emit(x, y, z, 1, [[0.6, 0.3, 0.9], [0.4, 0.2, 0.7]], 0.15, 5, -0.05, 0.1, 1); }
  }
}
function renderFrame() {
  const q = GFX.quality;
  if (q === 'high' && world && world.dim === 'overworld' && chunkUniforms.sunK.value > 0.01) {
    ensureShadowRT(2048); updateShadowCam(chunkUniforms.sunDir.value, 56, 2048);
    chunkUniforms.shadowMap.value = dummyDepth; chunkUniforms.shadowOn.value = 0;
    renderer.setRenderTarget(shadowRT); renderer.clear(true, true, false); renderer.render(scene, shadowCam); renderer.setRenderTarget(null);
    chunkUniforms.shadowMap.value = shadowRT.depthTexture; chunkUniforms.shadowOn.value = 1;
  } else chunkUniforms.shadowOn.value = 0;
  renderer.setRenderTarget(null); renderer.setClearColor(skyUniforms.horizon.value, 1); renderer.clear(); renderer.render(scene, camera);
  if (q !== 'low') renderBloom();
}
function setGfx(q) { GFX.quality = q; for (const b of document.querySelectorAll('#gfxSeg button')) b.classList.toggle('on', b.dataset.m === q); saveSettings(); }
for (const b of document.querySelectorAll('#gfxSeg button')) b.addEventListener('click', () => setGfx(b.dataset.m));
setGfx(GFX.quality);

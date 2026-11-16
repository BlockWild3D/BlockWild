// ================= PICTURE PARTICLES (hand-drawn particle sprites from 00_paint.js) =================
// The plain Particles system draws coloured squares. SpriteFX draws the owner's particle pictures instead: one atlas of
// 32 px cells, each particle with its own picture, size, tint and (for animated GIFs) a flipbook that plays once over its life.
// SpriteFX.emit(name, ...) returns false when there is no picture for that name, so callers can fall back to Particles.emit.
const SpriteFX = {
  N: 1500, n: 0, ok: false,
  init(scene) {
    const P = typeof PAINT_BAKED !== 'undefined' && PAINT_BAKED.particles; if (!P) return;
    this.S = P.sprites; const cols = P.cols, rows = P.h / P.cell;
    const tex = new THREE.TextureLoader().load(P.atlas); tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.flipY = false;
    const N = this.N; this.pos = new Float32Array(N * 3); this.tint = new Float32Array(N * 3); this.frame = new Float32Array(N); this.size = new Float32Array(N);
    this.v = new Float32Array(N * 3); this.life = new Float32Array(N); this.life0 = new Float32Array(N); this.grav = new Float32Array(N); this.base = new Float32Array(N); this.nfr = new Float32Array(N); this.drag = new Float32Array(N);
    const g = this.geo = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('tint', new THREE.BufferAttribute(this.tint, 3));
    g.setAttribute('frame', new THREE.BufferAttribute(this.frame, 1)); g.setAttribute('psize', new THREE.BufferAttribute(this.size, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, scale: { value: 400 }, cols: { value: cols }, rows: { value: rows } },
      vertexShader: 'attribute vec3 tint; attribute float frame; attribute float psize; uniform float scale; varying vec3 vTint; varying float vFrame;\n' +
        'void main() { vTint = tint; vFrame = frame; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = psize * projectionMatrix[1][1] * scale / max(0.05, -mv.z); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform sampler2D map; uniform float cols; uniform float rows; varying vec3 vTint; varying float vFrame;\n' +
        'void main() { float f = floor(vFrame + 0.5); vec2 cell = vec2(mod(f, cols), floor(f / cols)); vec4 c = texture2D(map, (cell + gl_PointCoord) / vec2(cols, rows)); if (c.a < 0.1) discard; gl_FragColor = vec4(c.rgb * vTint, c.a); }',
      transparent: true, depthWrite: false });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = 5; scene.add(this.pts); g.setDrawRange(0, 0); this.ok = true;
  },
  has(name) { return this.ok && (Array.isArray(name) ? name.some(n => this.S[n]) : !!this.S[name]); },
  // o: spd, life, grav (negative floats up), spread, size (world units), tint [r,g,b] 0..1 (or a list, one per particle), vel [x,y,z] fixed velocity, drag
  emit(name, x, y, z, count, o = {}) {
    if (!this.ok) return false; const names = Array.isArray(name) ? name.filter(n => this.S[n]) : [name]; if (!names.length || !this.S[names[0]]) return false;
    const spd = o.spd != null ? o.spd : 1, life = o.life != null ? o.life : 0.8, grav = o.grav != null ? o.grav : 0, spread = o.spread != null ? o.spread : 0.3, size = o.size || 0.25;
    for (let i = 0; i < count; i++) {
      if (this.n >= this.N) break; const k = this.n++; const s = this.S[names[(Math.random() * names.length) | 0]];
      this.pos[k * 3] = x + (Math.random() - 0.5) * spread; this.pos[k * 3 + 1] = y + (Math.random() - 0.5) * spread; this.pos[k * 3 + 2] = z + (Math.random() - 0.5) * spread;
      if (o.vel) { this.v[k * 3] = o.vel[0]; this.v[k * 3 + 1] = o.vel[1]; this.v[k * 3 + 2] = o.vel[2]; }
      else { this.v[k * 3] = (Math.random() - 0.5) * spd; this.v[k * 3 + 1] = Math.random() * spd * 0.6; this.v[k * 3 + 2] = (Math.random() - 0.5) * spd; }
      const t = o.tint ? (Array.isArray(o.tint[0]) ? o.tint[i % o.tint.length] : o.tint) : [1, 1, 1];
      this.tint[k * 3] = t[0]; this.tint[k * 3 + 1] = t[1]; this.tint[k * 3 + 2] = t[2];
      this.life[k] = this.life0[k] = life * (0.75 + Math.random() * 0.5); this.grav[k] = grav; this.drag[k] = o.drag || 0;
      this.base[k] = s[0]; this.nfr[k] = s[1]; this.frame[k] = s[0]; this.size[k] = size * (o.vary === false ? 1 : 0.85 + Math.random() * 0.3);
    }
    return true;
  },
  update(dt) {
    if (!this.ok) return; if (typeof AmbientFX !== 'undefined') AmbientFX.tick(dt); let j = 0; const P = this;
    for (let i = 0; i < P.n; i++) {
      P.life[i] -= dt; if (P.life[i] <= 0) continue;
      P.v[i * 3 + 1] -= P.grav[i] * dt; if (P.drag[i]) { const d = Math.max(0, 1 - P.drag[i] * dt); P.v[i * 3] *= d; P.v[i * 3 + 1] *= d; P.v[i * 3 + 2] *= d; }
      let x = P.pos[i * 3] + P.v[i * 3] * dt, y = P.pos[i * 3 + 1] + P.v[i * 3 + 1] * dt, z = P.pos[i * 3 + 2] + P.v[i * 3 + 2] * dt;
      if (P.grav[i] > 0 && G.world && G.world.solid(Math.floor(x), Math.floor(y), Math.floor(z))) { x = P.pos[i * 3]; y = P.pos[i * 3 + 1]; z = P.pos[i * 3 + 2]; P.v[i * 3] = P.v[i * 3 + 1] = P.v[i * 3 + 2] = 0; }
      const fr = P.base[i] + Math.min(P.nfr[i] - 1, Math.floor((1 - P.life[i] / P.life0[i]) * P.nfr[i]));
      if (j !== i) { for (let q = 0; q < 3; q++) { P.v[j * 3 + q] = P.v[i * 3 + q]; P.tint[j * 3 + q] = P.tint[i * 3 + q]; }
        P.life[j] = P.life[i]; P.life0[j] = P.life0[i]; P.grav[j] = P.grav[i]; P.drag[j] = P.drag[i]; P.base[j] = P.base[i]; P.nfr[j] = P.nfr[i]; P.size[j] = P.size[i]; }
      P.pos[j * 3] = x; P.pos[j * 3 + 1] = y; P.pos[j * 3 + 2] = z; P.frame[j] = fr; j++;
    }
    P.n = j; P.geo.setDrawRange(0, j); for (const a of ['position', 'tint', 'frame', 'psize']) P.geo.attributes[a].needsUpdate = true;
    if (typeof renderer !== 'undefined') P.mat.uniforms.scale.value = renderer.domElement.height / 2;
  },
  clear() { this.n = 0; if (this.geo) this.geo.setDrawRange(0, 0); },
};

// ===== Footer year =====
document.getElementById("year").textContent = new Date().getFullYear();

// ===== Mobile menu =====
const menuBtn = document.getElementById("menuBtn");
const mobileNav = document.getElementById("mobileNav");

if (menuBtn && mobileNav) {
  menuBtn.addEventListener("click", () => {
    const open = mobileNav.classList.toggle("is-open");
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });

  mobileNav.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => {
      mobileNav.classList.remove("is-open");
      menuBtn.setAttribute("aria-expanded", "false");
    });
  });
}

// ===== Spotlight follow (subtle) =====
const spotlight = document.querySelector(".spotlight");
let spX = window.innerWidth * 0.65;
let spY = window.innerHeight * 0.35;
let targetX = spX, targetY = spY;

function animateSpotlight() {
  spX += (targetX - spX) * 0.08;
  spY += (targetY - spY) * 0.08;
  if (spotlight) {
    spotlight.style.left = spX + "px";
    spotlight.style.top = spY + "px";
  }
  requestAnimationFrame(animateSpotlight);
}
animateSpotlight();

window.addEventListener("pointermove", (e) => {
  targetX = e.clientX;
  targetY = e.clientY;
}, { passive: true });

// ===== Reveal on scroll (IntersectionObserver, performant) =====
const revealEls = document.querySelectorAll(".reveal");
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add("is-visible");
  });
}, { threshold: 0.12 });

revealEls.forEach((el) => io.observe(el));

// ===== WebGL Background (real premium) =====
const canvas = document.getElementById("bg-webgl");
if (canvas) {
  const gl = canvas.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: true });

  // If WebGL fails, just keep CSS background (still fine)
  if (gl) {
    const vert = `
      attribute vec2 a_pos;
      varying vec2 v_uv;
      void main(){
        v_uv = a_pos * 0.5 + 0.5;
        gl_Position = vec4(a_pos, 0.0, 1.0);
      }
    `;

    // Soft shader: animated “energy field” (premium, not noisy mess)
    const frag = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_t;
      uniform vec2 u_res;

      float hash(vec2 p){
        p = fract(p*vec2(123.34, 345.45));
        p += dot(p, p+34.345);
        return fract(p.x*p.y);
      }

      float noise(vec2 p){
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f*f*(3.0-2.0*f);
        return mix(a, b, u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
      }

      float fbm(vec2 p){
        float v = 0.0;
        float a = 0.55;
        for(int i=0;i<5;i++){
          v += a * noise(p);
          p *= 2.02;
          a *= 0.55;
        }
        return v;
      }

      void main(){
        vec2 uv = v_uv;
        vec2 p = (uv - 0.5) * vec2(u_res.x/u_res.y, 1.0);

        float t = u_t * 0.12;

        // Two moving fields for depth
        float n1 = fbm(p*1.6 + vec2(t, -t*0.9));
        float n2 = fbm(p*2.4 + vec2(-t*0.7, t*1.1));

        // Soft light centers (like Apple cinematic glow)
        float d1 = length(p - vec2(-0.35, 0.12));
        float d2 = length(p - vec2(0.40, -0.05));

        float glow1 = exp(-d1*2.2);
        float glow2 = exp(-d2*2.0);

        float field = (n1*0.55 + n2*0.45);
        field = smoothstep(0.25, 0.85, field);

        vec3 base = vec3(0.02, 0.03, 0.06);
        vec3 c1 = vec3(0.48, 0.55, 1.00); // blue
        vec3 c2 = vec3(0.70, 0.33, 0.95); // violet

        vec3 col = base;
        col += c1 * (glow1 * 0.22);
        col += c2 * (glow2 * 0.18);
        col += mix(c1, c2, field) * (field * 0.10);

        // gentle vignette
        float v = smoothstep(1.15, 0.25, length(p));
        col *= v;

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        gl.deleteShader(s);
        return null;
      }
      return s;
    }

    const vs = compile(gl.VERTEX_SHADER, vert);
    const fs = compile(gl.FRAGMENT_SHADER, frag);

    if (vs && fs) {
      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);

      if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        gl.useProgram(prog);

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
          -1,-1,  1,-1, -1, 1,
          -1, 1,  1,-1,  1, 1
        ]), gl.STATIC_DRAW);

        const loc = gl.getAttribLocation(prog, "a_pos");
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

        const uT = gl.getUniformLocation(prog, "u_t");
        const uRes = gl.getUniformLocation(prog, "u_res");

        function resize() {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const w = Math.floor(window.innerWidth * dpr);
          const h = Math.floor(window.innerHeight * dpr);
          canvas.width = w;
          canvas.height = h;
          canvas.style.width = "100%";
          canvas.style.height = "100%";
          gl.viewport(0, 0, w, h);
          gl.uniform2f(uRes, w, h);
        }

        let start = performance.now();
        function frame(now) {
          const t = (now - start) / 1000;
          gl.uniform1f(uT, t);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
          requestAnimationFrame(frame);
        }

        window.addEventListener("resize", resize, { passive: true });
        resize();
        requestAnimationFrame(frame);
      }
    }
  }
}

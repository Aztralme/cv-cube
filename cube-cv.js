(function () {
  // Autonomous staged threads + improved rails + DPR + polite pause on interaction
  const TILE_PIX = 512;
  const PLANE_SIZE = 0.62;

  const FACE_INDEX_MAP = {
    4: "PRODUCT", // +Z front
    5: "CONTACT", // -Z back
    0: "TECH", // +X right
    1: "VIRTUES", // -X left
    2: "UP",
    3: "DOWN",
  };

  const THREAD_COLORS = {
    VIRTUES: "rgba(143,214,203,0.98)",
    TECH: "rgba(117,184,209,0.98)",
    PRODUCT: "rgba(255,205,102,0.95)",
    CONTACT: "rgba(205,130,255,0.95)",
    UP: "rgba(180,180,180,0.95)",
    DOWN: "rgba(120,120,120,0.95)",
    DEFAULT: "rgba(143,214,203,0.98)",
  };

  const ICON_MAP = {
    VIRTUES: [
      {
        icon: "🤝",
        title: "Teamwork",
        short: "I take ownership and collaborate effectively.",
      },
      {
        icon: "🏅",
        title: "Ownership",
        short: "Drive projects end-to-end to delivery.",
      },
      {
        icon: "🧭",
        title: "Integrity",
        short: "Transparent and ethical decisions.",
      },
      {
        icon: "🔥",
        title: "Resilience",
        short: "Deliver under pressure with quality.",
      },
      {
        icon: "🔍",
        title: "Curiosity",
        short: "Fast learner, loves exploring solutions.",
      },
      { icon: "🤲", title: "Empathy", short: "User & team focused approach." },
      {
        icon: "🎯",
        title: "Focus",
        short: "Prioritize for impact and quality.",
      },
      {
        icon: "🧭",
        title: "Leadership",
        short: "Lead by example, mentor engineers.",
      },
      {
        icon: "📈",
        title: "Growth",
        short: "Continuous skill and product growth.",
      },
    ],
    TECH: [
      {
        icon: "JS",
        title: "JS / TS",
        short: "Modern TypeScript & JS patterns.",
      },
      {
        icon: "⚛️",
        title: "React / Electron",
        short: "Frontend & desktop delivery.",
      },
      {
        icon: "⬢",
        title: "Node / NestJS",
        short: "Robust API design and services.",
      },
      { icon: "🐍", title: "Python / FastAPI", short: "Data & ML endpoints." },
      {
        icon: "🗄️",
        title: "MySQL / TypeORM",
        short: "Relational modeling & migrations.",
      },
      { icon: "🐳", title: "Docker", short: "Container-first deployments." },
      {
        icon: "🔀",
        title: "Git / GitHub",
        short: "CI / PR hygiene & workflows.",
      },
      { icon: "🎮", title: "Three.js", short: "Interactive visual layers." },
      { icon: "📜", title: "OpenAPI", short: "API-first contracts & docs." },
    ],
    PRODUCT: [
      {
        icon: "📄",
        title: "Doc Intelligence",
        short: "OCR & visual forensics pipelines.",
      },
      {
        icon: "🧠",
        title: "Classification",
        short: "Templates & classification flows.",
      },
      {
        icon: "🤖",
        title: "AI Orchestration",
        short: "Multi-agent orchestration patterns.",
      },
      {
        icon: "⚖️",
        title: "Compliance",
        short: "Regulatory-aware system design.",
      },
      {
        icon: "🌐",
        title: "Graph Thinking",
        short: "Graph models (Neo4j) for relationships.",
      },
      {
        icon: "🔁",
        title: "Workflow Design",
        short: "Reliable state and workflow engines.",
      },
      {
        icon: "🎤",
        title: "Voice Assistants",
        short: "Conversational UX & assistants.",
      },
      {
        icon: "⚙️",
        title: "Automation",
        short: "Desktop & process automation.",
      },
      {
        icon: "✅",
        title: "DX / QA",
        short: "Developer experience & testing.",
      },
    ],
    CONTACT: [
      {
        icon: "✉️",
        title: "Email",
        short: "marko.petronijevic@elitas-belgrade.com",
        action: "mailto:marko.petronijevic@elitas-belgrade.com",
      },
      {
        icon: "📞",
        title: "Phone",
        short: "(+381) 631440708 (Mobile)",
        action: "tel:+381631440708",
      },
      {
        icon: "💬",
        title: "WhatsApp",
        short: "WhatsApp",
        action: "https://wa.me/381631440708",
      },
      {
        icon: "🔗",
        title: "Facebook",
        short: "facebook.com",
        action: "https://www.facebook.com/share/16grphStpV/",
      },
      {
        icon: "📄",
        title: "Open PDF CV",
        short: "Open full CV",
        action: "./Marko_P.pdf",
      },
      {
        icon: "🌐",
        title: "Portfolio",
        short: "Portfolio",
        action: "https://your-portfolio.example",
      },
      { icon: "🔒", title: "QR / Demo", short: "Scan for demo" },
      { icon: "➕", title: "More", short: "Extra links" },
      { icon: "📍", title: "Location", short: "Belgrade, Serbia" },
    ],
  };

  // caches + state
  const textureCache = new Map();
  const stickerMeshes = [];
  let overlayCanvas = null;
  let overlayCtx = null;
  let dpr = Math.max(1, window.devicePixelRatio || 1);

  // DOM refs
  const calloutEl = document.getElementById("cv-callout");
  const cvTitle = document.getElementById("cv-title");
  const cvText = document.getElementById("cv-text");
  const cvIcon = document.querySelector(".cv-icon");
  const actionPrimary = document.getElementById("cv-action-primary");
  const actionSecondary = document.getElementById("cv-action-secondary");
  const toggleAutoBtn = document.getElementById("toggle-autospin");
  const footerEl = document.getElementById("cv-footer");

  // thread state
  const thread = {
    from: { x: 0, y: 0 },
    to: { x: 0, y: 0 },
    progress: 0,
    target: 0,
    visible: false,
    currentColor: THREAD_COLORS.DEFAULT,
    easing(t) {
      return 1 - Math.pow(1 - t, 3);
    }, // easeOutCubic
  };

  // staged reveal state (autonomous reveal of all fields, 2s apart)
  const staged = {
    running: false,
    idx: 0,
    interval: 2000,
    timer: null,
    revealed: new Set(),
    paused: false,
  };

  // auto-cycle (fallback)
  const autoCycle = {
    enabled: true,
    interval: 3200,
    timer: null,
    currentIndex: -1,
    idleTimeout: null,
    resumeDelay: 2500,
  };

  // small allocations
  const _worldPos = new THREE.Vector3();
  const _tmpVec = new THREE.Vector3();
  const _tmpQuat = new THREE.Quaternion();
  const _camDir = new THREE.Vector3();

  /* ---------- overlay / DPR ---------- */
  function ensureOverlay() {
    const overlay = document.querySelector(".cv-overlay");
    if (!overlay) return null;
    if (!overlayCanvas) {
      overlayCanvas = document.createElement("canvas");
      overlayCanvas.style.position = "absolute";
      overlayCanvas.style.inset = "0";
      overlayCanvas.style.width = "100%";
      overlayCanvas.style.height = "100%";
      overlayCanvas.style.pointerEvents = "none";
      overlay.appendChild(overlayCanvas);
      overlayCtx = overlayCanvas.getContext("2d");
      resizeOverlay();
    }
    return overlayCanvas;
  }

  function resizeOverlay() {
    if (!overlayCanvas) return;
    dpr = Math.max(1, window.devicePixelRatio || 1);
    overlayCanvas.width = Math.round(window.innerWidth * dpr);
    overlayCanvas.height = Math.round(window.innerHeight * dpr);
    overlayCanvas.style.width = window.innerWidth + "px";
    overlayCanvas.style.height = window.innerHeight + "px";
    overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // when overlay changes size, rails need repositioning relative to footer
    adjustRailsForFooter();
  }

  /* ---------- premium textures ---------- */
  function makeIconTileTexture(icon, label) {
    const key = `${icon}|${label}`;
    if (textureCache.has(key)) return textureCache.get(key);

    const c = document.createElement("canvas");
    c.width = TILE_PIX;
    c.height = TILE_PIX;
    const ctx = c.getContext("2d");

    // background
    const grad = ctx.createLinearGradient(0, 0, c.width, c.height);
    grad.addColorStop(0, "rgba(18,20,22,0.92)");
    grad.addColorStop(1, "rgba(24,26,28,0.88)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, c.width, c.height);

    const pad = Math.round(c.width * 0.06);
    const w = c.width - pad * 2;
    const h = c.height - pad * 2;
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    roundRect(ctx, pad, pad, w, h, 22);
    ctx.fill();

    const cx = c.width / 2;
    const cy = c.height * 0.42;
    const r = c.width * 0.24;
    const plateGrad = ctx.createRadialGradient(
      cx - r * 0.3,
      cy - r * 0.3,
      r * 0.2,
      cx,
      cy,
      r
    );
    plateGrad.addColorStop(0, "rgba(143,214,203,0.18)");
    plateGrad.addColorStop(1, "rgba(143,214,203,0.06)");
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = plateGrad;
    ctx.fill();

    ctx.lineWidth = Math.max(2, c.width * 0.007);
    ctx.strokeStyle = "rgba(143,214,203,0.08)";
    ctx.stroke();

    ctx.font = `${Math.round(r * 1.4)}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(icon || "•", cx, cy + 2);

    ctx.fillStyle = "rgba(230,243,238,0.98)";
    ctx.font = `${Math.round(c.width * 0.07)}px Inter, Arial, sans-serif`;
    ctx.fillText(label || "", cx, c.height * 0.82);

    // inner shadow
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgba(4,8,6,0.02)";
    roundRect(ctx, pad, pad, w, h, 22);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = rendererMaxAnisotropy();
    tex.needsUpdate = true;
    textureCache.set(key, tex);
    return tex;
  }

  function roundRect(ctx, x, y, w, h, r) {
    const radius = r || 6;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function rendererMaxAnisotropy() {
    try {
      if (
        window.RUBIK &&
        window.RUBIK.renderer &&
        window.RUBIK.renderer.capabilities
      ) {
        const fn = window.RUBIK.renderer.capabilities.getMaxAnisotropy;
        return fn ? fn.call(window.RUBIK.renderer.capabilities) : 1;
      }
    } catch (e) {}
    return 1;
  }

  /* ---------- sticker placement (slightly outside cubie face) ---------- */
  function computeStickerTransform(faceIndex, col, row) {
    const spacing =
      (window.RUBIK && window.RUBIK.CONFIG && window.RUBIK.CONFIG.spacing) ||
      0.75;
    const cubeSize =
      (window.RUBIK && window.RUBIK.CONFIG && window.RUBIK.CONFIG.cubeSize) ||
      0.7;
    const outOffset = spacing + cubeSize / 2 + 0.02;
    const gap = spacing;
    const pos = new THREE.Vector3();
    const rot = new THREE.Euler();
    switch (faceIndex) {
      case 4:
        pos.set(col * gap, row * gap, outOffset);
        rot.set(0, 0, 0);
        break;
      case 5:
        pos.set(-col * gap, row * gap, -outOffset);
        rot.set(0, Math.PI, 0);
        break;
      case 0:
        pos.set(outOffset, row * gap, -col * gap);
        rot.set(0, -Math.PI / 2, 0);
        break;
      case 1:
        pos.set(-outOffset, row * gap, col * gap);
        rot.set(0, Math.PI / 2, 0);
        break;
      case 2:
        pos.set(col * gap, outOffset, -row * gap);
        rot.set(-Math.PI / 2, 0, 0);
        break;
      case 3:
        pos.set(col * gap, -outOffset, row * gap);
        rot.set(Math.PI / 2, 0, 0);
        break;
      default:
        pos.set(col * gap, row * gap, outOffset);
    }
    return { pos, rot };
  }

  function addFaceStickers(faceIndex, faceKey) {
    const items = ICON_MAP[faceKey];
    if (!items) return;
    let idx = 0;
    for (let row = 1; row >= -1; row--) {
      for (let col = -1; col <= 1; col++) {
        const item = items[idx] || { icon: "•", title: "Slot", short: "" };
        const tex = makeIconTileTexture(item.icon, item.title);
        const mat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          opacity: 0,
          depthTest: false,
        });
        mat.polygonOffset = true;
        mat.polygonOffsetFactor = -2;
        mat.polygonOffsetUnits = -4;
        const geom = new THREE.PlaneGeometry(
          PLANE_SIZE * 0.92,
          PLANE_SIZE * 0.92
        );
        const mesh = new THREE.Mesh(geom, mat);
        const t = computeStickerTransform(faceIndex, col, row);
        mesh.position.copy(t.pos);
        mesh.rotation.copy(t.rot);
        mesh.userData = {
          faceIndex,
          faceKey,
          index: idx,
          title: item.title,
          short: item.short,
          icon: item.icon,
          action: item.action || null,
          _revealed: false,
        };
        if (window.RUBIK && window.RUBIK.rubikCubeGroup)
          window.RUBIK.rubikCubeGroup.add(mesh);
        else {
          if (!window.__CV_STICKER_GROUP)
            window.__CV_STICKER_GROUP = new THREE.Group();
          window.__CV_STICKER_GROUP.add(mesh);
        }
        stickerMeshes.push(mesh);
        idx++;
      }
    }
  }

  /* ---------- projection + visibility ---------- */
  function projectToScreen(pos, camera) {
    const p = pos.clone().project(camera);
    return {
      x: (p.x * 0.5 + 0.5) * window.innerWidth,
      y: (-p.y * 0.5 + 0.5) * window.innerHeight,
      z: p.z,
    };
  }

  // updates material opacity based on facing (frontal threshold). Smooth fade.
  function updateStickerVisibility() {
    if (!window.RUBIK || !window.RUBIK.camera) return;
    const camPos = window.RUBIK.camera.position;
    for (let i = 0; i < stickerMeshes.length; i++) {
      const m = stickerMeshes[i];
      if (!m || !m.material) continue;
      m.getWorldPosition(_worldPos);
      m.getWorldQuaternion(_tmpQuat);
      _tmpVec.set(0, 0, 1).applyQuaternion(_tmpQuat).normalize();
      _camDir.copy(camPos).sub(_worldPos).normalize();
      const dot = _tmpVec.dot(_camDir);
      const threshold = 0.48; // tuned: somewhat frontal
      const targetOpacity = dot > threshold ? 1 : 0;
      const cur = Math.max(
        0,
        Math.min(1, m.material.opacity == null ? 0 : m.material.opacity)
      );
      const next = cur + (targetOpacity - cur) * 0.22;
      m.material.opacity = next;
      m.material.visible = next > 0.01;
      const s = 1 + next * 0.06;
      m.scale.set(s, s, 1);
    }
  }

  /* ---------- overlay draw loop (thread + particle) ---------- */
  let overlayRAF = null;
  function overlayLoop() {
    overlayRAF = requestAnimationFrame(overlayLoop);
    if (!overlayCtx) return;
    updateStickerVisibility();
    const delta = 0.14;
    thread.progress += (thread.target - thread.progress) * delta;
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    if (thread.progress > 0.001) {
      const p = thread.easing(thread.progress);
      const sx = thread.from.x,
        sy = thread.from.y;
      const tx = thread.to.x,
        ty = thread.to.y;
      const midX = sx + (tx - sx) * 0.5;
      const controlY = Math.min(sy, ty) - 60 * (0.4 + 0.6 * p);

      overlayCtx.save();
      overlayCtx.globalAlpha = 0.95 * p;
      overlayCtx.strokeStyle = thread.currentColor || THREAD_COLORS.DEFAULT;
      overlayCtx.lineWidth = 2.6;
      overlayCtx.lineCap = "round";
      overlayCtx.beginPath();
      overlayCtx.moveTo(sx, sy);
      overlayCtx.quadraticCurveTo(midX, controlY, tx, ty);
      overlayCtx.stroke();

      // traveling particle on the curve
      const tDot = Math.min(1, p);
      const bx =
        (1 - tDot) * (1 - tDot) * sx +
        2 * (1 - tDot) * tDot * midX +
        tDot * tDot * tx;
      const by =
        (1 - tDot) * (1 - tDot) * sy +
        2 * (1 - tDot) * tDot * controlY +
        tDot * tDot * ty;

      overlayCtx.fillStyle = thread.currentColor || THREAD_COLORS.DEFAULT;
      overlayCtx.beginPath();
      overlayCtx.arc(bx, by, 4 * (0.7 + 0.3 * p), 0, Math.PI * 2);
      overlayCtx.fill();
      overlayCtx.restore();
    }
  }

  /* ---------- callout / rails UI ---------- */
  function ensureRails() {
    const root = document.querySelector(".cv-overlay");
    if (!root) return null;
    const sides = ["left", "right", "top", "bottom"];
    const rails = {};
    sides.forEach((s) => {
      let el = root.querySelector(`.cv-rail.${s}`);
      if (!el) {
        el = document.createElement("div");
        el.className = `cv-rail ${s}`;
        root.appendChild(el);
      }
      rails[s] = el;
    });
    adjustRailsForFooter(); // keep rails above footer
    return rails;
  }

  function adjustRailsForFooter() {
    const railsRoot = document.querySelector(".cv-overlay");
    if (!railsRoot) return;
    const rails = {
      left: railsRoot.querySelector(".cv-rail.left"),
      right: railsRoot.querySelector(".cv-rail.right"),
      top: railsRoot.querySelector(".cv-rail.top"),
      bottom: railsRoot.querySelector(".cv-rail.bottom"),
    };
    const footerRect = footerEl
      ? footerEl.getBoundingClientRect()
      : { height: 76 };
    const pad = Math.max(12, footerRect.height + 16);
    // raise left/right rails slightly to avoid overlap with footer
    if (rails.left) rails.left.style.top = `calc(50% - ${pad}px)`;
    if (rails.right) rails.right.style.top = `calc(50% - ${pad}px)`;
    if (rails.bottom) rails.bottom.style.bottom = `${pad}px`;
    if (rails.top) rails.top.style.top = `24px`;
  }

  function pickSideFor(screenX, screenY) {
    const cx = window.innerWidth * 0.5;
    const cy = window.innerHeight * 0.5;
    const dx = screenX - cx,
      dy = screenY - cy;
    if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? "left" : "right";
    return dy < 0 ? "top" : "bottom";
  }

  function pushSkillToRail(side, item) {
    const rails = ensureRails();
    if (!rails) return;
    const rail = rails[side];
    const card = document.createElement("div");
    card.className = "cv-skill";
    card.innerHTML = `
      <span class="cv-skill-ico">${item.icon || "•"}</span>
      <div class="cv-skill-body">
        <div class="cv-skill-title">${item.title || ""}</div>
        <div class="cv-skill-sub">${item.short || ""}</div>
      </div>
    `;
    rail.appendChild(card);
    const MAX = 6;
    while (rail.children.length > MAX) rail.removeChild(rail.firstChild);
    requestAnimationFrame(() => card.classList.add("show"));
    // ensure rail won't overlap footer: adjust margin on last child
    const footerRect = footerEl
      ? footerEl.getBoundingClientRect()
      : { height: 76 };
    if (side === "right" || side === "left") {
      rail.style.maxHeight = `calc(100vh - ${footerRect.height + 80}px)`;
      rail.style.overflow = "hidden";
    }
  }

  /* ---------- show / hide callout ---------- */
  function showCalloutFor(mesh) {
    if (!calloutEl || !window.RUBIK || !window.RUBIK.camera) return;
    mesh.getWorldPosition(_worldPos);
    const cam = window.RUBIK.camera;
    const screen = projectToScreen(_worldPos, cam);

    cvTitle.textContent = mesh.userData.title || "Title";
    cvText.textContent = mesh.userData.short || "";
    if (cvIcon) cvIcon.textContent = mesh.userData.icon || "";

    if (mesh.userData.action && actionPrimary) {
      actionPrimary.href = mesh.userData.action;
      actionPrimary.style.display = "inline-block";
    } else if (actionPrimary) {
      actionPrimary.style.display = "none";
    }
    if (actionSecondary) actionSecondary.href = "./Marko_P.pdf";

    // clamp vertical + bring callout closer to cube horizontally
    const topY = Math.max(
      72,
      Math.min(window.innerHeight - 140, screen.y - 20)
    );
    const centerX = window.innerWidth * 0.58;
    const targetLeft = centerX + (screen.x - centerX) * 0.28;
    const finalLeft = Math.max(
      18,
      Math.min(window.innerWidth - 320 - 18, targetLeft)
    );
    calloutEl.style.top = `${topY}px`;
    calloutEl.style.left = `${finalLeft}px`;
    calloutEl.classList.add("show");
    calloutEl.setAttribute("aria-hidden", "false");

    const calloutRect = calloutEl.getBoundingClientRect();
    const anchorXRaw = calloutRect.left - 12;
    const anchorX = Math.max(8, Math.min(window.innerWidth - 8, anchorXRaw));
    const anchorY = topY + 22;

    thread.from.x = Math.max(8, Math.min(window.innerWidth - 8, screen.x));
    thread.from.y = Math.max(8, Math.min(window.innerHeight - 8, screen.y));

    // push anchor away from cube so rails/cards don't overlap footer
    let ax = anchorX,
      ay = anchorY;
    const dx = ax - thread.from.x,
      dy = ay - thread.from.y;
    const len = Math.hypot(dx, dy) || 1;
    const pushOut = 36;
    ax += (dx / len) * pushOut;
    ay += (dy / len) * pushOut;

    thread.to.x = ax;
    thread.to.y = ay;

    const fk =
      mesh.userData.faceKey ||
      FACE_INDEX_MAP[mesh.userData.faceIndex] ||
      "DEFAULT";
    thread.currentColor = THREAD_COLORS[fk] || THREAD_COLORS.DEFAULT;

    thread.target = 1;
    thread.visible = true;

    // push card to rail
    const side = pickSideFor(screen.x, screen.y);
    pushSkillToRail(side, mesh.userData);
  }

  function hideCallout() {
    if (!calloutEl) return;
    calloutEl.classList.remove("show");
    calloutEl.setAttribute("aria-hidden", "true");
    thread.target = 0;
    thread.visible = false;
  }

  /* ---------- pointer handlers (pause staged reveal on interaction) ---------- */
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let lastHit = null;

  function onPointerMove(e) {
    if (!window.RUBIK || !window.RUBIK.renderer || !window.RUBIK.camera) return;
    const rect = window.RUBIK.renderer.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    pointer.set(x, y);
    raycaster.setFromCamera(pointer, window.RUBIK.camera);
    const intersects = raycaster.intersectObjects(stickerMeshes, true);
    if (intersects.length > 0) {
      const obj = intersects[0].object;
      if (lastHit !== obj) {
        lastHit = obj;
        pauseAllRevealsTemporary();
        showCalloutFor(obj);
      }
    } else {
      lastHit = null;
      hideCallout();
    }
  }

  function onClick() {
    if (!lastHit) return;
    const d = lastHit.userData;
    if (d && d.action) window.open(d.action, "_blank", "noopener");
  }

  /* ---------- staged reveal logic ---------- */
  function stagedStep() {
    if (!staged.running || staged.paused) return;
    // find next not-yet-revealed sticker (in traversal order)
    const total = stickerMeshes.length;
    for (let attempt = 0; attempt < total; attempt++) {
      staged.idx = (staged.idx + 1) % total;
      const cand = stickerMeshes[staged.idx];
      if (!cand) continue;
      if (!staged.revealed.has(cand)) {
        // show it
        staged.revealed.add(cand);
        showCalloutFor(cand);
        // hide after short delay unless user interacts
        setTimeout(() => {
          if (!thread.visible) return;
          hideCallout();
        }, 1600);
        break;
      }
    }
    // if all revealed, stop
    if (staged.revealed.size >= stickerMeshes.length) stopStagedReveal();
  }

  function startStagedReveal(delay = 800) {
    if (staged.running) return;
    staged.running = true;
    staged.paused = false;
    staged.idx = -1;
    staged.revealed.clear();
    // small delay to let scene settle
    setTimeout(() => {
      staged.timer = setInterval(stagedStep, staged.interval);
      // first immediate call
      stagedStep();
    }, delay);
  }

  function stopStagedReveal() {
    if (!staged.running) return;
    staged.running = false;
    if (staged.timer) {
      clearInterval(staged.timer);
      staged.timer = null;
    }
  }

  function pauseAllRevealsTemporary() {
    // pause staged reveal; resume after resumeDelay
    staged.paused = true;
    if (staged.timer) clearInterval(staged.timer);
    if (autoCycle.timer) clearInterval(autoCycle.timer);
    if (autoCycle.idleTimeout) clearTimeout(autoCycle.idleTimeout);
    // resume after user idle
    autoCycle.idleTimeout = setTimeout(() => {
      staged.paused = false;
      // resume staged if not finished
      if (staged.revealed.size < stickerMeshes.length) {
        if (staged.timer) clearInterval(staged.timer);
        staged.timer = setInterval(stagedStep, staged.interval);
      } else {
        startAutoCycle();
      }
    }, autoCycle.resumeDelay);
  }

  /* ---------- auto cycle (fallback) ---------- */
  function startAutoCycle() {
    stopAutoCycle();
    if (!autoCycle.enabled) return;
    autoCycle.timer = setInterval(() => {
      if (stickerMeshes.length === 0) return;
      let found = false;
      for (let attempt = 0; attempt < stickerMeshes.length; attempt++) {
        autoCycle.currentIndex =
          (autoCycle.currentIndex + 1) % stickerMeshes.length;
        const cand = stickerMeshes[autoCycle.currentIndex];
        if (cand && cand.material && cand.material.opacity > 0.55) {
          showCalloutFor(cand);
          found = true;
          setTimeout(() => {
            if (!thread.visible) return;
            hideCallout();
          }, Math.max(1400, autoCycle.interval - 600));
          break;
        }
      }
      if (!found) {
        const fallback = stickerMeshes[4] || stickerMeshes[0];
        if (fallback) {
          showCalloutFor(fallback);
          setTimeout(hideCallout, 1200);
        }
      }
    }, autoCycle.interval);
  }

  function stopAutoCycle() {
    if (autoCycle.timer) {
      clearInterval(autoCycle.timer);
      autoCycle.timer = null;
    }
  }

  /* ---------- attach / lifecycle ---------- */
  function tryAttach() {
    if (
      !(
        window.RUBIK &&
        window.RUBIK.rubikCubeGroup &&
        window.RUBIK.renderer &&
        window.RUBIK.camera
      )
    )
      return false;

    // reparent temporary group
    if (
      window.__CV_STICKER_GROUP &&
      window.__CV_STICKER_GROUP.children.length > 0
    ) {
      window.__CV_STICKER_GROUP.children
        .slice()
        .forEach((m) => window.RUBIK.rubikCubeGroup.add(m));
      window.__CV_STICKER_GROUP = null;
    }

    if (stickerMeshes.length === 0) {
      Object.keys(FACE_INDEX_MAP).forEach((faceIdxStr) => {
        const fi = parseInt(faceIdxStr, 10);
        const fk = FACE_INDEX_MAP[fi];
        addFaceStickers(fi, fk);
      });
    }

    ensureOverlay();
    resizeOverlay();
    window.addEventListener("resize", resizeOverlay);

    const canvas = window.RUBIK.renderer.domElement;
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("click", onClick);

    if (!overlayRAF) overlayLoop();

    // tune camera to show more frontal area (if present)
    try {
      const cfg = window.RUBIK.CONFIG || {};
      const cam = window.RUBIK.camera;
      const grp = window.RUBIK.rubikCubeGroup;
      if (cam && grp) {
        const base = cfg.cameraDistance || 6;
        cam.position.set(
          base * 0.92,
          base * 0.7 + (cfg.verticalShift || 0.25),
          base * 0.92
        );
        cam.lookAt(grp.position);
      }
    } catch (e) {}

    // ensure footer/r ail offsets are correct now
    adjustRailsForFooter();

    // wire toggle
    if (toggleAutoBtn && window.RUBIK && window.RUBIK.rubikCubeGroup) {
      toggleAutoBtn.addEventListener("click", () => {
        const g = window.RUBIK.rubikCubeGroup;
        g.userData.autospin = !g.userData.autospin;
        toggleAutoBtn.setAttribute(
          "aria-pressed",
          String(!!g.userData.autospin)
        );
        pauseAllRevealsTemporary();
      });
    }

    // start staged reveal sequence (autonomous fade-in of threads)
    startStagedReveal(900);

    console.log(
      "[cube-cv] attached: stickers + overlay ready; staged reveal started"
    );
    return true;
  }

  function initWhenReady() {
    if (tryAttach()) return;
    let attempts = 0;
    const id = setInterval(() => {
      attempts++;
      if (tryAttach() || attempts > 60) clearInterval(id);
    }, 200);
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", initWhenReady);
  else initWhenReady();
})();

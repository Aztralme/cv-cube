window.addEventListener("load", function () {
  console.log("🎯 IVVK Rubik Cube starting...");

  if (typeof THREE === "undefined") {
    document.getElementById("rubik-container").innerHTML = `
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:#666;">
        <h3>❌ Three.js Not Found</h3>
        <p>Please download three.min.js to assets folder</p>
        <a href="https://threejs.org/build/three.min.js" target="_blank" style="color:#8fd6cb;">Download Here</a>
      </div>`;
    return;
  }

  const CONFIG = {
    cubeSize: 0.7,
    spacing: 0.75,
    cameraDistance: 6,
    animationDuration: 600,
    autoStartDelay: 1500,
    verticalShift: 0.25, // Blago podizanje kocke za bolje vizuelno centriranje
  };

  const scene = new THREE.Scene();
  const rubikCubeGroup = new THREE.Group(); // Grupa za sve delove kocke
  scene.add(rubikCubeGroup);

  // Podesavanje pozicije grupe kocke (za vertikalno centriranje)
  rubikCubeGroup.position.y = CONFIG.verticalShift;

  // Default autospin metadata (može se menjati spolja preko window.RUBIK.setAutoSpin)
  rubikCubeGroup.userData = rubikCubeGroup.userData || {};
  rubikCubeGroup.userData.autospin = true;
  // rotation speed expressed in radians per second (tuned)
  rubikCubeGroup.userData.rotationSpeed = 0.52; // general spin speed (radians/sec)

  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(
    CONFIG.cameraDistance,
    CONFIG.cameraDistance + CONFIG.verticalShift,
    CONFIG.cameraDistance
  );
  camera.lookAt(0, rubikCubeGroup.position.y, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  const container = document.getElementById("rubik-container");
  container.appendChild(renderer.domElement);

  // Expose internals so augmentation script can hook in:
  window.RUBIK = window.RUBIK || {};
  Object.assign(window.RUBIK, {
    scene,
    camera,
    renderer,
    rubikCubeGroup,
    CONFIG,
    // helper to toggle autospin programmatically
    setAutoSpin(flag) {
      rubikCubeGroup.userData.autospin = !!flag;
    },
  });

  if (renderer.domElement && renderer.domElement.style) {
    renderer.domElement.style.touchAction = "none";
  }

  const ambientLight = new THREE.AmbientLight(0x555555, 1.0);
  scene.add(ambientLight);

  const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight1.position.set(10, 10 + CONFIG.verticalShift, 5);
  directionalLight1.castShadow = true;
  scene.add(directionalLight1);

  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight2.position.set(-8, 6 + CONFIG.verticalShift, 8);
  scene.add(directionalLight2);

  const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.4);
  directionalLight3.position.set(0, -10 + CONFIG.verticalShift, 5);
  scene.add(directionalLight3);

  const pointLight = new THREE.PointLight(0x8fd6cb, 0.5, 50);
  pointLight.position.set(5, 5 + CONFIG.verticalShift, 5);
  scene.add(pointLight);

  const materials = {
    white: new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.15,
      roughness: 0.15,
      transparent: true,
      opacity: 0.95,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      emissive: 0xffffff,
      emissiveIntensity: 0.03,
    }),
    mint: new THREE.MeshPhysicalMaterial({
      color: 0x6ce8d4,
      metalness: 0.2,
      roughness: 0.1,
      transparent: true,
      opacity: 0.95,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      emissive: 0x6ce8d4,
      emissiveIntensity: 0.05,
    }),
    charcoal: new THREE.MeshPhysicalMaterial({
      color: 0x2a2a2a,
      metalness: 0.3,
      roughness: 0.2,
      transparent: true,
      opacity: 0.95,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
      emissive: 0x2a2a2a,
      emissiveIntensity: 0.15,
    }),
    lightBlue: new THREE.MeshPhysicalMaterial({
      color: 0x75b8d1,
      metalness: 0.2,
      roughness: 0.15,
      transparent: true,
      opacity: 0.95,
      clearcoat: 1.0,
      clearcoatRoughness: 0.07,
      emissive: 0x75b8d1,
      emissiveIntensity: 0.05,
    }),
    darkSilver: new THREE.MeshPhysicalMaterial({
      color: 0x505050,
      metalness: 0.5,
      roughness: 0.1,
      transparent: true,
      opacity: 0.95,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      emissive: 0x505050,
      emissiveIntensity: 0.1,
    }),
    silver: new THREE.MeshPhysicalMaterial({
      color: 0xbababa,
      metalness: 0.4,
      roughness: 0.05,
      transparent: true,
      opacity: 0.95,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      emissive: 0xbababa,
      emissiveIntensity: 0.04,
    }),
  };

  const cubies = [];
  let initialPositions = [];

  function createCubie(x, y, z) {
    const geometry = new THREE.BoxGeometry(
      CONFIG.cubeSize,
      CONFIG.cubeSize,
      CONFIG.cubeSize
    );
    const faceMaterialOrder = [
      materials.mint,
      materials.lightBlue,
      materials.white,
      materials.darkSilver,
      materials.charcoal,
      materials.silver,
    ];
    const meshMaterials = [];
    for (let i = 0; i < 6; i++) {
      const isExteriorFace =
        (i === 0 && x === 1) ||
        (i === 1 && x === -1) ||
        (i === 2 && y === 1) ||
        (i === 3 && y === -1) ||
        (i === 4 && z === 1) ||
        (i === 5 && z === -1);
      meshMaterials.push(
        isExteriorFace ? faceMaterialOrder[i] : materials.silver
      );
    }
    const mesh = new THREE.Mesh(geometry, meshMaterials);
    mesh.position.set(
      x * CONFIG.spacing,
      y * CONFIG.spacing,
      z * CONFIG.spacing
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rubikCubeGroup.add(mesh);
    cubies.push(mesh);
    initialPositions.push({
      position: mesh.position.clone(),
      rotation: mesh.rotation.clone(),
    });
    return mesh;
  }

  function createRubikCube() {
    cubies.forEach((cube) => rubikCubeGroup.remove(cube));
    cubies.length = 0;
    initialPositions.length = 0;
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) {
          if (Math.abs(x) + Math.abs(y) + Math.abs(z) > 0) createCubie(x, y, z);
        }
    console.log(`✅ Created ${cubies.length} cubies`);
  }

  function reparentTemporaryStickerGroup() {
    if (
      window.__CV_STICKER_GROUP &&
      window.__CV_STICKER_GROUP.children.length > 0
    ) {
      window.__CV_STICKER_GROUP.children
        .slice()
        .forEach((m) => rubikCubeGroup.add(m));
      try {
        window.__CV_STICKER_GROUP.parent &&
          window.__CV_STICKER_GROUP.parent.remove(window.__CV_STICKER_GROUP);
      } catch (e) {}
      window.__CV_STICKER_GROUP = null;
      console.log(
        "[rubik] reparented external sticker group into rubikCubeGroup"
      );
    }
  }

  // Use a clock so rotation is framerate independent
  const clock = new THREE.Clock();

  // define a tilted world axis to rotate around (affects which face becomes frontal)
  const rotationAxis = new THREE.Vector3(0.26, 1.0, -0.18).normalize();

  function animate() {
    requestAnimationFrame(animate);
    const delta = Math.max(0, Math.min(0.05, clock.getDelta()));
    if (rubikCubeGroup.userData && rubikCubeGroup.userData.autospin) {
      const angle =
        (rubikCubeGroup.userData.rotationSpeed || CONFIG.rotationSpeed || 0.4) *
        delta;
      // rotate around tilted world axis
      rubikCubeGroup.rotateOnWorldAxis(rotationAxis, angle);
    }
    renderer.render(scene, camera);
  }

  function showUI() {
    console.log("🎬 Starting UI reveal sequence...");
    setTimeout(() => {
      const logo = document.getElementById("ivvk-logo");
      if (logo) logo.classList.add("show");
      console.log("✨ Logo revealed (if present)");
    }, 200);
    setTimeout(() => {
      const form = document.getElementById("login-form");
      if (form) {
        form.classList.add("show");
        form.style.opacity = "1";
        form.style.visibility = "visible";
        form.style.pointerEvents = "auto";
        console.log("🔐 Login form revealed (if present)");
      }
    }, 800);
  }

  function setupEvents() {
    setTimeout(showUI, CONFIG.autoStartDelay);
    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
    window.addEventListener("keydown", (ev) => {
      if (ev.code === "Space") {
        rubikCubeGroup.userData.autospin = !rubikCubeGroup.userData.autospin;
        console.log("[rubik] autospin:", rubikCubeGroup.userData.autospin);
      }
    });
  }

  function init() {
    try {
      if (!container) throw new Error("Rubik container not found");
      createRubikCube();
      reparentTemporaryStickerGroup();
      if (cubies.length === 0) throw new Error("No cubies were created");
      setupEvents();
      animate();
      const loading = document.querySelector(".loading");
      if (loading) loading.remove();
      console.log("🚀 IVVK Rubik Cube initialized successfully!");
    } catch (error) {
      console.error("❌ Init error:", error);
      container.innerHTML = `
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:#ff6b6b;">
          <h3>⚠️ Initialization Failed</h3>
          <p style="color:#666;margin:16px 0;">${error.message}</p>
          <button onclick="location.reload()" style="background:#8fd6cb;color:#1a1a1a;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-weight:600;">
            🔄 Retry
          </button>
        </div>`;
    }
  }

  init();
});

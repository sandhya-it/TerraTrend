import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

interface EarthGlobeCanvasProps {
  onSelectStation?: (regionId: string) => void;
}

const _satPos = new THREE.Vector3();
const _targetOrigin = new THREE.Vector3(0, 0, 0);

function createEarthTexture(): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Deep ocean bathymetry gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#0c2340');
  oceanGrad.addColorStop(0.18, '#081d38');
  oceanGrad.addColorStop(0.5, '#072242');
  oceanGrad.addColorStop(0.82, '#081c36');
  oceanGrad.addColorStop(1, '#0d2644');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle continental shelf polygons (simplified geographic silhouettes)
  const drawLand = (coords: Array<[number, number]>, fill: string, stroke: string) => {
    ctx.beginPath();
    coords.forEach(([lon, lat], idx) => {
      const x = ((lon + 180) / 360) * width;
      const y = ((90 - lat) / 180) * height;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  };

  const landFill = '#133a54';
  const landStroke = '#36D9E6';

  // North America
  drawLand(
    [
      [-168, 65], [-140, 70], [-95, 72], [-78, 62], [-55, 52], [-66, 44], [-80, 30],
      [-82, 24], [-90, 29], [-97, 26], [-105, 20], [-88, 14], [-82, 9], [-94, 15],
      [-108, 24], [-117, 32], [-124, 42], [-130, 54], [-152, 60],
    ],
    landFill,
    landStroke
  );

  // Greenland
  drawLand(
    [[-52, 60], [-42, 60], [-20, 72], [-25, 82], [-55, 82], [-68, 76], [-56, 67]],
    '#1b4b68',
    landStroke
  );

  // South America
  drawLand(
    [
      [-79, 10], [-68, 12], [-50, 1], [-35, -6], [-38, -16], [-48, -26],
      [-58, -38], [-67, -53], [-74, -52], [-73, -38], [-71, -18], [-81, -5],
    ],
    '#154258',
    landStroke
  );

  // Europe
  drawLand(
    [
      [-9, 36], [4, 38], [16, 38], [26, 40], [32, 46], [42, 45], [58, 52],
      [60, 68], [28, 71], [10, 64], [5, 54], [-5, 48], [-9, 42],
    ],
    landFill,
    landStroke
  );

  // Africa
  drawLand(
    [
      [-17, 15], [-6, 35], [11, 37], [32, 31], [43, 12], [51, 12], [41, -2],
      [40, -16], [33, -27], [20, -35], [14, -22], [9, 4], [-8, 5], [-16, 11],
    ],
    '#184357',
    landStroke
  );

  // Asia
  drawLand(
    [
      [35, 36], [55, 25], [68, 23], [78, 8], [88, 22], [102, 14], [104, 2],
      [110, 20], [122, 31], [130, 42], [142, 54], [162, 60], [178, 66],
      [140, 72], [104, 76], [70, 72], [58, 55], [44, 44],
    ],
    landFill,
    landStroke
  );

  // Australia
  drawLand(
    [
      [114, -22], [129, -14], [142, -11], [153, -26], [149, -37], [138, -35],
      [124, -33], [115, -34],
    ],
    '#194558',
    landStroke
  );

  // Antarctica rim
  drawLand(
    [[-180, -72], [-120, -74], [-60, -66], [0, -70], [60, -68], [120, -67], [180, -72], [180, -90], [-180, -90]],
    '#1c4463',
    '#4ea8de'
  );

  // Graticule grid
  ctx.strokeStyle = 'rgba(54, 217, 230, 0.12)';
  ctx.lineWidth = 0.8;
  for (let lon = -150; lon <= 150; lon += 30) {
    const x = ((lon + 180) / 360) * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = ((90 - lat) / 180) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Regional thermal/hydrological monitoring highlights on surface
  const hotspots = [
    { lon: -111.6, lat: 35.1, color: 'rgba(255, 181, 71, 0.55)' }, // US Southwest
    { lon: -100.8, lat: 46.8, color: 'rgba(57, 214, 160, 0.55)' }, // Northern Plains
    { lon: 15.6, lat: 78.2, color: 'rgba(244, 91, 105, 0.6)' }, // Arctic Svalbard
    { lon: -61.5, lat: -9.8, color: 'rgba(255, 181, 71, 0.55)' }, // Amazon
    { lon: 2.1, lat: 14.5, color: 'rgba(57, 214, 160, 0.55)' }, // Sahel
    { lon: -3.2, lat: 39.4, color: 'rgba(255, 181, 71, 0.55)' }, // Iberia
  ];
  hotspots.forEach((h) => {
    const x = ((h.lon + 180) / 360) * width;
    const y = ((90 - h.lat) / 180) * height;
    const rad = ctx.createRadialGradient(x, y, 2, x, y, 26);
    rad.addColorStop(0, h.color);
    rad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rad;
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createCloudTexture(): THREE.CanvasTexture {
  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, width, height);

  // Subtle deterministic atmospheric bands & cyclone wisps
  let seed = 42;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 160; i++) {
    const x = rand() * width;
    const y = (0.1 + rand() * 0.8) * height;
    const rx = 14 + rand() * 44;
    const ry = 3 + rand() * 8;
    const alpha = 0.04 + rand() * 0.08;
    ctx.fillStyle = `rgba(210, 238, 255, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, (rand() - 0.5) * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function buildObservingSatellite(): THREE.Group {
  const satGroup = new THREE.Group();

  const goldFoilMat = new THREE.MeshStandardMaterial({
    color: 0xe6a832,
    metalness: 0.9,
    roughness: 0.24,
  });
  const chassisMat = new THREE.MeshStandardMaterial({
    color: 0xd0dced,
    metalness: 0.78,
    roughness: 0.32,
  });
  const solarMat = new THREE.MeshStandardMaterial({
    color: 0x11366e,
    emissive: 0x0b254a,
    emissiveIntensity: 0.4,
    metalness: 0.55,
    roughness: 0.18,
  });
  const sensorMat = new THREE.MeshStandardMaterial({
    color: 0x36d9e6,
    emissive: 0x36d9e6,
    emissiveIntensity: 0.75,
    metalness: 0.4,
    roughness: 0.2,
  });

  // 1. Primary hexagonal spacecraft bus
  const busGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.24, 6);
  const bus = new THREE.Mesh(busGeo, goldFoilMat);
  satGroup.add(bus);

  // 2. Nadir optical/radiometer sensor cone
  const coneGeo = new THREE.CylinderGeometry(0.06, 0.09, 0.1, 12);
  const cone = new THREE.Mesh(coneGeo, chassisMat);
  cone.position.y = -0.16;
  satGroup.add(cone);

  // 3. Active nadir laser/aperture ring
  const lensGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.02, 16);
  const lens = new THREE.Mesh(lensGeo, sensorMat);
  lens.position.y = -0.21;
  satGroup.add(lens);

  // 4. High-gain parabolic dish via LatheGeometry
  const dishPoints = [
    new THREE.Vector2(0.001, 0),
    new THREE.Vector2(0.04, 0.01),
    new THREE.Vector2(0.08, 0.035),
  ];
  const dishGeo = new THREE.LatheGeometry(dishPoints, 16);
  const dish = new THREE.Mesh(dishGeo, chassisMat);
  dish.position.set(0, 0.15, 0.05);
  dish.rotation.x = Math.PI * 0.25;
  satGroup.add(dish);

  // 5. Left & right articulated solar panel wings + structural booms
  const boomGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.96, 8);
  boomGeo.rotateZ(Math.PI / 2);
  const boom = new THREE.Mesh(boomGeo, chassisMat);
  satGroup.add(boom);

  const panelGeo = new THREE.BoxGeometry(0.36, 0.012, 0.14);
  const leftPanel = new THREE.Mesh(panelGeo, solarMat);
  leftPanel.position.x = -0.32;
  satGroup.add(leftPanel);

  const rightPanel = new THREE.Mesh(panelGeo, solarMat);
  rightPanel.position.x = 0.32;
  satGroup.add(rightPanel);

  return satGroup;
}

export function EarthGlobeCanvas({ onSelectStation }: EarthGlobeCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const selectCallbackRef = useRef(onSelectStation);
  selectCallbackRef.current = onSelectStation;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 520;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 1.35, 5.1);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Lighting rig: warm solar key + cool deep-space fill
    const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.3);
    keyLight.position.set(5, 3, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x36d9e6, 1.15);
    rimLight.position.set(-5, -1, -3);
    scene.add(rimLight);

    const hemiLight = new THREE.HemisphereLight(0x88c0ff, 0x071426, 0.65);
    scene.add(hemiLight);

    // Starfield (Instanced or Points)
    const starCount = 350;
    const starPositions = new Float32Array(starCount * 3);
    let sSeed = 99;
    const sRand = () => {
      sSeed = (sSeed * 16807) % 2147483647;
      return (sSeed - 1) / 2147483646;
    };
    for (let i = 0; i < starCount; i++) {
      const r = 16 + sRand() * 14;
      const theta = sRand() * Math.PI * 2;
      const phi = Math.acos(2 * sRand() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xaec8ec, size: 0.06, transparent: true, opacity: 0.65 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Earth Globe
    const earthGroup = new THREE.Group();
    earthGroup.rotation.z = THREE.MathUtils.degToRad(23.4);
    scene.add(earthGroup);

    const earthTexture = createEarthTexture();
    earthTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const earthGeo = new THREE.SphereGeometry(1.65, 64, 48);
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.65,
      metalness: 0.12,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthGroup.add(earthMesh);

    // Cloud sphere
    const cloudTexture = createCloudTexture();
    const cloudGeo = new THREE.SphereGeometry(1.685, 48, 36);
    const cloudMat = new THREE.MeshStandardMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      roughness: 0.9,
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    earthGroup.add(cloudMesh);

    // Atmospheric rim glow
    const atmosGeo = new THREE.SphereGeometry(1.76, 48, 36);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x36d9e6,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    earthGroup.add(atmosMesh);

    // Satellite orbital rings + composite NASA observing satellite
    const orbitGroup = new THREE.Group();
    orbitGroup.rotation.x = THREE.MathUtils.degToRad(34);
    orbitGroup.rotation.z = THREE.MathUtils.degToRad(-24);
    scene.add(orbitGroup);

    const orbitRadius = 2.42;
    const orbitGeo = new THREE.TorusGeometry(orbitRadius, 0.008, 8, 96);
    orbitGeo.rotateX(Math.PI / 2);
    const orbitMat = new THREE.MeshBasicMaterial({
      color: 0x36d9e6,
      transparent: true,
      opacity: 0.35,
    });
    const orbitRing = new THREE.Mesh(orbitGeo, orbitMat);
    orbitGroup.add(orbitRing);

    const satellite = buildObservingSatellite();
    orbitGroup.add(satellite);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 3.2;
    controls.maxDistance = 7.5;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const delta = Math.min(0.1, clock.getDelta());
      const elapsed = clock.getElapsedTime();

      if (!prefersReducedMotion) {
        earthMesh.rotation.y += delta * 0.14;
        cloudMesh.rotation.y += delta * 0.19;
        const satAngle = elapsed * 0.52;
        _satPos.set(Math.cos(satAngle) * orbitRadius, 0, Math.sin(satAngle) * orbitRadius);
        satellite.position.copy(_satPos);
        satellite.lookAt(_targetOrigin);
        satellite.rotateX(Math.PI / 2);
      } else {
        satellite.position.set(orbitRadius, 0, 0);
        satellite.lookAt(_targetOrigin);
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    tick();

    const handleResize = () => {
      if (!container || disposed) return;
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 520;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      earthGeo.dispose();
      earthMat.dispose();
      earthTexture.dispose();
      cloudGeo.dispose();
      cloudMat.dispose();
      cloudTexture.dispose();
      atmosGeo.dispose();
      atmosMat.dispose();
      orbitGeo.dispose();
      orbitMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="w-full h-full min-h-[380px] lg:min-h-[500px] cursor-grab active:cursor-grabbing"
      aria-label="Interactive 3D Earth Globe with orbiting NASA Earth-observing satellite"
    />
  );
}

import * as THREE from 'three';
import { VehicleConfig } from '../../types';
import { MaterialPalette } from '../materials';
import { VehicleMeshBundle } from './carModels';

export function createBikeMesh(config: VehicleConfig): VehicleMeshBundle {
  MaterialPalette.init();
  const bikeGroup = new THREE.Group();
  bikeGroup.name = `bike_${config.id}`;

  const primaryCol = new THREE.Color(config.customization.primaryColor);
  const secondaryCol = new THREE.Color(config.customization.secondaryColor);
  const rimCol = new THREE.Color(config.customization.rimColor);
  const neonCol = new THREE.Color(config.customization.neonColor);

  // High gloss fairing paint
  const fairingMat = new THREE.MeshPhysicalMaterial({
    color: primaryCol,
    metalness: 0.7,
    roughness: 0.22,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  });

  const frameMat = new THREE.MeshStandardMaterial({
    color: secondaryCol,
    metalness: 0.85,
    roughness: 0.35,
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: rimCol,
    metalness: 0.9,
    roughness: 0.2,
  });

  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xe0f2fe,
    emissiveIntensity: 3.5,
  });

  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff0033,
    emissiveIntensity: 4.0,
  });

  // 1. FRAME & ENGINE BLOCK (Chassis center)
  const engineBlockGeom = new THREE.BoxGeometry(0.36, 0.45, 0.65);
  const engineBlock = new THREE.Mesh(engineBlockGeom, frameMat);
  engineBlock.position.set(0, 0.45, 0.05);
  engineBlock.castShadow = true;
  bikeGroup.add(engineBlock);

  // Twin-spar aluminum perimeter frame beams
  const frameBeamGeom = new THREE.BoxGeometry(0.06, 0.14, 0.8);
  const leftBeam = new THREE.Mesh(frameBeamGeom, frameMat);
  leftBeam.position.set(-0.2, 0.6, 0.2);
  leftBeam.rotation.x = -0.3;
  const rightBeam = leftBeam.clone();
  rightBeam.position.x = 0.2;
  bikeGroup.add(leftBeam, rightBeam);

  // 2. FUEL TANK & SEAT / TAIL COWL
  const tankGeom = new THREE.BoxGeometry(0.42, 0.32, 0.62);
  const tank = new THREE.Mesh(tankGeom, fairingMat);
  tank.position.set(0, 0.78, 0.18);
  tank.rotation.x = -0.15;
  tank.castShadow = true;
  bikeGroup.add(tank);

  // Solo racing seat
  const seatGeom = new THREE.BoxGeometry(0.3, 0.1, 0.45);
  const seat = new THREE.Mesh(seatGeom, MaterialPalette.interiorMaterial);
  seat.position.set(0, 0.72, -0.22);
  bikeGroup.add(seat);

  // Aerodynamic tail cowl (pointy supersport rear)
  const tailGeom = new THREE.ConeGeometry(0.24, 0.65, 4);
  tailGeom.rotateX(-Math.PI / 2);
  const tail = new THREE.Mesh(tailGeom, fairingMat);
  tail.position.set(0, 0.82, -0.62);
  tail.scale.set(0.7, 0.4, 1.0);
  tail.castShadow = true;
  bikeGroup.add(tail);

  // 3. FRONT FAIRING & WINDSHIELD
  const frontFairingGeom = new THREE.BoxGeometry(0.46, 0.48, 0.55);
  const frontFairing = new THREE.Mesh(frontFairingGeom, fairingMat);
  frontFairing.position.set(0, 0.8, 0.72);
  frontFairing.rotation.x = -0.35;
  frontFairing.castShadow = true;
  bikeGroup.add(frontFairing);

  // Windscreen / Bubble
  const screenGeom = new THREE.CylinderGeometry(0.18, 0.24, 0.35, 12, 1, true, 0, Math.PI);
  screenGeom.rotateX(-Math.PI / 3);
  const screen = new THREE.Mesh(screenGeom, MaterialPalette.glassMaterial);
  screen.position.set(0, 1.02, 0.68);
  bikeGroup.add(screen);

  // Winglets (Ducati / BMW style)
  if (config.id === 'bike_ducati' || config.id === 'bike_bmw') {
    const wingletGeom = new THREE.BoxGeometry(0.22, 0.03, 0.18);
    const wL = new THREE.Mesh(wingletGeom, MaterialPalette.carbonMaterial);
    wL.position.set(-0.32, 0.72, 0.68);
    wL.rotation.z = -0.2;
    const wR = new THREE.Mesh(wingletGeom, MaterialPalette.carbonMaterial);
    wR.position.set(0.32, 0.72, 0.68);
    wR.rotation.z = 0.2;
    bikeGroup.add(wL, wR);
  }

  // 4. LIGHTS
  const headlightMeshes: THREE.Mesh[] = [];
  const taillightMeshes: THREE.Mesh[] = [];

  const hlGeom = new THREE.BoxGeometry(0.12, 0.05, 0.08);
  const hlL = new THREE.Mesh(hlGeom, headlightMat);
  hlL.position.set(-0.13, 0.72, 0.94);
  hlL.rotation.y = -0.15;
  const hlR = new THREE.Mesh(hlGeom, headlightMat);
  hlR.position.set(0.13, 0.72, 0.94);
  hlR.rotation.y = 0.15;
  bikeGroup.add(hlL, hlR);
  headlightMeshes.push(hlL, hlR);

  // Rear light
  const tlGeom = new THREE.BoxGeometry(0.14, 0.04, 0.04);
  const tl = new THREE.Mesh(tlGeom, taillightMat);
  tl.position.set(0, 0.82, -0.96);
  bikeGroup.add(tl);
  taillightMeshes.push(tl);

  // 5. EXHAUST SYSTEM
  const exhaustPipes: THREE.Vector3[] = [];
  const exhaustGeom = new THREE.CylinderGeometry(0.05, 0.065, 0.48, 12);
  exhaustGeom.rotateX(Math.PI / 2);
  const exhaust = new THREE.Mesh(exhaustGeom, MaterialPalette.chromeMaterial);
  exhaust.position.set(0.22, 0.42, -0.38);
  exhaust.rotation.x = -0.22;
  exhaust.rotation.y = -0.15;
  bikeGroup.add(exhaust);
  exhaustPipes.push(new THREE.Vector3(0.24, 0.46, -0.62));

  // 6. WHEELS & SUSPENSION
  const wheels: THREE.Group[] = [];
  const steerPivots: THREE.Group[] = [];

  // Front Fork & Wheel Assembly
  const frontSteerPivot = new THREE.Group();
  frontSteerPivot.position.set(0, 0, 0.85);

  // Fork tubes (inverted gold or black forks)
  const forkGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.75, 8);
  const forkMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.2 });
  const forkL = new THREE.Mesh(forkGeom, forkMat);
  forkL.position.set(-0.12, 0.48, 0);
  forkL.rotation.x = -0.38;
  const forkR = forkL.clone();
  forkR.position.x = 0.12;
  frontSteerPivot.add(forkL, forkR);

  // Handlebars & Grips
  const barGeom = new THREE.BoxGeometry(0.48, 0.03, 0.05);
  const handlebars = new THREE.Mesh(barGeom, MaterialPalette.interiorMaterial);
  handlebars.position.set(0, 0.75, 0.1);
  frontSteerPivot.add(handlebars);

  // Front wheel
  const frontWheelRadius = 0.32;
  const frontWheelWidth = 0.12;
  const frontTireGeom = new THREE.CylinderGeometry(frontWheelRadius, frontWheelRadius, frontWheelWidth, 24);
  frontTireGeom.rotateZ(Math.PI / 2);

  const frontSpinGroup = new THREE.Group();
  frontSpinGroup.position.set(0, frontWheelRadius, -0.06);

  const frontTire = new THREE.Mesh(frontTireGeom, MaterialPalette.tireMaterial);
  frontTire.castShadow = true;
  frontSpinGroup.add(frontTire);

  const frontRimGeom = new THREE.CylinderGeometry(frontWheelRadius * 0.82, frontWheelRadius * 0.82, frontWheelWidth * 0.9, 10);
  frontRimGeom.rotateZ(Math.PI / 2);
  const frontRim = new THREE.Mesh(frontRimGeom, rimMat);
  frontSpinGroup.add(frontRim);

  // Dual front brake discs
  const frontDiscGeom = new THREE.CylinderGeometry(frontWheelRadius * 0.7, frontWheelRadius * 0.7, 0.02, 16);
  frontDiscGeom.rotateZ(Math.PI / 2);
  const fDiscL = new THREE.Mesh(frontDiscGeom, MaterialPalette.brakeDiscMaterial);
  fDiscL.position.x = -0.065;
  const fDiscR = fDiscL.clone();
  fDiscR.position.x = 0.065;
  frontSpinGroup.add(fDiscL, fDiscR);

  frontSteerPivot.add(frontSpinGroup);
  bikeGroup.add(frontSteerPivot);
  steerPivots.push(frontSteerPivot);
  wheels.push(frontSpinGroup);

  // Rear Swingarm & Rear Wheel Assembly
  const swingarmGeom = new THREE.BoxGeometry(0.3, 0.08, 0.65);
  const swingarm = new THREE.Mesh(swingarmGeom, frameMat);
  swingarm.position.set(0, 0.35, -0.38);
  swingarm.rotation.x = 0.12;
  bikeGroup.add(swingarm);

  // Rear Wheel (wider 200 section)
  const rearWheelRadius = 0.32;
  const rearWheelWidth = 0.18;
  const rearTireGeom = new THREE.CylinderGeometry(rearWheelRadius, rearWheelRadius, rearWheelWidth, 24);
  rearTireGeom.rotateZ(Math.PI / 2);

  const rearSpinGroup = new THREE.Group();
  rearSpinGroup.position.set(0, rearWheelRadius, -0.72);

  const rearTire = new THREE.Mesh(rearTireGeom, MaterialPalette.tireMaterial);
  rearTire.castShadow = true;
  rearSpinGroup.add(rearTire);

  const rearRimGeom = new THREE.CylinderGeometry(rearWheelRadius * 0.82, rearWheelRadius * 0.82, rearWheelWidth * 0.9, 10);
  rearRimGeom.rotateZ(Math.PI / 2);
  const rearRim = new THREE.Mesh(rearRimGeom, rimMat);
  rearSpinGroup.add(rearRim);

  bikeGroup.add(rearSpinGroup);
  wheels.push(rearSpinGroup);

  // 7. 3D RIDER MODEL
  const riderGroup = new THREE.Group();
  riderGroup.position.set(0, 0, 0);

  // Suit material (matches vehicle or black racing leather)
  const suitMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.65,
    metalness: 0.1,
  });

  const accentSuitMat = new THREE.MeshStandardMaterial({
    color: primaryCol,
    roughness: 0.5,
    metalness: 0.2,
  });

  // Rider Torso (tucked low aggressively)
  const torsoGeom = new THREE.BoxGeometry(0.32, 0.42, 0.48);
  const torso = new THREE.Mesh(torsoGeom, accentSuitMat);
  torso.position.set(0, 0.95, -0.05);
  torso.rotation.x = -0.55; // Tucked forward
  torso.castShadow = true;
  riderGroup.add(torso);

  // Aerodynamic speed hump on back
  const humpGeom = new THREE.ConeGeometry(0.12, 0.3, 6);
  humpGeom.rotateX(-Math.PI / 2);
  const hump = new THREE.Mesh(humpGeom, suitMat);
  hump.position.set(0, 1.15, -0.22);
  riderGroup.add(hump);

  // Helmet with tinted iridium visor
  const helmetGeom = new THREE.SphereGeometry(0.14, 16, 16);
  const helmet = new THREE.Mesh(helmetGeom, suitMat);
  helmet.position.set(0, 1.25, 0.15);
  helmet.castShadow = true;

  const visorGeom = new THREE.CylinderGeometry(0.13, 0.13, 0.08, 12, 1, false, 0, Math.PI);
  visorGeom.rotateX(Math.PI / 2);
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0xd97706, // Gold mirror iridium visor
    metalness: 0.95,
    roughness: 0.05,
  });
  const visor = new THREE.Mesh(visorGeom, visorMat);
  visor.position.set(0, 0.01, 0.05);
  helmet.add(visor);
  riderGroup.add(helmet);

  // Rider Arms
  const armGeom = new THREE.CylinderGeometry(0.045, 0.04, 0.38, 8);
  armGeom.rotateX(Math.PI / 4);
  const armL = new THREE.Mesh(armGeom, suitMat);
  armL.position.set(-0.2, 0.88, 0.3);
  armL.rotation.y = -0.2;
  const armR = armL.clone();
  armR.position.x = 0.2;
  armR.rotation.y = 0.2;
  riderGroup.add(armL, armR);

  // Rider Legs & Knee Pucks
  const legGeom = new THREE.BoxGeometry(0.1, 0.36, 0.2);
  const legL = new THREE.Mesh(legGeom, suitMat);
  legL.position.set(-0.22, 0.58, -0.15);
  legL.rotation.x = 0.3;
  const legR = legL.clone();
  legR.position.x = 0.22;
  riderGroup.add(legL, legR);

  bikeGroup.add(riderGroup);

  // 8. NEON UNDERGLOW
  let underglowMesh: THREE.Mesh | undefined;
  if (config.customization.hasNeon) {
    const neonGeom = new THREE.PlaneGeometry(0.65, 1.6);
    const neonMat = new THREE.MeshBasicMaterial({
      color: neonCol,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    underglowMesh = new THREE.Mesh(neonGeom, neonMat);
    underglowMesh.rotation.x = Math.PI / 2;
    underglowMesh.position.y = 0.08;
    bikeGroup.add(underglowMesh);
  }

  // 9. GROUND CONTACT SHADOW
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext('2d')!;
  const grad = sCtx.createRadialGradient(64, 64, 8, 64, 64, 55);
  grad.addColorStop(0, 'rgba(0,0,0,0.75)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.3)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 128, 128);

  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 2.2),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.02;
  bikeGroup.add(shadowPlane);

  return {
    root: bikeGroup,
    wheels,
    steerPivots,
    headlightMeshes,
    taillightMeshes,
    exhaustPipes,
    underglowMesh,
    bodyMesh: tank,
    riderMesh: riderGroup,
  };
}

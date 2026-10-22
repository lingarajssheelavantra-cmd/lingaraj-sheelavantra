import * as THREE from 'three';
import { VehicleConfig } from '../../types';
import { MaterialPalette } from '../materials';

export interface VehicleMeshBundle {
  root: THREE.Group;
  wheels: THREE.Group[]; // Front-left, Front-right, Rear-left, Rear-right (or Front, Rear for bike)
  steerPivots: THREE.Group[]; // Pivots that rotate with steering
  headlightMeshes: THREE.Mesh[];
  taillightMeshes: THREE.Mesh[];
  exhaustPipes: THREE.Vector3[]; // World positions of exhaust tips for particle emitting
  underglowMesh?: THREE.Mesh;
  bodyMesh: THREE.Mesh;
  riderMesh?: THREE.Group; // For bikes
}

export function createCarMesh(config: VehicleConfig): VehicleMeshBundle {
  MaterialPalette.init();
  const carGroup = new THREE.Group();
  carGroup.name = `car_${config.id}`;

  const primaryCol = new THREE.Color(config.customization.primaryColor);
  const secondaryCol = new THREE.Color(config.customization.secondaryColor);
  const rimCol = new THREE.Color(config.customization.rimColor);
  const neonCol = new THREE.Color(config.customization.neonColor);

  // Paint body material: high gloss automotive clearcoat
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: primaryCol,
    metalness: 0.85,
    roughness: 0.18,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: secondaryCol,
    metalness: 0.5,
    roughness: 0.4,
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: rimCol,
    metalness: 0.9,
    roughness: 0.2,
  });

  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xdbeafe,
    emissiveIntensity: 3.0,
    roughness: 0.1,
  });

  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xff1e1e,
    emissive: 0xef4444,
    emissiveIntensity: 3.5,
    roughness: 0.2,
  });

  // 1. PRIMARY SILHOUETTE: Lower Chassis / Body
  const isAventador = config.id === 'car_lamborghini';
  const isFerrari = config.id === 'car_ferrari';
  const isGTR = config.id === 'car_gtr';
  const isHypercar = config.id === 'car_hypercar';

  const bodyLength = isGTR ? 4.5 : isHypercar ? 4.7 : 4.4;
  const bodyWidth = isGTR ? 1.95 : 2.05;
  const bodyHeight = isGTR ? 0.6 : 0.48;

  // Main chassis base
  const chassisGeom = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyLength);
  const mainBody = new THREE.Mesh(chassisGeom, bodyMat);
  mainBody.position.y = 0.42;
  mainBody.castShadow = true;
  mainBody.receiveShadow = true;
  carGroup.add(mainBody);

  // Wedge front hood / nose
  const noseLength = 1.3;
  const noseGeom = new THREE.BoxGeometry(bodyWidth * 0.92, bodyHeight * 0.7, noseLength);
  const nose = new THREE.Mesh(noseGeom, bodyMat);
  nose.position.set(0, 0.36, bodyLength * 0.32);
  nose.rotation.x = -0.08;
  nose.castShadow = true;
  carGroup.add(nose);

  // Front Splitter / Carbon Chin
  const splitterGeom = new THREE.BoxGeometry(bodyWidth * 1.04, 0.06, 0.5);
  const splitter = new THREE.Mesh(splitterGeom, MaterialPalette.carbonMaterial);
  splitter.position.set(0, 0.18, bodyLength * 0.47);
  splitter.castShadow = true;
  carGroup.add(splitter);

  // 2. SECONDARY READ: Cabin & Glass Canopy
  const cabinLength = isGTR ? 2.1 : 1.7;
  const cabinWidth = isGTR ? 1.55 : 1.45;
  const cabinHeight = isGTR ? 0.68 : 0.55;
  const cabinGeom = new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinLength);
  const cabin = new THREE.Mesh(cabinGeom, MaterialPalette.interiorMaterial);
  cabin.position.set(0, 0.42 + bodyHeight * 0.5 + cabinHeight * 0.45, isGTR ? -0.1 : -0.2);
  cabin.castShadow = true;
  carGroup.add(cabin);

  // Windshield & Glass wrap
  const glassGeom = new THREE.BoxGeometry(cabinWidth * 1.02, cabinHeight * 0.95, cabinLength * 0.96);
  const glass = new THREE.Mesh(glassGeom, MaterialPalette.glassMaterial);
  glass.position.copy(cabin.position);
  carGroup.add(glass);

  // Roof panel
  const roofGeom = new THREE.BoxGeometry(cabinWidth * 0.88, 0.05, cabinLength * 0.65);
  const roof = new THREE.Mesh(roofGeom, isHypercar ? MaterialPalette.carbonMaterial : bodyMat);
  roof.position.set(0, cabin.position.y + cabinHeight * 0.5 + 0.02, cabin.position.z - 0.1);
  roof.castShadow = true;
  carGroup.add(roof);

  // Side Air Scoops / Vents
  const scoopGeom = new THREE.BoxGeometry(0.12, 0.28, 0.8);
  const leftScoop = new THREE.Mesh(scoopGeom, trimMat);
  leftScoop.position.set(-bodyWidth * 0.48, 0.45, -0.2);
  const rightScoop = leftScoop.clone();
  rightScoop.position.x = bodyWidth * 0.48;
  carGroup.add(leftScoop, rightScoop);

  // 3. ACCENT DETAIL: Headlights & Taillights
  const headlightMeshes: THREE.Mesh[] = [];
  const taillightMeshes: THREE.Mesh[] = [];

  // Front lights
  const hlWidth = isAventador ? 0.38 : 0.32;
  const hlGeom = new THREE.BoxGeometry(hlWidth, 0.08, 0.15);
  const leftHL = new THREE.Mesh(hlGeom, headlightMat);
  leftHL.position.set(-bodyWidth * 0.36, 0.42, bodyLength * 0.48);
  leftHL.rotation.y = -0.15;
  const rightHL = new THREE.Mesh(hlGeom, headlightMat);
  rightHL.position.set(bodyWidth * 0.36, 0.42, bodyLength * 0.48);
  rightHL.rotation.y = 0.15;
  carGroup.add(leftHL, rightHL);
  headlightMeshes.push(leftHL, rightHL);

  // Rear lights
  if (isGTR || isFerrari) {
    // Twin circular rear lights
    const tlGeom = new THREE.CylinderGeometry(0.09, 0.09, 0.06, 16);
    tlGeom.rotateX(Math.PI / 2);
    const tl1 = new THREE.Mesh(tlGeom, taillightMat);
    tl1.position.set(-bodyWidth * 0.38, 0.48, -bodyLength * 0.5 - 0.01);
    const tl2 = new THREE.Mesh(tlGeom, taillightMat);
    tl2.position.set(-bodyWidth * 0.22, 0.48, -bodyLength * 0.5 - 0.01);
    const tl3 = new THREE.Mesh(tlGeom, taillightMat);
    tl3.position.set(bodyWidth * 0.22, 0.48, -bodyLength * 0.5 - 0.01);
    const tl4 = new THREE.Mesh(tlGeom, taillightMat);
    tl4.position.set(bodyWidth * 0.38, 0.48, -bodyLength * 0.5 - 0.01);
    carGroup.add(tl1, tl2, tl3, tl4);
    taillightMeshes.push(tl1, tl2, tl3, tl4);
  } else {
    // Sharp horizontal / hex bar rear lights
    const tlGeom = new THREE.BoxGeometry(bodyWidth * 0.36, 0.06, 0.06);
    const tlL = new THREE.Mesh(tlGeom, taillightMat);
    tlL.position.set(-bodyWidth * 0.26, 0.48, -bodyLength * 0.5 - 0.01);
    const tlR = new THREE.Mesh(tlGeom, taillightMat);
    tlR.position.set(bodyWidth * 0.26, 0.48, -bodyLength * 0.5 - 0.01);
    carGroup.add(tlL, tlR);
    taillightMeshes.push(tlL, tlR);
  }

  // Rear Diffuser & Exhaust Tips
  const diffuserGeom = new THREE.BoxGeometry(bodyWidth * 0.9, 0.16, 0.4);
  const diffuser = new THREE.Mesh(diffuserGeom, MaterialPalette.carbonMaterial);
  diffuser.position.set(0, 0.2, -bodyLength * 0.48);
  carGroup.add(diffuser);

  const exhaustPipes: THREE.Vector3[] = [];
  const pipeGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.15, 12);
  pipeGeom.rotateX(Math.PI / 2);
  const exL = new THREE.Mesh(pipeGeom, MaterialPalette.chromeMaterial);
  exL.position.set(-0.25, 0.24, -bodyLength * 0.51);
  const exR = new THREE.Mesh(pipeGeom, MaterialPalette.chromeMaterial);
  exR.position.set(0.25, 0.24, -bodyLength * 0.51);
  carGroup.add(exL, exR);
  exhaustPipes.push(new THREE.Vector3(-0.25, 0.24, -bodyLength * 0.53));
  exhaustPipes.push(new THREE.Vector3(0.25, 0.24, -bodyLength * 0.53));

  // Rear Spoiler
  if (config.customization.spoilerType > 0) {
    const spoilerGroup = new THREE.Group();
    const wingWidth = bodyWidth * 1.05;
    const wingGeom = new THREE.BoxGeometry(wingWidth, 0.04, 0.35);
    const wing = new THREE.Mesh(wingGeom, MaterialPalette.carbonMaterial);
    wing.position.y = 0.35;
    wing.rotation.x = 0.05;
    wing.castShadow = true;

    // Struts
    const strutGeom = new THREE.BoxGeometry(0.04, 0.35, 0.15);
    const strutL = new THREE.Mesh(strutGeom, MaterialPalette.carbonMaterial);
    strutL.position.set(-wingWidth * 0.32, 0.17, 0);
    const strutR = new THREE.Mesh(strutGeom, MaterialPalette.carbonMaterial);
    strutR.position.set(wingWidth * 0.32, 0.17, 0);

    spoilerGroup.add(wing, strutL, strutR);
    spoilerGroup.position.set(0, 0.65, -bodyLength * 0.42);
    carGroup.add(spoilerGroup);
  }

  // 4. WHEELS (4 units)
  const wheelRadius = 0.36;
  const wheelWidth = 0.28;
  const wheelTireGeom = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 24);
  wheelTireGeom.rotateZ(Math.PI / 2);

  const discGeom = new THREE.CylinderGeometry(wheelRadius * 0.72, wheelRadius * 0.72, 0.04, 16);
  discGeom.rotateZ(Math.PI / 2);

  const caliperGeom = new THREE.BoxGeometry(0.08, wheelRadius * 0.45, 0.12);
  const caliperMat = new THREE.MeshStandardMaterial({
    color: isFerrari ? 0xd97706 : 0xef4444,
    metalness: 0.8,
    roughness: 0.2,
  });

  const wheels: THREE.Group[] = [];
  const steerPivots: THREE.Group[] = [];

  const wheelPositions = [
    { x: -bodyWidth * 0.5 - 0.02, y: wheelRadius, z: bodyLength * 0.28, isFront: true }, // FL
    { x: bodyWidth * 0.5 + 0.02, y: wheelRadius, z: bodyLength * 0.28, isFront: true },  // FR
    { x: -bodyWidth * 0.5 - 0.02, y: wheelRadius, z: -bodyLength * 0.28, isFront: false }, // RL
    { x: bodyWidth * 0.5 + 0.02, y: wheelRadius, z: -bodyLength * 0.28, isFront: false },  // RR
  ];

  wheelPositions.forEach((wp) => {
    const steerPivot = new THREE.Group();
    steerPivot.position.set(wp.x, wp.y, wp.z);

    const spinGroup = new THREE.Group();

    // Tire
    const tire = new THREE.Mesh(wheelTireGeom, MaterialPalette.tireMaterial);
    tire.castShadow = true;
    spinGroup.add(tire);

    // Rim
    const rimGeom = new THREE.CylinderGeometry(wheelRadius * 0.82, wheelRadius * 0.82, wheelWidth * 0.92, 12);
    rimGeom.rotateZ(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeom, rimMat);
    spinGroup.add(rim);

    // Brake disc
    const disc = new THREE.Mesh(discGeom, MaterialPalette.brakeDiscMaterial);
    spinGroup.add(disc);

    steerPivot.add(spinGroup);

    // Caliper stays upright (doesn't spin with wheel)
    const caliper = new THREE.Mesh(caliperGeom, caliperMat);
    caliper.position.set(wp.x < 0 ? -wheelWidth * 0.25 : wheelWidth * 0.25, wheelRadius * 0.35, 0);
    steerPivot.add(caliper);

    carGroup.add(steerPivot);

    wheels.push(spinGroup);
    if (wp.isFront) {
      steerPivots.push(steerPivot);
    }
  });

  // 5. UNDERGLOW NEON
  let underglowMesh: THREE.Mesh | undefined;
  if (config.customization.hasNeon) {
    const neonGeom = new THREE.PlaneGeometry(bodyWidth * 0.85, bodyLength * 0.75);
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
    carGroup.add(underglowMesh);
  }

  // 6. CONTACT SHADOW GROUNDING (Radial soft shadow plane)
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext('2d')!;
  const grad = sCtx.createRadialGradient(64, 64, 10, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0,0,0,0.75)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.3)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 128, 128);

  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(bodyWidth * 1.35, bodyLength * 1.2),
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
  carGroup.add(shadowPlane);

  return {
    root: carGroup,
    wheels,
    steerPivots,
    headlightMeshes,
    taillightMeshes,
    exhaustPipes,
    underglowMesh,
    bodyMesh: mainBody,
  };
}

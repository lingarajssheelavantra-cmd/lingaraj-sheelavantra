import * as THREE from 'three';
import { MaterialPalette } from '../materials';

export interface TrafficVehicle {
  mesh: THREE.Group;
  speed: number;
  lane: number;
  progress: number;
  length: number;
  width: number;
}

export function createTrafficCar(type: 'sedan' | 'suv' | 'taxi' | 'van'): THREE.Group {
  MaterialPalette.init();
  const group = new THREE.Group();

  let bodyColor = 0x334155;
  let isTaxi = false;
  let length = 4.2;
  let width = 1.8;
  let height = 0.55;

  if (type === 'taxi') {
    bodyColor = 0xeab308; // Yellow cab
    isTaxi = true;
  } else if (type === 'suv') {
    bodyColor = 0x1e293b;
    height = 0.75;
    width = 1.9;
  } else if (type === 'van') {
    bodyColor = 0xf8fafc;
    height = 0.95;
    length = 4.8;
  }

  const bodyMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.35,
    metalness: 0.7,
  });

  const glassMat = MaterialPalette.glassMaterial;
  const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const tlMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

  // Main body
  const bodyGeom = new THREE.BoxGeometry(width, height, length);
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  body.position.y = height * 0.5 + 0.25;
  body.castShadow = true;
  group.add(body);

  // Cabin
  const cabinGeom = new THREE.BoxGeometry(width * 0.9, height * 0.85, length * 0.55);
  const cabin = new THREE.Mesh(cabinGeom, glassMat);
  cabin.position.set(0, height + 0.25, -length * 0.05);
  group.add(cabin);

  // Roof
  const roofGeom = new THREE.BoxGeometry(width * 0.88, 0.05, length * 0.52);
  const roof = new THREE.Mesh(roofGeom, bodyMat);
  roof.position.set(0, cabin.position.y + height * 0.42, cabin.position.z);
  group.add(roof);

  // Taxi sign
  if (isTaxi) {
    const signGeom = new THREE.BoxGeometry(0.4, 0.12, 0.18);
    const signMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const sign = new THREE.Mesh(signGeom, signMat);
    sign.position.set(0, roof.position.y + 0.1, 0);
    group.add(sign);
  }

  // Headlights
  const hlGeom = new THREE.BoxGeometry(0.24, 0.1, 0.08);
  const hlL = new THREE.Mesh(hlGeom, hlMat);
  hlL.position.set(-width * 0.38, 0.45, length * 0.5 + 0.02);
  const hlR = new THREE.Mesh(hlGeom, hlMat);
  hlR.position.set(width * 0.38, 0.45, length * 0.5 + 0.02);
  group.add(hlL, hlR);

  // Taillights
  const tlGeom = new THREE.BoxGeometry(0.24, 0.1, 0.08);
  const tlL = new THREE.Mesh(tlGeom, tlMat);
  tlL.position.set(-width * 0.38, 0.45, -length * 0.5 - 0.02);
  const tlR = new THREE.Mesh(tlGeom, tlMat);
  tlR.position.set(width * 0.38, 0.45, -length * 0.5 - 0.02);
  group.add(tlL, tlR);

  // Wheels
  const wheelGeom = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12);
  wheelGeom.rotateZ(Math.PI / 2);
  const wheelMat = MaterialPalette.tireMaterial;

  const wFL = new THREE.Mesh(wheelGeom, wheelMat);
  wFL.position.set(-width * 0.5, 0.3, length * 0.3);
  const wFR = new THREE.Mesh(wheelGeom, wheelMat);
  wFR.position.set(width * 0.5, 0.3, length * 0.3);
  const wRL = new THREE.Mesh(wheelGeom, wheelMat);
  wRL.position.set(-width * 0.5, 0.3, -length * 0.3);
  const wRR = new THREE.Mesh(wheelGeom, wheelMat);
  wRR.position.set(width * 0.5, 0.3, -length * 0.3);
  group.add(wFL, wFR, wRL, wRR);

  // Contact shadow
  const shadowGeom = new THREE.PlaneGeometry(width * 1.3, length * 1.2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(shadowGeom, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  return group;
}

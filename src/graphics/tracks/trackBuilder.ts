import * as THREE from 'three';
import { TrackConfig } from '../../types';
import { createAsphaltTexture, createNeonSignTexture } from '../materials';

export interface BuiltTrack {
  curve: THREE.CatmullRomCurve3;
  trackGroup: THREE.Group;
  roadMesh: THREE.Mesh;
  startPosition: THREE.Vector3;
  startRotation: number;
  totalLength: number;
  getPointAt: (t: number) => THREE.Vector3;
  getTangentAt: (t: number) => THREE.Vector3;
  getTrackWidth: () => number;
}

export function buildTrack(trackConfig: TrackConfig): BuiltTrack {
  const trackGroup = new THREE.Group();
  trackGroup.name = `track_${trackConfig.id}`;

  // 1. GENERATE TRACK SPLINE CONTROL POINTS
  const points: THREE.Vector3[] = [];
  const radius = 280;

  if (trackConfig.id === 'tokyo_neon') {
    // City expressway circuit with long straights and 90-degree urban sweepers
    points.push(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 350),
      new THREE.Vector3(80, 5, 480),
      new THREE.Vector3(260, 10, 540),
      new THREE.Vector3(420, 8, 480),
      new THREE.Vector3(480, 0, 200),
      new THREE.Vector3(460, 0, -150),
      new THREE.Vector3(340, 12, -320), // elevated overpass
      new THREE.Vector3(180, 12, -360),
      new THREE.Vector3(40, 5, -280),
      new THREE.Vector3(-120, 0, -180),
      new THREE.Vector3(-150, 0, 80),
      new THREE.Vector3(-80, 0, 220),
      new THREE.Vector3(0, 0, 0)
    );
  } else if (trackConfig.id === 'sunset_coastal') {
    // Coastal highway with ocean views, bridge and tunnel
    points.push(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(50, 0, 320),
      new THREE.Vector3(180, 8, 520),
      new THREE.Vector3(380, 15, 600), // suspension bridge
      new THREE.Vector3(580, 15, 520),
      new THREE.Vector3(680, 4, 300),
      new THREE.Vector3(620, -5, 0), // coastal curve
      new THREE.Vector3(450, -8, -250),
      new THREE.Vector3(200, 2, -380),
      new THREE.Vector3(-50, 6, -300),
      new THREE.Vector3(-140, 0, -100),
      new THREE.Vector3(0, 0, 0)
    );
  } else if (trackConfig.id === 'desert_canyon') {
    // Canyon GP with technical S-curves and canyon walls
    points.push(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(20, 0, 300),
      new THREE.Vector3(140, 4, 450),
      new THREE.Vector3(30, 8, 620), // hairpin left
      new THREE.Vector3(-120, 14, 520),
      new THREE.Vector3(-240, 18, 350),
      new THREE.Vector3(-180, 12, 100),
      new THREE.Vector3(-280, 6, -120), // canyon chicane
      new THREE.Vector3(-150, 2, -320),
      new THREE.Vector3(80, 0, -350),
      new THREE.Vector3(220, 0, -180),
      new THREE.Vector3(120, 0, 50),
      new THREE.Vector3(0, 0, 0)
    );
  } else {
    // Mountain Pass / Akina Touge: technical mountain hairpins
    points.push(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-20, 2, 280),
      new THREE.Vector3(120, 6, 420),
      new THREE.Vector3(240, 10, 340), // hairpin 1
      new THREE.Vector3(110, 14, 210),
      new THREE.Vector3(190, 18, 60),  // hairpin 2
      new THREE.Vector3(70, 22, -120),
      new THREE.Vector3(-90, 25, -240),
      new THREE.Vector3(-220, 20, -160),
      new THREE.Vector3(-180, 12, 40),
      new THREE.Vector3(-110, 4, 180),
      new THREE.Vector3(0, 0, 0)
    );
  }

  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);
  const totalLength = curve.getLength();
  const roadWidth = 14; // Wide 3-4 lane track

  // 2. BUILD ROAD RIBBON GEOMETRY
  const segments = 600;
  const roadGeom = new THREE.BufferGeometry();
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const asphaltTex = createAsphaltTexture();
  asphaltTex.repeat.set(1, segments / 8);

  const roadMat = new THREE.MeshStandardMaterial({
    map: asphaltTex,
    roughness: trackConfig.weather === 'wet' ? 0.2 : 0.75,
    metalness: trackConfig.weather === 'wet' ? 0.35 : 0.05,
    side: THREE.DoubleSide,
  });

  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const pt = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const binormal = new THREE.Vector3().crossVectors(up, tangent).normalize();

    // Left vertex
    const leftPt = pt.clone().add(binormal.clone().multiplyScalar(roadWidth * 0.5));
    // Right vertex
    const rightPt = pt.clone().add(binormal.clone().multiplyScalar(-roadWidth * 0.5));

    positions.push(leftPt.x, leftPt.y + 0.05, leftPt.z);
    positions.push(rightPt.x, rightPt.y + 0.05, rightPt.z);

    normals.push(0, 1, 0, 0, 1, 0);

    uvs.push(0, t * (segments / 8));
    uvs.push(1, t * (segments / 8));

    if (i < segments) {
      const v0 = i * 2;
      const v1 = i * 2 + 1;
      const v2 = (i + 1) * 2;
      const v3 = (i + 1) * 2 + 1;

      indices.push(v0, v2, v1);
      indices.push(v1, v2, v3);
    }
  }

  roadGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  roadGeom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  roadGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  roadGeom.setIndex(indices);
  roadGeom.computeVertexNormals();

  const roadMesh = new THREE.Mesh(roadGeom, roadMat);
  roadMesh.receiveShadow = true;
  trackGroup.add(roadMesh);

  // 3. GUARDRAILS / SIDE BARRIERS & KERBS
  const barrierMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.8,
    roughness: 0.3,
  });
  const kerbRedMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.6 });
  const kerbWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });

  // Add guardrails along track edges
  const railPositions: number[] = [];
  const railNormals: number[] = [];
  const railIndices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const pt = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const binormal = new THREE.Vector3().crossVectors(up, tangent).normalize();

    const leftBottom = pt.clone().add(binormal.clone().multiplyScalar(roadWidth * 0.5 + 0.2));
    const leftTop = leftBottom.clone().add(new THREE.Vector3(0, 0.85, 0));

    railPositions.push(leftBottom.x, leftBottom.y, leftBottom.z);
    railPositions.push(leftTop.x, leftTop.y, leftTop.z);
    railNormals.push(-binormal.x, 0, -binormal.z, -binormal.x, 0, -binormal.z);

    if (i < segments) {
      const v0 = i * 2;
      const v1 = i * 2 + 1;
      const v2 = (i + 1) * 2;
      const v3 = (i + 1) * 2 + 1;
      railIndices.push(v0, v1, v2);
      railIndices.push(v2, v1, v3);
    }
  }

  const railGeom = new THREE.BufferGeometry();
  railGeom.setAttribute('position', new THREE.Float32BufferAttribute(railPositions, 3));
  railGeom.setAttribute('normal', new THREE.Float32BufferAttribute(railNormals, 3));
  railGeom.setIndex(railIndices);
  const leftRail = new THREE.Mesh(railGeom, barrierMat);
  leftRail.castShadow = true;
  trackGroup.add(leftRail);

  // Right guardrail
  const rightRailPositions: number[] = [];
  const rightRailNormals: number[] = [];
  const rightRailIndices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const pt = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const binormal = new THREE.Vector3().crossVectors(up, tangent).normalize();

    const rBottom = pt.clone().add(binormal.clone().multiplyScalar(-roadWidth * 0.5 - 0.2));
    const rTop = rBottom.clone().add(new THREE.Vector3(0, 0.85, 0));

    rightRailPositions.push(rBottom.x, rBottom.y, rBottom.z);
    rightRailPositions.push(rTop.x, rTop.y, rTop.z);
    rightRailNormals.push(binormal.x, 0, binormal.z, binormal.x, 0, binormal.z);

    if (i < segments) {
      const v0 = i * 2;
      const v1 = i * 2 + 1;
      const v2 = (i + 1) * 2;
      const v3 = (i + 1) * 2 + 1;
      rightRailIndices.push(v0, v2, v1);
      rightRailIndices.push(v1, v2, v3);
    }
  }

  const rightRailGeom = new THREE.BufferGeometry();
  rightRailGeom.setAttribute('position', new THREE.Float32BufferAttribute(rightRailPositions, 3));
  rightRailGeom.setAttribute('normal', new THREE.Float32BufferAttribute(rightRailNormals, 3));
  rightRailGeom.setIndex(rightRailIndices);
  const rightRail = new THREE.Mesh(rightRailGeom, barrierMat);
  rightRail.castShadow = true;
  trackGroup.add(rightRail);

  // 4. FINISH LINE GANTRY
  const startPt = curve.getPointAt(0);
  const startTan = curve.getTangentAt(0).normalize();
  const startBin = new THREE.Vector3().crossVectors(up, startTan).normalize();
  const startAngle = Math.atan2(startTan.x, startTan.z);

  const gantryGroup = new THREE.Group();
  gantryGroup.position.copy(startPt);
  gantryGroup.rotation.y = startAngle;

  // Steel Pillars
  const pillarGeom = new THREE.BoxGeometry(0.8, 8, 0.8);
  const pillarL = new THREE.Mesh(pillarGeom, barrierMat);
  pillarL.position.set(-roadWidth * 0.55, 4, 0);
  const pillarR = new THREE.Mesh(pillarGeom, barrierMat);
  pillarR.position.set(roadWidth * 0.55, 4, 0);
  gantryGroup.add(pillarL, pillarR);

  // Overhead Truss
  const trussGeom = new THREE.BoxGeometry(roadWidth * 1.25, 1.4, 1.2);
  const truss = new THREE.Mesh(trussGeom, barrierMat);
  truss.position.set(0, 7.5, 0);
  gantryGroup.add(truss);

  // Finish banner
  const bannerSign = createNeonSignTexture('STREET LEGENDS', '#00f0ff');
  const bannerMat = new THREE.MeshBasicMaterial({ map: bannerSign, side: THREE.DoubleSide });
  const bannerMesh = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth * 0.9, 1.2), bannerMat);
  bannerMesh.position.set(0, 7.5, 0.65);
  gantryGroup.add(bannerMesh);

  // Checkered Start line on asphalt
  const lineGeom = new THREE.PlaneGeometry(roadWidth * 0.98, 2.5);
  const lineCanvas = document.createElement('canvas');
  lineCanvas.width = 128; lineCanvas.height = 32;
  const lCtx = lineCanvas.getContext('2d')!;
  for (let x = 0; x < 128; x += 16) {
    for (let y = 0; y < 32; y += 16) {
      lCtx.fillStyle = (x / 16 + y / 16) % 2 === 0 ? '#ffffff' : '#111827';
      lCtx.fillRect(x, y, 16, 16);
    }
  }
  const lineTex = new THREE.CanvasTexture(lineCanvas);
  lineTex.colorSpace = THREE.SRGBColorSpace;
  const lineMat = new THREE.MeshBasicMaterial({ map: lineTex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const checkLine = new THREE.Mesh(lineGeom, lineMat);
  checkLine.rotation.x = -Math.PI / 2;
  checkLine.position.set(0, 0.08, 0);
  gantryGroup.add(checkLine);

  trackGroup.add(gantryGroup);

  // 5. ENVIRONMENT SPECIFIC SCENERY
  const sceneryGroup = new THREE.Group();

  if (trackConfig.environment === 'neon_night') {
    // Shinjuku skyscrapers & neon signs
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.8,
    });

    const neonColors = ['#06b6d4', '#ec4899', '#8b5cf6', '#eab308', '#10b981'];
    const neonNames = ['NEO TOKYO', 'CYBER DRIVE', 'APEX NITRO', 'TURBO 12', 'SUPERBIKE GP', 'DRIFT KING', 'R35 TUNING', 'MIDNIGHT CLUB'];

    // Generate clusters of tall skyscrapers along track periphery
    for (let i = 0; i < 45; i++) {
      const t = (i * 0.022 + 0.01) % 1;
      const pt = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t).normalize();
      const binormal = new THREE.Vector3().crossVectors(up, tangent).normalize();

      const side = (i % 2 === 0 ? 1 : -1);
      const dist = 24 + (i % 5) * 14;
      const bPos = pt.clone().add(binormal.clone().multiplyScalar(side * dist));

      const bWidth = 20 + Math.random() * 25;
      const bDepth = 20 + Math.random() * 25;
      const bHeight = 60 + Math.random() * 140;

      const bGeom = new THREE.BoxGeometry(bWidth, bHeight, bDepth);
      const bMesh = new THREE.Mesh(bGeom, buildingMat);
      bMesh.position.set(bPos.x, bPos.y + bHeight * 0.5 - 5, bPos.z);
      bMesh.castShadow = true;
      sceneryGroup.add(bMesh);

      // Neon sign on skyscraper facade
      if (i % 2 === 0) {
        const signText = neonNames[i % neonNames.length];
        const signCol = neonColors[i % neonColors.length];
        const signTex = createNeonSignTexture(signText, signCol);
        const signPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(16, 4.5),
          new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide })
        );
        signPlane.position.set(bPos.x - side * (bWidth * 0.52), bPos.y + bHeight * 0.4, bPos.z);
        signPlane.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        sceneryGroup.add(signPlane);
      }
    }

    // Street light arches over the highway
    for (let i = 0; i < 30; i++) {
      const t = i / 30;
      const pt = curve.getPointAt(t);
      const tan = curve.getTangentAt(t).normalize();
      const bin = new THREE.Vector3().crossVectors(up, tan).normalize();
      const angle = Math.atan2(tan.x, tan.z);

      const lampPillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 6, 8), barrierMat);
      lampPillarL.position.copy(pt).add(bin.clone().multiplyScalar(roadWidth * 0.5 + 0.8));
      lampPillarL.position.y += 3;

      const lampHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      lampHead.position.set(0, 3, 0);
      lampPillarL.add(lampHead);
      sceneryGroup.add(lampPillarL);
    }
  } else if (trackConfig.environment === 'sunset') {
    // Pacific Coastal highway: Ocean plane, palm trees, mountain cliff rocks
    const oceanGeom = new THREE.PlaneGeometry(2400, 2400);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0c4a6e,
      roughness: 0.1,
      metalness: 0.85,
    });
    const ocean = new THREE.Mesh(oceanGeom, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -18;
    sceneryGroup.add(ocean);

    // Palm trees
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });

    for (let i = 0; i < 50; i++) {
      const t = i / 50;
      const pt = curve.getPointAt(t);
      const tan = curve.getTangentAt(t).normalize();
      const bin = new THREE.Vector3().crossVectors(up, tan).normalize();

      const side = (i % 2 === 0 ? 1 : -1);
      const treePos = pt.clone().add(bin.clone().multiplyScalar(side * (roadWidth * 0.5 + 4 + Math.random() * 8)));

      const tree = new THREE.Group();
      tree.position.copy(treePos);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 7, 8), trunkMat);
      trunk.position.y = 3.5;
      trunk.rotation.z = (Math.random() - 0.5) * 0.15;
      tree.add(trunk);

      for (let j = 0; j < 6; j++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.4, 4.5, 4), leavesMat);
        leaf.position.set(0, 7.2, 0);
        leaf.rotation.z = 0.9;
        leaf.rotation.y = (j / 6) * Math.PI * 2;
        tree.add(leaf);
      }
      sceneryGroup.add(tree);
    }
  } else if (trackConfig.environment === 'desert') {
    // Red rock canyon monoliths
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x9a3412,
      roughness: 0.9,
      metalness: 0.1,
    });

    for (let i = 0; i < 35; i++) {
      const t = i / 35;
      const pt = curve.getPointAt(t);
      const tan = curve.getTangentAt(t).normalize();
      const bin = new THREE.Vector3().crossVectors(up, tan).normalize();

      const side = (i % 2 === 0 ? 1 : -1);
      const rockPos = pt.clone().add(bin.clone().multiplyScalar(side * (roadWidth * 0.5 + 15 + Math.random() * 20)));

      const rockRadius = 15 + Math.random() * 22;
      const rockHeight = 25 + Math.random() * 50;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rockRadius, 1), rockMat);
      rock.scale.set(1.0, rockHeight / rockRadius, 1.2);
      rock.position.set(rockPos.x, rockPos.y + rockHeight * 0.4, rockPos.z);
      rock.castShadow = true;
      sceneryGroup.add(rock);
    }
  } else {
    // Mountain Pass: Pine trees and cliffs
    const pineTrunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const pineNeedleMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.7 });

    for (let i = 0; i < 60; i++) {
      const t = i / 60;
      const pt = curve.getPointAt(t);
      const tan = curve.getTangentAt(t).normalize();
      const bin = new THREE.Vector3().crossVectors(up, tan).normalize();

      const side = (i % 2 === 0 ? 1 : -1);
      const pPos = pt.clone().add(bin.clone().multiplyScalar(side * (roadWidth * 0.5 + 4 + Math.random() * 12)));

      const pine = new THREE.Group();
      pine.position.copy(pPos);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 9, 8), pineTrunkMat);
      trunk.position.y = 4.5;
      pine.add(trunk);

      for (let l = 0; l < 3; l++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(2.5 - l * 0.6, 3.5, 7), pineNeedleMat);
        cone.position.y = 5.5 + l * 2.2;
        cone.castShadow = true;
        pine.add(cone);
      }
      sceneryGroup.add(pine);
    }
  }

  // Large Ground plane under the track
  const terrainMat = new THREE.MeshStandardMaterial({
    color: trackConfig.ambientColor,
    roughness: 0.95,
    metalness: 0.1,
  });
  const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(2800, 2800), terrainMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = -0.15;
  groundMesh.receiveShadow = true;
  sceneryGroup.add(groundMesh);

  trackGroup.add(sceneryGroup);

  return {
    curve,
    trackGroup,
    roadMesh,
    startPosition: startPt.clone().add(new THREE.Vector3(0, 0.4, 0)),
    startRotation: startAngle,
    totalLength,
    getPointAt: (t: number) => curve.getPointAt(((t % 1) + 1) % 1),
    getTangentAt: (t: number) => curve.getTangentAt(((t % 1) + 1) % 1),
    getTrackWidth: () => roadWidth,
  };
}

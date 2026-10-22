import * as THREE from 'three';

export interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
  opacity: number;
}

export class ParticleSystem {
  public particlesGroup: THREE.Group;
  private tireSmokeParticles: Particle[] = [];
  private flameParticles: Particle[] = [];
  private smokePoints: THREE.Points;
  private flamePoints: THREE.Points;
  private rainPoints?: THREE.Points;

  private smokeGeom: THREE.BufferGeometry;
  private flameGeom: THREE.BufferGeometry;
  private rainGeom?: THREE.BufferGeometry;

  private maxSmoke = 300;
  private maxFlame = 200;
  private maxRain = 1500;

  constructor(isWetWeather: boolean = false) {
    this.particlesGroup = new THREE.Group();
    this.particlesGroup.name = 'particle_system';

    // 1. TIRE SMOKE
    this.smokeGeom = new THREE.BufferGeometry();
    const smokePos = new Float32Array(this.maxSmoke * 3);
    const smokeCol = new Float32Array(this.maxSmoke * 3);
    this.smokeGeom.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
    this.smokeGeom.setAttribute('color', new THREE.BufferAttribute(smokeCol, 3));

    const smokeMat = new THREE.PointsMaterial({
      size: 1.8,
      transparent: true,
      opacity: 0.45,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    this.smokePoints = new THREE.Points(this.smokeGeom, smokeMat);
    this.particlesGroup.add(this.smokePoints);

    // 2. EXHAUST FLAME / NITRO FIRE
    this.flameGeom = new THREE.BufferGeometry();
    const flamePos = new Float32Array(this.maxFlame * 3);
    const flameCol = new Float32Array(this.maxFlame * 3);
    this.flameGeom.setAttribute('position', new THREE.BufferAttribute(flamePos, 3));
    this.flameGeom.setAttribute('color', new THREE.BufferAttribute(flameCol, 3));

    const flameMat = new THREE.PointsMaterial({
      size: 1.2,
      transparent: true,
      opacity: 0.85,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.flamePoints = new THREE.Points(this.flameGeom, flameMat);
    this.particlesGroup.add(this.flamePoints);

    // 3. WET RAIN PARTICLES
    if (isWetWeather) {
      this.rainGeom = new THREE.BufferGeometry();
      const rainPos = new Float32Array(this.maxRain * 3);
      for (let i = 0; i < this.maxRain; i++) {
        rainPos[i * 3] = (Math.random() - 0.5) * 120;
        rainPos[i * 3 + 1] = Math.random() * 50;
        rainPos[i * 3 + 2] = (Math.random() - 0.5) * 120;
      }
      this.rainGeom.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));

      const rainMat = new THREE.PointsMaterial({
        color: 0x93c5fd,
        size: 0.35,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      });
      this.rainPoints = new THREE.Points(this.rainGeom, rainMat);
      this.particlesGroup.add(this.rainPoints);
    }
  }

  public emitSmoke(pos: THREE.Vector3, vel: THREE.Vector3) {
    if (this.tireSmokeParticles.length >= this.maxSmoke) return;
    this.tireSmokeParticles.push({
      position: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.1, (Math.random() - 0.5) * 0.3)),
      velocity: vel.clone().multiplyScalar(0.2).add(new THREE.Vector3(0, 0.8 + Math.random() * 0.8, 0)),
      color: new THREE.Color(0xd4d4d8),
      size: 1.2 + Math.random() * 0.8,
      life: 0,
      maxLife: 0.5 + Math.random() * 0.4,
      opacity: 0.5,
    });
  }

  public emitExhaustFlame(pos: THREE.Vector3, dir: THREE.Vector3, colorHex: string) {
    if (this.flameParticles.length >= this.maxFlame) return;
    const flameCol = new THREE.Color(colorHex);
    this.flameParticles.push({
      position: pos.clone(),
      velocity: dir.clone().multiplyScalar(-12 - Math.random() * 8).add(new THREE.Vector3((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5)),
      color: flameCol,
      size: 0.8 + Math.random() * 0.6,
      life: 0,
      maxLife: 0.12 + Math.random() * 0.08,
      opacity: 0.9,
    });
  }

  public update(delta: number, cameraPos: THREE.Vector3) {
    // 1. Update Tire Smoke
    const smokePosAttr = this.smokeGeom.getAttribute('position') as THREE.BufferAttribute;
    const smokeColAttr = this.smokeGeom.getAttribute('color') as THREE.BufferAttribute;

    for (let i = this.tireSmokeParticles.length - 1; i >= 0; i--) {
      const p = this.tireSmokeParticles[i];
      p.life += delta;
      if (p.life >= p.maxLife) {
        this.tireSmokeParticles.splice(i, 1);
        continue;
      }
      p.position.addScaledVector(p.velocity, delta);
      p.size += delta * 1.8;

      smokePosAttr.setXYZ(i, p.position.x, p.position.y, p.position.z);
      const alpha = 1 - p.life / p.maxLife;
      smokeColAttr.setXYZ(i, 0.85 * alpha, 0.85 * alpha, 0.88 * alpha);
    }
    // Clear remaining
    for (let i = this.tireSmokeParticles.length; i < this.maxSmoke; i++) {
      smokePosAttr.setXYZ(i, 0, -9999, 0);
    }
    smokePosAttr.needsUpdate = true;
    smokeColAttr.needsUpdate = true;

    // 2. Update Exhaust Flames
    const flamePosAttr = this.flameGeom.getAttribute('position') as THREE.BufferAttribute;
    const flameColAttr = this.flameGeom.getAttribute('color') as THREE.BufferAttribute;

    for (let i = this.flameParticles.length - 1; i >= 0; i--) {
      const p = this.flameParticles[i];
      p.life += delta;
      if (p.life >= p.maxLife) {
        this.flameParticles.splice(i, 1);
        continue;
      }
      p.position.addScaledVector(p.velocity, delta);

      flamePosAttr.setXYZ(i, p.position.x, p.position.y, p.position.z);
      const bright = 1 - p.life / p.maxLife;
      flameColAttr.setXYZ(i, p.color.r * bright, p.color.g * bright, p.color.b * bright);
    }
    for (let i = this.flameParticles.length; i < this.maxFlame; i++) {
      flamePosAttr.setXYZ(i, 0, -9999, 0);
    }
    flamePosAttr.needsUpdate = true;
    flameColAttr.needsUpdate = true;

    // 3. Update Rain relative to camera
    if (this.rainPoints && this.rainGeom) {
      const posAttr = this.rainGeom.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < this.maxRain; i++) {
        let y = posAttr.getY(i) - delta * 45;
        let x = posAttr.getX(i);
        let z = posAttr.getZ(i);

        if (y < 0) {
          y = 50 + Math.random() * 10;
          x = cameraPos.x + (Math.random() - 0.5) * 120;
          z = cameraPos.z + (Math.random() - 0.5) * 120;
        }
        posAttr.setXYZ(i, x, y, z);
      }
      posAttr.needsUpdate = true;
    }
  }

  public dispose() {
    this.smokeGeom.dispose();
    this.flameGeom.dispose();
    this.rainGeom?.dispose();
  }
}

import * as THREE from 'three';

// Procedural Canvas Textures
export function createAsphaltTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base dark asphalt
  ctx.fillStyle = '#1c1f24';
  ctx.fillRect(0, 0, 512, 512);

  // Asphalt grain noise
  for (let i = 0; i < 25000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const gray = Math.floor(25 + Math.random() * 40);
    ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  // Road lane markings
  // Outer solid lines
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(16, 0, 8, 512);
  ctx.fillRect(512 - 24, 0, 8, 512);

  // Center dashed lane lines
  ctx.fillStyle = '#fbbf24'; // Yellow center dashes
  for (let y = 0; y < 512; y += 64) {
    ctx.fillRect(256 - 4, y + 10, 8, 36);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 20);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createCarbonFiberTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#111317';
  ctx.fillRect(0, 0, 64, 64);

  ctx.fillStyle = '#1e232b';
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(32, 0); ctx.lineTo(16, 32); ctx.lineTo(0, 32); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(32, 32); ctx.lineTo(64, 32); ctx.lineTo(48, 64); ctx.lineTo(32, 64); ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createNeonSignTexture(text: string, color: string, bg: string = '#050510'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 500, 116);

  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 256, 64);
  ctx.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createTireTreadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#121214';
  ctx.fillRect(0, 0, 128, 256);

  ctx.fillStyle = '#222328';
  for (let y = 0; y < 256; y += 16) {
    ctx.fillRect(10, y, 48, 6);
    ctx.fillRect(70, y + 8, 48, 6);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 10);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Materials generator cache
export class MaterialPalette {
  public static tireMaterial: THREE.MeshStandardMaterial;
  public static brakeDiscMaterial: THREE.MeshStandardMaterial;
  public static chromeMaterial: THREE.MeshStandardMaterial;
  public static glassMaterial: THREE.MeshPhysicalMaterial;
  public static interiorMaterial: THREE.MeshStandardMaterial;
  public static carbonMaterial: THREE.MeshStandardMaterial;

  public static init() {
    if (this.tireMaterial) return;

    this.tireMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.85,
      metalness: 0.1,
      map: createTireTreadTexture(),
    });

    this.brakeDiscMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      roughness: 0.3,
      metalness: 0.9,
    });

    this.chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.1,
      metalness: 0.95,
    });

    this.glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.05,
      metalness: 0.1,
      transparent: true,
      opacity: 0.65,
    });

    this.interiorMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.7,
      metalness: 0.2,
    });

    this.carbonMaterial = new THREE.MeshStandardMaterial({
      color: 0x111317,
      roughness: 0.4,
      metalness: 0.6,
      map: createCarbonFiberTexture(),
    });
  }
}

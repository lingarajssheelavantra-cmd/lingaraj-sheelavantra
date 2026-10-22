import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { VehicleConfig, TrackConfig, GameMode, CameraView, RaceParticipant } from '../types';
import { VEHICLE_CATALOG } from '../data/vehicles';
import { createCarMesh } from '../graphics/models/carModels';
import { createBikeMesh } from '../graphics/models/bikeModels';
import { createTrafficCar, TrafficVehicle } from '../graphics/models/trafficModels';
import { buildTrack, BuiltTrack } from '../graphics/tracks/trackBuilder';
import { VehiclePhysics, VehicleInput } from '../physics/vehiclePhysics';
import { AIDriver } from '../physics/aiDriver';
import { ParticleSystem } from '../graphics/effects/particleSystem';
import { soundEngine } from '../audio/soundEngine';

export interface GameEngineCallbacks {
  onRaceUpdate: (data: {
    speedKmH: number;
    gear: number;
    rpm: number;
    nitroLevel: number;
    currentLap: number;
    totalLaps: number;
    position: number;
    totalRacers: number;
    lapTime: number;
    bestLapTime: number;
    score: { drift: number; wheelie: number; nearMiss: number };
    notification: string | null;
  }) => void;
  onRaceFinish: (results: {
    position: number;
    timeMs: number;
    creditsEarned: number;
    driftScore: number;
    wheelieScore: number;
  }) => void;
  onCountdownTick: (count: number | 'GO') => void;
}

export class GameEngine {
  private container: HTMLDivElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private frameId: number = 0;
  private isSoftwareGl: boolean = false;

  public trackConfig: TrackConfig;
  public playerVehicleConfig: VehicleConfig;
  public gameMode: GameMode;
  public cameraView: CameraView = 'chase';

  private builtTrack!: BuiltTrack;
  private playerPhysics!: VehiclePhysics;
  private aiDrivers: AIDriver[] = [];
  private trafficVehicles: TrafficVehicle[] = [];
  private particleSystem!: ParticleSystem;

  // Race state
  public isPaused: boolean = false;
  public isRaceStarted: boolean = false;
  public isRaceFinished: boolean = false;
  private countdown: number = 4; // 3, 2, 1, GO
  private countdownTimer: number = 0;
  private raceStartTime: number = 0;
  private currentLapStartTime: number = 0;
  private bestLapTime: number = 0;
  private notificationMessage: string | null = null;
  private notificationTimer: number = 0;

  private callbacks: GameEngineCallbacks;

  // Keyboard state
  private keys: Record<string, boolean> = {};
  // Virtual touch input override
  public touchInput: Partial<VehicleInput> = {};

  constructor(
    container: HTMLDivElement,
    trackConfig: TrackConfig,
    playerVehicleConfig: VehicleConfig,
    gameMode: GameMode,
    callbacks: GameEngineCallbacks
  ) {
    this.container = container;
    this.trackConfig = trackConfig;
    this.playerVehicleConfig = playerVehicleConfig;
    this.gameMode = gameMode;
    this.callbacks = callbacks;

    this.initRenderer();
    this.setupScene();
    this.setupLighting();
    this.setupTrackAndRacers();
    this.setupEventListeners();
    this.startLoop();
  }

  private initRenderer() {
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);

    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      65,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1400
    );
  }

  private setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.trackConfig.fogColor);
    this.scene.fog = new THREE.FogExp2(this.trackConfig.fogColor, 0.0022);

    // Studio Environment map per Three.js guidelines
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();
  }

  private setupLighting() {
    // Hemisphere fill light
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, this.trackConfig.ambientColor, 0.85);
    this.scene.add(hemiLight);

    // Key directional sun/moon light
    const keyLight = new THREE.DirectionalLight(
      this.trackConfig.environment === 'sunset' ? 0xffedd5 : 0xffffff,
      this.trackConfig.environment === 'sunset' ? 1.8 : 1.3
    );
    keyLight.position.set(120, 180, 100);
    if (!this.isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 2048;
      keyLight.shadow.mapSize.height = 2048;
      keyLight.shadow.camera.near = 10;
      keyLight.shadow.camera.far = 400;
      const d = 60;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(keyLight);
  }

  private setupTrackAndRacers() {
    // 1. Build procedural track
    this.builtTrack = buildTrack(this.trackConfig);
    this.scene.add(this.builtTrack.trackGroup);

    // 2. Particle System
    this.particleSystem = new ParticleSystem(this.trackConfig.weather === 'wet');
    this.scene.add(this.particleSystem.particlesGroup);

    // 3. Build Player Vehicle
    const isBike = this.playerVehicleConfig.type === 'bike';
    const playerMeshBundle = isBike
      ? createBikeMesh(this.playerVehicleConfig)
      : createCarMesh(this.playerVehicleConfig);
    this.scene.add(playerMeshBundle.root);

    // Position player slightly back on grid
    this.playerPhysics = new VehiclePhysics(
      this.playerVehicleConfig,
      playerMeshBundle,
      this.builtTrack,
      0.002, // Just behind start line
      -2.5, // Left lane
      true
    );

    soundEngine.setVehicleType(this.playerVehicleConfig.type);

    // 4. Build AI Opponents
    if (this.gameMode !== 'free_roam' && this.gameMode !== 'drag_race') {
      const opponentConfigs = this.getOpponentConfigs();
      opponentConfigs.forEach((oppConfig, idx) => {
        const oppMeshBundle = oppConfig.type === 'bike'
          ? createBikeMesh(oppConfig)
          : createCarMesh(oppConfig);
        this.scene.add(oppMeshBundle.root);

        const lane = (idx % 2 === 0 ? 2.5 : -2.5);
        const progressOffset = 0.005 + idx * 0.006;
        const oppPhysics = new VehiclePhysics(
          oppConfig,
          oppMeshBundle,
          this.builtTrack,
          progressOffset,
          lane,
          false
        );

        const driver = new AIDriver(oppPhysics, {
          name: oppConfig.name,
          aggression: 0.9 + Math.random() * 0.3,
          skill: 0.9 + Math.random() * 0.2,
          lanePreference: lane,
          nitroTimer: 2.0 + Math.random() * 4.0,
        });

        this.aiDrivers.push(driver);
      });
    }

    // 5. Build Highway Traffic (for traffic challenge & free roam)
    if (this.gameMode === 'traffic_challenge' || this.gameMode === 'free_roam') {
      const trafficTypes: Array<'sedan' | 'suv' | 'taxi' | 'van'> = ['sedan', 'suv', 'taxi', 'van'];
      for (let i = 0; i < 18; i++) {
        const type = trafficTypes[i % trafficTypes.length];
        const carMesh = createTrafficCar(type);
        this.scene.add(carMesh);

        const progress = 0.05 + (i / 18) * 0.9;
        const lane = (i % 3 === 0 ? -4 : i % 3 === 1 ? 0 : 4);
        const pt = this.builtTrack.getPointAt(progress);
        const tan = this.builtTrack.getTangentAt(progress).normalize();
        const bin = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tan).normalize();

        const pos = pt.clone().add(bin.multiplyScalar(lane));
        carMesh.position.copy(pos);
        carMesh.rotation.y = Math.atan2(tan.x, tan.z);

        this.trafficVehicles.push({
          mesh: carMesh,
          speed: 60 + Math.random() * 40, // 60-100 km/h cruising traffic
          lane,
          progress,
          length: type === 'van' ? 4.8 : 4.2,
          width: 1.8,
        });
      }
    }
  }

  private getOpponentConfigs(): VehicleConfig[] {
    const list = VEHICLE_CATALOG.filter(v => v.id !== this.playerVehicleConfig.id);
    if (this.gameMode === 'car_vs_bike') {
      // Pick balanced mix of cars and bikes
      const cars = list.filter(v => v.type === 'car');
      const bikes = list.filter(v => v.type === 'bike');
      return [cars[0], bikes[0], cars[1], bikes[1]].filter(Boolean);
    } else if (this.gameMode === 'superbike_championship') {
      return list.filter(v => v.type === 'bike').slice(0, 3);
    } else if (this.gameMode === 'supercar_championship') {
      return list.filter(v => v.type === 'car').slice(0, 3);
    } else {
      return list.slice(0, 3);
    }
  }

  private setupEventListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('resize', this.handleResize);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    soundEngine.init();
    this.keys[e.key.toLowerCase()] = true;
    this.keys[e.code] = true;

    if (e.key === 'c' || e.key === 'C') {
      this.toggleCamera();
    }
    if (e.key === 'r' || e.key === 'R') {
      this.resetPlayerToTrack();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = false;
    this.keys[e.code] = false;
  };

  public toggleCamera() {
    if (this.cameraView === 'chase') this.cameraView = 'cockpit';
    else if (this.cameraView === 'cockpit') this.cameraView = 'hood';
    else if (this.cameraView === 'hood') this.cameraView = 'cinematic';
    else this.cameraView = 'chase';
  }

  public setCameraView(view: CameraView) {
    this.cameraView = view;
  }

  public resetPlayerToTrack() {
    const pt = this.builtTrack.getPointAt(this.playerPhysics.state.trackT);
    const tan = this.builtTrack.getTangentAt(this.playerPhysics.state.trackT).normalize();
    this.playerPhysics.state.position.copy(pt).add(new THREE.Vector3(0, 0.4, 0));
    this.playerPhysics.state.velocity.set(0, 0, 0);
    this.playerPhysics.state.rotationY = Math.atan2(tan.x, tan.z);
    this.playerPhysics.state.rollZ = 0;
    this.playerPhysics.state.pitchX = 0;
  }

  private handleResize = () => {
    if (!this.container || !this.renderer) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private startLoop() {
    const tick = () => {
      const delta = Math.min(this.clock.getDelta(), 0.08);

      if (!this.isPaused) {
        this.updateGame(delta);
      }

      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 60);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updateGame(delta: number) {
    // 1. COUNTDOWN LOGIC
    if (!this.isRaceStarted) {
      this.countdownTimer += delta;
      if (this.countdownTimer >= 1.0) {
        this.countdownTimer = 0;
        this.countdown--;
        if (this.countdown === 0) {
          this.isRaceStarted = true;
          this.raceStartTime = performance.now();
          this.currentLapStartTime = this.raceStartTime;
          this.callbacks.onCountdownTick('GO');
          soundEngine.startEngine();
          soundEngine.playCountdown(true);
        } else if (this.countdown > 0) {
          this.callbacks.onCountdownTick(this.countdown);
          soundEngine.playCountdown(false);
        }
      }
    }

    // 2. PLAYER INPUT GATHERING
    const input = this.getPlayerInput();
    if (!this.isRaceStarted) {
      // Hold brakes during countdown, allow engine rev sound
      input.throttle = 0;
      input.brake = 1;
    }

    // 3. VEHICLE PHYSICS UPDATES
    const totalLaps = this.trackConfig.laps;
    this.playerPhysics.update(delta, input, totalLaps);

    // AI Physics Updates
    this.aiDrivers.forEach(ai => {
      const aiInput = this.isRaceStarted
        ? ai.computeInput(delta, this.playerPhysics.state.position, this.playerPhysics.state.speedKmH)
        : { throttle: 0, brake: 1, steer: 0, handbrake: false, wheelie: false, nitro: false };
      ai.vehicle.update(delta, aiInput, totalLaps);
    });

    // 4. TRAFFIC MOVEMENT & NEAR-MISS DETECTION
    this.updateTraffic(delta);

    // 5. PARTICLES & VISUALS
    this.updateParticles(delta, input);

    // 6. AUDIO SYNC
    soundEngine.updateEngine(
      this.playerPhysics.state.speedKmH,
      this.playerVehicleConfig.baseStats.topSpeed,
      input.throttle,
      this.playerPhysics.state.isDrifting,
      this.playerPhysics.state.isNitroActive
    );

    // 7. CAMERA POSITIONING
    this.updateCamera(delta);

    // 8. RACE POSITION & RANKING
    this.calculateRankings();

    // 9. CHECK RACE FINISH
    if (this.isRaceStarted && !this.isRaceFinished) {
      if (this.playerPhysics.state.progress >= totalLaps) {
        this.isRaceFinished = true;
        const totalTime = performance.now() - this.raceStartTime;
        soundEngine.playVictory();

        // Calculate credits reward
        const pos = this.calculatePlayerPosition();
        let reward = 10000;
        if (pos === 1) reward = 25000;
        else if (pos === 2) reward = 18000;
        else if (pos === 3) reward = 14000;

        reward += Math.floor(this.playerPhysics.state.score.driftPoints / 10);
        reward += Math.floor(this.playerPhysics.state.score.wheeliePoints / 10);
        reward += this.playerPhysics.state.score.nearMissCount * 250;

        this.callbacks.onRaceFinish({
          position: pos,
          timeMs: totalTime,
          creditsEarned: reward,
          driftScore: this.playerPhysics.state.score.driftPoints,
          wheelieScore: this.playerPhysics.state.score.wheeliePoints,
        });
      }
    }

    // Notification timer
    if (this.notificationTimer > 0) {
      this.notificationTimer -= delta;
      if (this.notificationTimer <= 0) {
        this.notificationMessage = null;
      }
    }

    // 10. HUD CALLBACK
    const now = performance.now();
    const currentLapTime = this.isRaceStarted ? (now - this.currentLapStartTime) / 1000 : 0;
    this.callbacks.onRaceUpdate({
      speedKmH: Math.round(this.playerPhysics.state.speedKmH),
      gear: this.playerPhysics.state.gear,
      rpm: this.playerPhysics.state.rpm,
      nitroLevel: Math.round(this.playerPhysics.state.nitroLevel),
      currentLap: Math.min(this.playerPhysics.state.currentLap, totalLaps),
      totalLaps,
      position: this.calculatePlayerPosition(),
      totalRacers: 1 + this.aiDrivers.length,
      lapTime: currentLapTime,
      bestLapTime: this.bestLapTime,
      score: {
        drift: this.playerPhysics.state.score.driftPoints,
        wheelie: this.playerPhysics.state.score.wheeliePoints,
        nearMiss: this.playerPhysics.state.score.nearMissCount,
      },
      notification: this.notificationMessage,
    });
  }

  private getPlayerInput(): VehicleInput {
    let throttle = 0;
    let brake = 0;
    let steer = 0;
    let handbrake = false;
    let wheelie = false;
    let nitro = false;

    // Keyboard controls
    if (this.keys['w'] || this.keys['arrowup']) throttle = 1;
    if (this.keys['s'] || this.keys['arrowdown']) brake = 1;
    if (this.keys['a'] || this.keys['arrowleft']) steer = -1;
    if (this.keys['d'] || this.keys['arrowright']) steer = 1;
    if (this.keys[' ']) {
      if (this.playerVehicleConfig.type === 'bike') {
        wheelie = true;
      } else {
        handbrake = true;
      }
    }
    if (this.keys['shift'] || this.keys['shiftleft'] || this.keys['shiftright'] || this.keys['n']) {
      nitro = true;
    }

    // Touch controls override
    if (this.touchInput.throttle !== undefined) throttle = this.touchInput.throttle;
    if (this.touchInput.brake !== undefined) brake = this.touchInput.brake;
    if (this.touchInput.steer !== undefined) steer = this.touchInput.steer;
    if (this.touchInput.handbrake !== undefined) handbrake = this.touchInput.handbrake;
    if (this.touchInput.wheelie !== undefined) wheelie = this.touchInput.wheelie;
    if (this.touchInput.nitro !== undefined) nitro = this.touchInput.nitro;

    return { throttle, brake, steer, handbrake, wheelie, nitro };
  }

  private updateTraffic(delta: number) {
    const playerPos = this.playerPhysics.state.position;

    this.trafficVehicles.forEach(tv => {
      // Move traffic forward along spline
      const speedMs = tv.speed / 3.6;
      const progressDelta = (speedMs * delta) / this.builtTrack.totalLength;
      tv.progress = (tv.progress + progressDelta) % 1;

      const pt = this.builtTrack.getPointAt(tv.progress);
      const tan = this.builtTrack.getTangentAt(tv.progress).normalize();
      const bin = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tan).normalize();

      const newPos = pt.clone().add(bin.multiplyScalar(tv.lane));
      newPos.y += 0.25;
      tv.mesh.position.copy(newPos);
      tv.mesh.rotation.y = Math.atan2(tan.x, tan.z);

      // Check near-miss with player
      const dist = playerPos.distanceTo(newPos);
      if (dist < 3.2 && dist > 1.8 && this.playerPhysics.state.speedKmH > 140) {
        if (this.notificationTimer <= 0) {
          this.playerPhysics.state.score.nearMissCount++;
          this.playerPhysics.state.nitroLevel = Math.min(100, this.playerPhysics.state.nitroLevel + 15);
          this.showNotification('🔥 NEAR MISS! +250 PTS');
        }
      }
    });
  }

  private showNotification(msg: string) {
    this.notificationMessage = msg;
    this.notificationTimer = 1.6;
  }

  private updateParticles(delta: number, input: VehicleInput) {
    const isBike = this.playerVehicleConfig.type === 'bike';
    const playerPos = this.playerPhysics.state.position;
    const playerVel = this.playerPhysics.state.velocity;

    // Drift / hard braking tire smoke
    if (this.playerPhysics.state.isDrifting || (input.brake > 0 && this.playerPhysics.state.speedKmH > 60)) {
      this.particleSystem.emitSmoke(playerPos, playerVel);
    }

    // Nitro exhaust flames
    if (this.playerPhysics.state.isNitroActive) {
      const heading = this.playerPhysics.state.rotationY;
      const backward = new THREE.Vector3(-Math.sin(heading), 0, -Math.cos(heading));
      const flameCol = this.playerVehicleConfig.customization.nitroFlameColor || '#38bdf8';

      for (const offset of this.playerPhysics.meshBundle.exhaustPipes) {
        const pipeWorld = offset.clone().applyEuler(new THREE.Euler(0, heading, 0)).add(playerPos);
        this.particleSystem.emitExhaustFlame(pipeWorld, backward, flameCol);
      }
    }

    this.particleSystem.update(delta, this.camera.position);
  }

  private updateCamera(delta: number) {
    const playerPos = this.playerPhysics.state.position;
    const heading = this.playerPhysics.state.rotationY;
    const isBike = this.playerVehicleConfig.type === 'bike';
    const speedRatio = Math.min(1.0, this.playerPhysics.state.speedKmH / 340);

    // FOV punch during high speed & nitro
    const targetFov = 65 + (this.playerPhysics.state.isNitroActive ? 15 : speedRatio * 8);
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 8, delta);
    this.camera.updateProjectionMatrix();

    if (this.cameraView === 'chase') {
      // Dynamic chase camera with spring follow
      const chaseDist = isBike ? 5.2 : 6.4;
      const chaseHeight = isBike ? 2.4 : 2.2;

      const idealOffset = new THREE.Vector3(
        -Math.sin(heading) * chaseDist,
        chaseHeight + (this.playerPhysics.state.isWheelie ? 0.6 : 0),
        -Math.cos(heading) * chaseDist
      );
      const idealCameraPos = playerPos.clone().add(idealOffset);

      // Smooth damp
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, idealCameraPos.x, 14, delta);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, idealCameraPos.y, 14, delta);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, idealCameraPos.z, 14, delta);

      const lookTarget = playerPos.clone().add(new THREE.Vector3(0, 1.2, 0));
      this.camera.lookAt(lookTarget);
    } else if (this.cameraView === 'cockpit') {
      // First person / cockpit view
      const cockpitOffset = isBike
        ? new THREE.Vector3(0, 1.25, 0.1) // Rider helmet view
        : new THREE.Vector3(0, 0.9, -0.1); // Inside car cabin

      const camPos = playerPos.clone().add(cockpitOffset.applyEuler(new THREE.Euler(0, heading, 0)));
      this.camera.position.copy(camPos);

      const lookOffset = new THREE.Vector3(Math.sin(heading) * 30, 0.6, Math.cos(heading) * 30);
      this.camera.lookAt(camPos.clone().add(lookOffset));
    } else if (this.cameraView === 'hood') {
      // Low hood / front bumper cam
      const hoodOffset = new THREE.Vector3(0, 0.55, 1.8).applyEuler(new THREE.Euler(0, heading, 0));
      const camPos = playerPos.clone().add(hoodOffset);
      this.camera.position.copy(camPos);

      const lookOffset = new THREE.Vector3(Math.sin(heading) * 40, 0.3, Math.cos(heading) * 40);
      this.camera.lookAt(camPos.clone().add(lookOffset));
    } else {
      // Cinematic low side pan cam
      const cineOffset = new THREE.Vector3(
        Math.cos(heading) * 4.5,
        1.0,
        Math.sin(heading) * 4.5
      );
      this.camera.position.copy(playerPos.clone().add(cineOffset));
      this.camera.lookAt(playerPos.clone().add(new THREE.Vector3(0, 0.8, 0)));
    }
  }

  private calculateRankings() {
    // Collect all participants (player + AI)
    const racers = [
      { id: 'player', progress: this.playerPhysics.state.progress },
      ...this.aiDrivers.map((ai, idx) => ({ id: `ai_${idx}`, progress: ai.vehicle.state.progress }))
    ];

    // Sort descending by total progress
    racers.sort((a, b) => b.progress - a.progress);
  }

  public calculatePlayerPosition(): number {
    let position = 1;
    const playerProg = this.playerPhysics.state.progress;
    for (const ai of this.aiDrivers) {
      if (ai.vehicle.state.progress > playerProg) {
        position++;
      }
    }
    return position;
  }

  public getTrackPoints(): Array<{ x: number; z: number }> {
    const points: Array<{ x: number; z: number }> = [];
    for (let i = 0; i < 60; i++) {
      const pt = this.builtTrack.getPointAt(i / 60);
      points.push({ x: pt.x, z: pt.z });
    }
    return points;
  }

  public getRacerMiniMapPositions(): Array<{ id: string; x: number; z: number; isPlayer: boolean }> {
    const positions = [
      {
        id: 'player',
        x: this.playerPhysics.state.position.x,
        z: this.playerPhysics.state.position.z,
        isPlayer: true,
      },
    ];

    for (let i = 0; i < this.aiDrivers.length; i++) {
      const ai = this.aiDrivers[i];
      positions.push({
        id: `ai_${i}`,
        x: ai.vehicle.state.position.x,
        z: ai.vehicle.state.position.z,
        isPlayer: false,
      });
    }

    return positions;
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (paused) {
      soundEngine.stopEngine();
    } else {
      soundEngine.startEngine();
    }
  }

  public dispose() {
    soundEngine.stopEngine();
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.handleResize);

    this.particleSystem.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}

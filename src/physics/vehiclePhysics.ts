import * as THREE from 'three';
import { VehicleConfig } from '../types';
import { BuiltTrack } from '../graphics/tracks/trackBuilder';
import { VehicleMeshBundle } from '../graphics/models/carModels';
import { soundEngine } from '../audio/soundEngine';

export interface VehicleInput {
  throttle: number; // 0 to 1
  brake: number; // 0 to 1
  steer: number; // -1 (left) to 1 (right)
  handbrake: boolean; // car drift or bike brake
  wheelie: boolean; // bike front wheel lift
  nitro: boolean; // boost
}

export interface VehiclePhysicsState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  speedKmH: number;
  rotationY: number;
  rollZ: number; // Bike lean or car body roll
  pitchX: number; // Bike wheelie or car acceleration squat
  steerAngle: number;
  progress: number; // 0 to totalLaps
  trackT: number; // 0 to 1 along current lap
  currentLap: number;
  isDrifting: boolean;
  driftAngle: number;
  isWheelie: boolean;
  wheelieAngle: number;
  nitroLevel: number; // 0 to 100
  isNitroActive: boolean;
  gear: number;
  rpm: number;
  collisionCooldown: number;
  score: {
    driftPoints: number;
    wheeliePoints: number;
    nearMissCount: number;
  };
}

export class VehiclePhysics {
  public config: VehicleConfig;
  public state: VehiclePhysicsState;
  public meshBundle: VehicleMeshBundle;
  public track: BuiltTrack;
  public isPlayer: boolean;

  private topSpeedMs: number;
  private accelPower: number;
  private turnGrip: number;
  private brakeForce: number;

  constructor(
    config: VehicleConfig,
    meshBundle: VehicleMeshBundle,
    track: BuiltTrack,
    startProgress: number = 0,
    lateralOffset: number = 0,
    isPlayer: boolean = false
  ) {
    this.config = config;
    this.meshBundle = meshBundle;
    this.track = track;
    this.isPlayer = isPlayer;

    // Upgrades multiplier (0 to 5 levels)
    const engineMult = 1 + (config.currentUpgrades?.engine || 0) * 0.05;
    const transMult = 1 + (config.currentUpgrades?.transmission || 0) * 0.05;
    const tireMult = 1 + (config.currentUpgrades?.tires || 0) * 0.06;
    const brakeMult = 1 + (config.currentUpgrades?.brakes || 0) * 0.08;
    const nitroMult = 1 + (config.currentUpgrades?.nitro || 0) * 0.1;

    // Convert km/h stats to m/s
    this.topSpeedMs = (config.baseStats.topSpeed * engineMult) / 3.6;
    this.accelPower = (config.baseStats.acceleration / 100) * 22 * transMult;
    this.turnGrip = (config.baseStats.handling / 100) * 2.8 * tireMult;
    this.brakeForce = (config.baseStats.braking / 100) * 28 * brakeMult;

    // Calculate initial world position along track spline
    const startPt = track.getPointAt(startProgress);
    const startTan = track.getTangentAt(startProgress).normalize();
    const startBin = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), startTan).normalize();

    const initialPos = startPt.clone().add(startBin.multiplyScalar(lateralOffset));
    initialPos.y += 0.35;
    const initialRotY = Math.atan2(startTan.x, startTan.z);

    this.state = {
      position: initialPos,
      velocity: new THREE.Vector3(),
      speedKmH: 0,
      rotationY: initialRotY,
      rollZ: 0,
      pitchX: 0,
      steerAngle: 0,
      progress: startProgress,
      trackT: startProgress % 1,
      currentLap: 1,
      isDrifting: false,
      driftAngle: 0,
      isWheelie: false,
      wheelieAngle: 0,
      nitroLevel: 100,
      isNitroActive: false,
      gear: 1,
      rpm: 0.2,
      collisionCooldown: 0,
      score: {
        driftPoints: 0,
        wheeliePoints: 0,
        nearMissCount: 0,
      },
    };

    this.meshBundle.root.position.copy(initialPos);
    this.meshBundle.root.rotation.y = initialRotY;
  }

  public update(delta: number, input: VehicleInput, totalLaps: number = 2) {
    const isBike = this.config.type === 'bike';
    const dt = Math.min(delta, 0.1);

    // 1. NITRO BOOST LOGIC
    let currentMaxSpeed = this.topSpeedMs;
    let boostAccel = 1.0;

    if (input.nitro && this.state.nitroLevel > 0 && input.throttle > 0) {
      this.state.isNitroActive = true;
      this.state.nitroLevel = Math.max(0, this.state.nitroLevel - dt * 25);
      currentMaxSpeed += 12; // +43 km/h
      boostAccel = 1.85;
    } else {
      this.state.isNitroActive = false;
      // Passive nitro recharge on high speed
      if (this.state.speedKmH > 180) {
        this.state.nitroLevel = Math.min(100, this.state.nitroLevel + dt * 4);
      }
    }

    // 2. ACCELERATION & BRAKING
    const forward = new THREE.Vector3(Math.sin(this.state.rotationY), 0, Math.cos(this.state.rotationY));
    let forwardSpeed = this.state.velocity.dot(forward);

    if (input.throttle > 0) {
      const powerCurve = Math.max(0.2, 1 - (forwardSpeed / currentMaxSpeed));
      forwardSpeed += input.throttle * this.accelPower * boostAccel * powerCurve * dt;
    }

    if (input.brake > 0) {
      if (forwardSpeed > 0.5) {
        forwardSpeed = Math.max(0, forwardSpeed - input.brake * this.brakeForce * dt);
      } else {
        // Reverse
        forwardSpeed -= input.brake * (this.accelPower * 0.4) * dt;
        forwardSpeed = Math.max(forwardSpeed, -8);
      }
    }

    // Rolling road friction & air aerodynamic drag
    const dragCoeff = 0.00045;
    const airResistance = forwardSpeed * Math.abs(forwardSpeed) * dragCoeff;
    const rollingResistance = 1.2;
    forwardSpeed -= (airResistance + rollingResistance) * dt;

    if (Math.abs(forwardSpeed) < 0.2 && input.throttle === 0 && input.brake === 0) {
      forwardSpeed = 0;
    }

    // 3. STEERING & DRIFTING / BIKE LEAN
    const steerSpeedFactor = Math.min(Math.abs(forwardSpeed) / 15, 1.0);
    const targetSteerAngle = -input.steer * 0.55 * (1 - Math.min(Math.abs(forwardSpeed) / currentMaxSpeed, 0.5));
    this.state.steerAngle = THREE.MathUtils.damp(this.state.steerAngle, targetSteerAngle, 10, dt);

    let driftMultiplier = 1.0;
    if (!isBike && input.handbrake && Math.abs(forwardSpeed) > 15) {
      this.state.isDrifting = true;
      driftMultiplier = 1.6;
      this.state.driftAngle = THREE.MathUtils.damp(this.state.driftAngle, -input.steer * 0.45, 6, dt);
      this.state.score.driftPoints += Math.floor(Math.abs(forwardSpeed) * 1.5 * dt * 20);
      this.state.nitroLevel = Math.min(100, this.state.nitroLevel + dt * 10);
    } else {
      this.state.isDrifting = false;
      this.state.driftAngle = THREE.MathUtils.damp(this.state.driftAngle, 0, 8, dt);
    }

    // Turn rate
    if (Math.abs(forwardSpeed) > 0.1) {
      const turnRate = this.turnGrip * this.state.steerAngle * steerSpeedFactor * driftMultiplier;
      this.state.rotationY += turnRate * dt;
    }

    // Reconstruct velocity vector
    const actualHeading = this.state.rotationY + (this.state.isDrifting ? this.state.driftAngle : 0);
    const headingVector = new THREE.Vector3(Math.sin(actualHeading), 0, Math.cos(actualHeading));
    this.state.velocity.copy(headingVector.multiplyScalar(forwardSpeed));

    // Update position
    this.state.position.addScaledVector(this.state.velocity, dt);

    // 4. BIKE LEAN & WHEELIE DYNAMICS
    if (isBike) {
      // Lean into turns proportional to steer and speed
      const targetRoll = -input.steer * (forwardSpeed / currentMaxSpeed) * 0.75; // Up to ~43 degrees lean!
      this.state.rollZ = THREE.MathUtils.damp(this.state.rollZ, targetRoll, 7, dt);

      // Wheelie mechanic
      if (input.wheelie && forwardSpeed > 8 && input.throttle > 0) {
        this.state.isWheelie = true;
        this.state.wheelieAngle = THREE.MathUtils.damp(this.state.wheelieAngle, 0.42, 6, dt); // ~24 deg pitch
        this.state.score.wheeliePoints += Math.floor(forwardSpeed * dt * 30);
        this.state.nitroLevel = Math.min(100, this.state.nitroLevel + dt * 12);
      } else {
        this.state.isWheelie = false;
        this.state.wheelieAngle = THREE.MathUtils.damp(this.state.wheelieAngle, 0, 10, dt);
      }
      this.state.pitchX = this.state.wheelieAngle;
    } else {
      // Car subtle body roll into turns and squat under hard acceleration
      const targetRoll = input.steer * (forwardSpeed / currentMaxSpeed) * 0.08;
      this.state.rollZ = THREE.MathUtils.damp(this.state.rollZ, targetRoll, 8, dt);

      const targetPitch = (input.throttle - input.brake) * 0.04;
      this.state.pitchX = THREE.MathUtils.damp(this.state.pitchX, targetPitch, 6, dt);
    }

    // 5. TRACK CONSTRAINTS & BOUNDARY COLLISIONS
    this.updateTrackProgress(totalLaps);

    const trackPt = this.track.getPointAt(this.state.trackT);
    const trackTan = this.track.getTangentAt(this.state.trackT).normalize();
    const trackBin = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), trackTan).normalize();

    // Snap Y height smoothly to road surface
    this.state.position.y = THREE.MathUtils.damp(this.state.position.y, trackPt.y + (isBike ? 0.32 : 0.38), 12, dt);

    // Lateral distance from track centerline
    const deltaFromCenter = this.state.position.clone().sub(trackPt);
    const lateralDist = deltaFromCenter.dot(trackBin);
    const halfWidth = this.track.getTrackWidth() * 0.5 - (isBike ? 0.6 : 1.1);

    if (Math.abs(lateralDist) > halfWidth) {
      // Barrier bounce collision!
      const sign = Math.sign(lateralDist);
      const pushback = sign * (Math.abs(lateralDist) - halfWidth);
      this.state.position.sub(trackBin.clone().multiplyScalar(pushback * 1.05));

      // Impact speed dampening
      if (this.state.collisionCooldown <= 0) {
        if (this.isPlayer) {
          soundEngine.playCrash(Math.min(1.0, Math.abs(forwardSpeed) / 25));
        }
        forwardSpeed *= 0.72;
        this.state.velocity.copy(headingVector.multiplyScalar(forwardSpeed));
        this.state.collisionCooldown = 0.4;
      }
    }

    if (this.state.collisionCooldown > 0) {
      this.state.collisionCooldown -= dt;
    }

    // 6. GEAR & RPM CALCULATION
    this.state.speedKmH = Math.max(0, forwardSpeed * 3.6);
    const speedRatio = Math.min(1.0, this.state.speedKmH / (this.topSpeedMs * 3.6));
    const gearFraction = 1 / 6;
    this.state.gear = Math.min(6, Math.max(1, Math.floor(speedRatio / gearFraction) + 1));
    const speedInCurrentGear = (speedRatio - (this.state.gear - 1) * gearFraction) / gearFraction;
    this.state.rpm = Math.min(1.0, 0.2 + speedInCurrentGear * 0.8 + (input.throttle > 0 ? 0.08 : 0));

    // 7. SYNC 3D MESH TRANSFORMS
    this.meshBundle.root.position.copy(this.state.position);
    this.meshBundle.root.rotation.set(this.state.pitchX, this.state.rotationY, this.state.rollZ);

    // Steer front wheels
    for (const pivot of this.meshBundle.steerPivots) {
      pivot.rotation.y = this.state.steerAngle;
    }

    // Spin wheels
    const wheelSpin = (forwardSpeed / 0.35) * dt;
    for (const wheel of this.meshBundle.wheels) {
      wheel.rotation.x += wheelSpin;
    }

    // Bike rider lean
    if (this.meshBundle.riderMesh) {
      this.meshBundle.riderMesh.rotation.z = -this.state.rollZ * 0.35;
      this.meshBundle.riderMesh.rotation.y = this.state.steerAngle * 0.25;
    }
  }

  private updateTrackProgress(totalLaps: number) {
    // Find closest t along curve
    const currentT = this.state.trackT;
    let bestT = currentT;
    let minDistSq = Infinity;

    // Search in local window around current t
    for (let step = -15; step <= 15; step++) {
      const sampleT = ((currentT + (step / 500)) % 1 + 1) % 1;
      const pt = this.track.getPointAt(sampleT);
      const dSq = pt.distanceToSquared(this.state.position);
      if (dSq < minDistSq) {
        minDistSq = dSq;
        bestT = sampleT;
      }
    }

    // Detect lap completion
    if (currentT > 0.85 && bestT < 0.15) {
      this.state.currentLap++;
      if (this.isPlayer && this.state.currentLap <= totalLaps) {
        soundEngine.playCountdown(true);
      }
    } else if (currentT < 0.15 && bestT > 0.85) {
      this.state.currentLap = Math.max(1, this.state.currentLap - 1);
    }

    this.state.trackT = bestT;
    this.state.progress = (this.state.currentLap - 1) + bestT;
  }
}

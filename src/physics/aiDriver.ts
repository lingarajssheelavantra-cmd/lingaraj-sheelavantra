import * as THREE from 'three';
import { VehiclePhysics, VehicleInput } from './vehiclePhysics';

export interface AIDriverProfile {
  name: string;
  aggression: number; // 0.8 to 1.2
  skill: number; // 0.8 to 1.1
  lanePreference: number; // -4 to +4 lateral road offset
  nitroTimer: number;
}

export class AIDriver {
  public vehicle: VehiclePhysics;
  public profile: AIDriverProfile;

  constructor(vehicle: VehiclePhysics, profile: AIDriverProfile) {
    this.vehicle = vehicle;
    this.profile = profile;
  }

  public computeInput(delta: number, playerPos: THREE.Vector3, playerSpeed: number): VehicleInput {
    const track = this.vehicle.track;
    const currentT = this.vehicle.state.trackT;
    const isBike = this.vehicle.config.type === 'bike';

    // 1. LOOK-AHEAD TARGET POINT ALONG RACING LINE
    const lookAheadDistance = Math.max(0.015, (this.vehicle.state.speedKmH / 360) * 0.04);
    const targetT = (currentT + lookAheadDistance) % 1;
    const targetPt = track.getPointAt(targetT);
    const targetTan = track.getTangentAt(targetT).normalize();
    const targetBin = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), targetTan).normalize();

    // Lateral lane offset with dynamic overtaking variation
    let lateralOffset = this.profile.lanePreference;

    // Check if player or another vehicle is directly in front
    const distToPlayer = this.vehicle.state.position.distanceTo(playerPos);
    if (distToPlayer < 25 && distToPlayer > 4) {
      // Attempt overtake or draft
      if (this.profile.aggression > 1.0) {
        // Aggressive overtake: switch to opposite side
        lateralOffset = -lateralOffset;
      }
    }

    const desiredTarget = targetPt.clone().add(targetBin.multiplyScalar(lateralOffset));

    // 2. STEERING TOWARDS TARGET
    const currentPos = this.vehicle.state.position;
    const dirToTarget = desiredTarget.clone().sub(currentPos);
    const targetHeading = Math.atan2(dirToTarget.x, dirToTarget.z);

    let angleDiff = targetHeading - this.vehicle.state.rotationY;
    // Normalize to -PI to PI
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const steer = Math.min(Math.max(angleDiff * 2.8 * this.profile.skill, -1.0), 1.0);

    // 3. SPEED CONTROL & BRAKING BEFORE CORNERS
    // Check curvature ahead
    const farT = (currentT + lookAheadDistance * 2.2) % 1;
    const nearTan = track.getTangentAt(targetT).normalize();
    const farTan = track.getTangentAt(farT).normalize();
    const cornerAngle = nearTan.angleTo(farTan);

    let throttle = 1.0;
    let brake = 0.0;

    // Sharp turn ahead: slow down to cornering speed
    const maxSafeSpeedKmH = Math.max(160, 320 - cornerAngle * 260 * (1 / this.profile.skill));
    if (this.vehicle.state.speedKmH > maxSafeSpeedKmH) {
      throttle = 0.1;
      brake = Math.min(1.0, (this.vehicle.state.speedKmH - maxSafeSpeedKmH) / 40);
    }

    // 4. NITRO USAGE ON STRAIGHTS
    let nitro = false;
    this.profile.nitroTimer -= delta;

    if (cornerAngle < 0.15 && this.vehicle.state.speedKmH > 180 && this.profile.nitroTimer <= 0) {
      if (this.vehicle.state.nitroLevel > 30) {
        nitro = true;
        if (Math.random() < 0.02) {
          this.profile.nitroTimer = 4.0 + Math.random() * 5.0; // cooldown
        }
      }
    }

    // Bike wheelie for high-speed style
    let wheelie = false;
    if (isBike && cornerAngle < 0.1 && nitro && this.vehicle.state.speedKmH > 150) {
      wheelie = true;
    }

    return {
      throttle,
      brake,
      steer,
      handbrake: false,
      wheelie,
      nitro,
    };
  }
}

export type VehicleType = 'car' | 'bike';

export interface VehicleStats {
  topSpeed: number; // in km/h, e.g. 280 - 360
  acceleration: number; // 0-100 rating (e.g. 70-98)
  handling: number; // turn sharpness / grip
  braking: number; // stop power
  nitroPower: number; // boost strength
}

export interface VehicleConfig {
  id: string;
  name: string;
  type: VehicleType;
  brand: string;
  category: string; // e.g. "Hypercar", "Superbike"
  description: string;
  price: number;
  unlocked: boolean;
  baseStats: VehicleStats;
  currentUpgrades: {
    engine: number; // 0 to 5
    transmission: number; // 0 to 5
    tires: number; // 0 to 5
    brakes: number; // 0 to 5
    nitro: number; // 0 to 5
  };
  customization: {
    primaryColor: string;
    secondaryColor: string;
    neonColor: string;
    hasNeon: boolean;
    rimColor: string;
    spoilerType: number;
    nitroFlameColor: string;
  };
}

export type TrackId = 'tokyo_neon' | 'sunset_coastal' | 'desert_canyon' | 'mountain_pass';

export interface TrackConfig {
  id: TrackId;
  name: string;
  location: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Extreme';
  lengthKm: number;
  laps: number;
  environment: 'neon_night' | 'sunset' | 'desert' | 'alpine_night';
  weather: 'clear' | 'wet' | 'sunset_haze';
  ambientColor: number;
  fogColor: number;
  description: string;
}

export type GameMode = 
  | 'car_vs_bike' 
  | 'superbike_championship' 
  | 'supercar_championship' 
  | 'drag_race' 
  | 'traffic_challenge' 
  | 'time_trial' 
  | 'free_roam';

export type CameraView = 'chase' | 'cockpit' | 'hood' | 'cinematic';

export interface RaceParticipant {
  id: string;
  name: string;
  isPlayer: boolean;
  vehicle: VehicleConfig;
  position: number;
  currentLap: number;
  progress: number; // along track spline 0 to totalLaps
  speed: number;
  lapTimes: number[];
  currentLapStartTime: number;
  finished: boolean;
  finishTime: number | null;
}

export interface PlayerProfile {
  credits: number;
  xp: number;
  unlockedVehicles: string[];
  careerWins: number;
  totalDistanceKm: number;
  ownedUpgrades: Record<string, Record<string, number>>;
  customizations: Record<string, VehicleConfig['customization']>;
}

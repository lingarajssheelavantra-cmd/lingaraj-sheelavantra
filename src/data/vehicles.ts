import { VehicleConfig } from '../types';

export const VEHICLE_CATALOG: VehicleConfig[] = [
  // SUPER CARS
  {
    id: 'car_lamborghini',
    name: 'Veloce SV-12',
    type: 'car',
    brand: 'Tauro Motors',
    category: 'V12 Supercar',
    description: 'Sharp, aggressive aerodynamic bodywork inspired by stealth fighter jets with an screaming V12 engine.',
    price: 0, // Starter car
    unlocked: true,
    baseStats: {
      topSpeed: 335,
      acceleration: 88,
      handling: 84,
      braking: 82,
      nitroPower: 86,
    },
    currentUpgrades: { engine: 0, transmission: 0, tires: 0, brakes: 0, nitro: 0 },
    customization: {
      primaryColor: '#f59e0b', // Exotic metallic yellow-orange
      secondaryColor: '#18181b', // Carbon black
      neonColor: '#06b6d4', // Cyan neon
      hasNeon: true,
      rimColor: '#e2e8f0', // Silver chrome
      spoilerType: 1,
      nitroFlameColor: '#3b82f6',
    },
  },
  {
    id: 'car_ferrari',
    name: 'Rosso Tributo 8',
    type: 'car',
    brand: 'Scuderia Modena',
    category: 'Exotic Sportscar',
    description: 'Iconic Italian crimson red silhouette with pure racing DNA, razor-sharp front splitter and aerodynamic bridge.',
    price: 35000,
    unlocked: false,
    baseStats: {
      topSpeed: 342,
      acceleration: 92,
      handling: 90,
      braking: 88,
      nitroPower: 88,
    },
    currentUpgrades: { engine: 0, transmission: 0, tires: 0, brakes: 0, nitro: 0 },
    customization: {
      primaryColor: '#dc2626', // Ferrari red
      secondaryColor: '#09090b',
      neonColor: '#ef4444',
      hasNeon: false,
      rimColor: '#d97706', // Gold rims
      spoilerType: 2,
      nitroFlameColor: '#ef4444',
    },
  },
  {
    id: 'car_gtr',
    name: 'Ronin GT-R50',
    type: 'car',
    brand: 'Nippon Performance',
    category: 'Tuner Supercar',
    description: 'The legendary twin-turbo all-wheel powerhouse with widebody arches and dual circular taillights.',
    price: 48000,
    unlocked: false,
    baseStats: {
      topSpeed: 328,
      acceleration: 95,
      handling: 87,
      braking: 85,
      nitroPower: 90,
    },
    currentUpgrades: { engine: 0, transmission: 0, tires: 0, brakes: 0, nitro: 0 },
    customization: {
      primaryColor: '#2563eb', // Bayside blue
      secondaryColor: '#111827',
      neonColor: '#3b82f6',
      hasNeon: true,
      rimColor: '#1f2937', // Gunmetal
      spoilerType: 3,
      nitroFlameColor: '#06b6d4',
    },
  },
  {
    id: 'car_hypercar',
    name: 'Phantom Nocturne',
    type: 'car',
    brand: 'Apex Aeronautics',
    category: 'Hypercar',
    description: 'Matte stealth black body with active aero fin, luminescent electric underglow, and quad-turbo thrust.',
    price: 80000,
    unlocked: false,
    baseStats: {
      topSpeed: 365,
      acceleration: 98,
      handling: 93,
      braking: 94,
      nitroPower: 97,
    },
    currentUpgrades: { engine: 0, transmission: 0, tires: 0, brakes: 0, nitro: 0 },
    customization: {
      primaryColor: '#18181b', // Matte black
      secondaryColor: '#06b6d4', // Cyan accent
      neonColor: '#00f0ff',
      hasNeon: true,
      rimColor: '#00f0ff',
      spoilerType: 3,
      nitroFlameColor: '#a855f7',
    },
  },

  // SUPER BIKES
  {
    id: 'bike_ninja',
    name: 'Kawa Shinobi 10R',
    type: 'bike',
    brand: 'Kurogane Moto',
    category: '1000cc Superbike',
    description: 'Aerodynamic sharp green and carbon fairings, incredible power-to-weight ratio, and lightning quick throttle.',
    price: 0, // Starter bike
    unlocked: true,
    baseStats: {
      topSpeed: 318,
      acceleration: 94,
      handling: 92,
      braking: 80,
      nitroPower: 92,
    },
    currentUpgrades: { engine: 0, transmission: 0, tires: 0, brakes: 0, nitro: 0 },
    customization: {
      primaryColor: '#22c55e', // Lime Ninja green
      secondaryColor: '#09090b',
      neonColor: '#22c55e',
      hasNeon: true,
      rimColor: '#18181b',
      spoilerType: 0,
      nitroFlameColor: '#10b981',
    },
  },
  {
    id: 'bike_ducati',
    name: 'Bologna V4 Pantera',
    type: 'bike',
    brand: 'Ducati Classica',
    category: 'Desmo Superbike',
    description: 'Pure Italian passion with integrated dual aerodynamic downforce winglets and deep desmodromic bark.',
    price: 32000,
    unlocked: false,
    baseStats: {
      topSpeed: 330,
      acceleration: 96,
      handling: 95,
      braking: 84,
      nitroPower: 90,
    },
    currentUpgrades: { engine: 0, transmission: 0, tires: 0, brakes: 0, nitro: 0 },
    customization: {
      primaryColor: '#e11d48', // Ducati crimson
      secondaryColor: '#ffffff',
      neonColor: '#e11d48',
      hasNeon: false,
      rimColor: '#e11d48',
      spoilerType: 1,
      nitroFlameColor: '#f43f5e',
    },
  },
  {
    id: 'bike_bmw',
    name: 'Bavaria S-1000 Apex',
    type: 'bike',
    brand: 'Munich Precision',
    category: 'Superbike M-Pack',
    description: 'Precision German engineered supersport machine with shark gill cooling vents and dynamic traction logic.',
    price: 45000,
    unlocked: false,
    baseStats: {
      topSpeed: 336,
      acceleration: 97,
      handling: 94,
      braking: 87,
      nitroPower: 93,
    },
    currentUpgrades: { engine: 0, transmission: 0, tires: 0, brakes: 0, nitro: 0 },
    customization: {
      primaryColor: '#f8fafc', // Alpine white
      secondaryColor: '#0284c7', // M Blue
      neonColor: '#38bdf8',
      hasNeon: true,
      rimColor: '#0f172a',
      spoilerType: 1,
      nitroFlameColor: '#38bdf8',
    },
  },
  {
    id: 'bike_yamaha',
    name: 'Crossplane R-One',
    type: 'bike',
    brand: 'Iwata Racing',
    category: 'Crossplane 1000',
    description: 'Unmistakable uneven crossplane firing rhythm, unmatched mid-corner stability, and MotoGP inspired electronics.',
    price: 68000,
    unlocked: false,
    baseStats: {
      topSpeed: 345,
      acceleration: 99,
      handling: 96,
      braking: 86,
      nitroPower: 95,
    },
    currentUpgrades: { engine: 0, transmission: 0, tires: 0, brakes: 0, nitro: 0 },
    customization: {
      primaryColor: '#1d4ed8', // Factory Yamaha Blue
      secondaryColor: '#94a3b8', // Silver
      neonColor: '#60a5fa',
      hasNeon: true,
      rimColor: '#1d4ed8',
      spoilerType: 1,
      nitroFlameColor: '#3b82f6',
    },
  },
];

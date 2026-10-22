import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { VehicleConfig, TrackConfig, GameMode, VehicleType } from '../types';
import { VEHICLE_CATALOG } from '../data/vehicles';
import { TRACK_CATALOG } from '../data/tracks';
import { createCarMesh } from '../graphics/models/carModels';
import { createBikeMesh } from '../graphics/models/bikeModels';
import { soundEngine } from '../audio/soundEngine';
import { 
  Car, 
  Bike, 
  Play, 
  Wrench, 
  Palette, 
  Trophy, 
  Compass, 
  Zap, 
  ChevronRight, 
  Check, 
  Lock, 
  Sparkles,
  Volume2,
  VolumeX,
  Gauge,
  Activity,
  ShieldCheck,
  Disc
} from 'lucide-react';

interface MainMenuProps {
  playerCredits: number;
  unlockedVehicles: string[];
  selectedVehicle: VehicleConfig;
  selectedTrack: TrackConfig;
  selectedMode: GameMode;
  onSelectVehicle: (vehicle: VehicleConfig) => void;
  onSelectTrack: (track: TrackConfig) => void;
  onSelectMode: (mode: GameMode) => void;
  onStartRace: () => void;
  onBuyVehicle: (vehicle: VehicleConfig) => void;
  onUpgradeVehicle: (vehicleId: string, part: 'engine' | 'transmission' | 'tires' | 'brakes' | 'nitro') => void;
  onCustomizeVehicle: (vehicleId: string, custom: VehicleConfig['customization']) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const PAINT_COLORS = [
  { name: 'Exotic Gold', hex: '#f59e0b' },
  { name: 'Rosso Corsa', hex: '#dc2626' },
  { name: 'Bayside Blue', hex: '#2563eb' },
  { name: 'Matte Stealth', hex: '#18181b' },
  { name: 'Kawasaki Lime', hex: '#22c55e' },
  { name: 'Electric Violet', hex: '#9333ea' },
  { name: 'Alpine Pearl', hex: '#f8fafc' },
  { name: 'Cyber Cyan', hex: '#06b6d4' },
];

const NEON_COLORS = [
  { name: 'Cyan Glow', hex: '#00f0ff' },
  { name: 'Hot Pink', hex: '#ff007f' },
  { name: 'Acid Green', hex: '#39ff14' },
  { name: 'Crimson Red', hex: '#ff1e1e' },
  { name: 'Amber Gold', hex: '#ffb700' },
  { name: 'Royal Purple', hex: '#9d00ff' },
];

export const MainMenu: React.FC<MainMenuProps> = ({
  playerCredits,
  unlockedVehicles,
  selectedVehicle,
  selectedTrack,
  selectedMode,
  onSelectVehicle,
  onSelectTrack,
  onSelectMode,
  onStartRace,
  onBuyVehicle,
  onUpgradeVehicle,
  onCustomizeVehicle,
  isMuted,
  onToggleMute,
}) => {
  const [activeTab, setActiveTab] = useState<'vehicles' | 'custom' | 'upgrades' | 'modes'>('vehicles');
  const [vehicleFilter, setVehicleFilter] = useState<VehicleType>(selectedVehicle.type);

  // 3D Turntable canvas
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const vehicleGroupRef = useRef<THREE.Group | null>(null);

  // Initialize 3D Showroom scene
  useEffect(() => {
    if (!canvasMountRef.current) return;
    const container = canvasMountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(4.5, 2.2, 5.5);
    camera.lookAt(0, 0.6, 0);

    // Environment PMREM
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Studio Lighting
    const hemi = new THREE.HemisphereLight(0xffffff, 0x1e293b, 1.2);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(5, 8, 4);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    rimLight.position.set(-6, 4, -5);
    scene.add(rimLight);

    // Turntable Pedestal
    const stageGeom = new THREE.CylinderGeometry(3.2, 3.4, 0.25, 48);
    const stageMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.2,
      metalness: 0.8,
    });
    const stage = new THREE.Mesh(stageGeom, stageMat);
    stage.position.y = -0.13;
    stage.receiveShadow = true;
    scene.add(stage);

    // Glowing neon stage ring
    const ringGeom = new THREE.RingGeometry(3.1, 3.25, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    scene.add(ring);

    let frameId = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (vehicleGroupRef.current) {
        vehicleGroupRef.current.rotation.y += 0.007; // Slow graceful turntable rotation
      }
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update vehicle model in 3D showroom when selectedVehicle changes
  useEffect(() => {
    if (!sceneRef.current) return;
    if (vehicleGroupRef.current) {
      sceneRef.current.remove(vehicleGroupRef.current);
      vehicleGroupRef.current = null;
    }

    const bundle = selectedVehicle.type === 'bike'
      ? createBikeMesh(selectedVehicle)
      : createCarMesh(selectedVehicle);

    bundle.root.position.set(0, 0, 0);
    sceneRef.current.add(bundle.root);
    vehicleGroupRef.current = bundle.root;
  }, [selectedVehicle]);

  const filteredVehicles = VEHICLE_CATALOG.filter(v => v.type === vehicleFilter);
  const isUnlocked = unlockedVehicles.includes(selectedVehicle.id);

  // Compute upgrade cost
  const getUpgradeCost = (currentLevel: number) => (currentLevel + 1) * 3500;

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-slate-950 font-sans select-none text-slate-100">
      {/* 3D TURNTABLE BACKGROUND VIEWPORT */}
      <div ref={canvasMountRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* TOP HEADER BAR */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 bg-slate-950/70 backdrop-blur-md border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-cyan-400">
              Street Legends
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 block -mt-1">
              Car vs Superbike Ultimate Racing
            </span>
          </div>
        </div>

        {/* Player Wallet & Mute Toggle */}
        <div className="flex items-center gap-4">
          <div className="bg-slate-900/90 border border-slate-700/80 px-4 py-2 rounded-xl flex items-center gap-2 shadow-inner">
            <span className="text-xs uppercase font-bold text-slate-400">CREDITS</span>
            <span className="text-lg md:text-xl font-mono font-black text-amber-400">
              ${playerCredits.toLocaleString()}
            </span>
          </div>

          <button
            onClick={onToggleMute}
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors shadow-md"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* VEHICLE QUICK SPEC BANNER (CENTER VIEWPORT OVERLAY) */}
      <div className="relative z-10 flex justify-between items-start px-6 md:px-12 pointer-events-none mt-2">
        <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl max-w-sm pointer-events-auto shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              {selectedVehicle.brand}
            </span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-md font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
              {selectedVehicle.category}
            </span>
          </div>

          <h2 className="text-2xl font-black italic tracking-tight text-white mt-1">
            {selectedVehicle.name}
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            {selectedVehicle.description}
          </p>

          {/* Stats Bar Breakdown */}
          <div className="mt-4 space-y-2">
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-0.5">
                <span className="flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5 text-cyan-400" /> Top Speed</span>
                <span className="font-mono text-cyan-400 font-bold">{selectedVehicle.baseStats.topSpeed} km/h</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${(selectedVehicle.baseStats.topSpeed / 380) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-0.5">
                <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-amber-400" /> Acceleration</span>
                <span className="font-mono text-amber-400 font-bold">{selectedVehicle.baseStats.acceleration}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full" style={{ width: `${selectedVehicle.baseStats.acceleration}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-0.5">
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Handling</span>
                <span className="font-mono text-emerald-400 font-bold">{selectedVehicle.baseStats.handling}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${selectedVehicle.baseStats.handling}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-0.5">
                <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-indigo-400" /> Nitro Output</span>
                <span className="font-mono text-indigo-400 font-bold">{selectedVehicle.baseStats.nitroPower}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-400 h-full rounded-full" style={{ width: `${selectedVehicle.baseStats.nitroPower}%` }} />
              </div>
            </div>
          </div>

          {/* Locked / Purchase action */}
          {!isUnlocked && (
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-amber-400 font-mono font-black text-lg">
                ${selectedVehicle.price.toLocaleString()}
              </span>
              <button
                onClick={() => onBuyVehicle(selectedVehicle)}
                disabled={playerCredits < selectedVehicle.price}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95"
              >
                Unlock Vehicle
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM CONTROL DOCK (Per Three.js Constitution: Collapsible, zero obstruction) */}
      <div className="relative z-20 w-full max-w-5xl mx-auto mb-4 px-4">
        <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-3xl p-4 shadow-2xl">
          {/* Main Tabs Navigation */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setActiveTab('vehicles'); soundEngine.playClick(); }}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeTab === 'vehicles' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Car className="w-4 h-4" /> Vehicles
              </button>
              <button
                onClick={() => { setActiveTab('custom'); soundEngine.playClick(); }}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeTab === 'custom' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Palette className="w-4 h-4" /> Styling & Paint
              </button>
              <button
                onClick={() => { setActiveTab('upgrades'); soundEngine.playClick(); }}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeTab === 'upgrades' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Wrench className="w-4 h-4" /> Tuning Shop
              </button>
              <button
                onClick={() => { setActiveTab('modes'); soundEngine.playClick(); }}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeTab === 'modes' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Trophy className="w-4 h-4" /> Race Events
              </button>
            </div>

            {/* Quick Race Launch Button */}
            <button
              onClick={onStartRace}
              disabled={!isUnlocked}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 text-slate-950 font-black italic tracking-wider text-sm uppercase rounded-xl transition-all shadow-xl shadow-emerald-500/30 active:scale-95 flex items-center gap-2"
            >
              <Play className="w-5 h-5 fill-slate-950" /> Start Race
            </button>
          </div>

          {/* TAB 1: VEHICLE SELECTOR & CAR VS BIKE TOGGLE */}
          {activeTab === 'vehicles' && (
            <div>
              {/* Car vs Bike Filter Pills */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setVehicleFilter('car')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-1.5 ${
                    vehicleFilter === 'car' ? 'bg-slate-800 text-cyan-400 border border-cyan-500/50' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Car className="w-3.5 h-3.5" /> Supercars ({VEHICLE_CATALOG.filter(v => v.type === 'car').length})
                </button>
                <button
                  onClick={() => setVehicleFilter('bike')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-1.5 ${
                    vehicleFilter === 'bike' ? 'bg-slate-800 text-cyan-400 border border-cyan-500/50' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" /> Superbikes ({VEHICLE_CATALOG.filter(v => v.type === 'bike').length})
                </button>
              </div>

              {/* Grid of Vehicles */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {filteredVehicles.map(veh => {
                  const unlocked = unlockedVehicles.includes(veh.id);
                  const isSelected = selectedVehicle.id === veh.id;
                  return (
                    <div
                      key={veh.id}
                      onClick={() => {
                        onSelectVehicle(veh);
                        soundEngine.playClick();
                      }}
                      className={`cursor-pointer p-3 rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-cyan-950/60 border-cyan-400 shadow-lg shadow-cyan-500/20'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">{veh.brand}</span>
                        {unlocked ? (
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> OWNED
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-bold flex items-center gap-0.5">
                            <Lock className="w-3 h-3" /> ${veh.price.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-white truncate">{veh.name}</div>
                      <div className="text-[11px] font-mono text-cyan-300 mt-1">{veh.baseStats.topSpeed} KM/H</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOMIZATION GARAGE */}
          {activeTab === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Paint Swatches */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Body Paint Color
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {PAINT_COLORS.map(c => (
                    <button
                      key={c.hex}
                      onClick={() => {
                        onCustomizeVehicle(selectedVehicle.id, {
                          ...selectedVehicle.customization,
                          primaryColor: c.hex,
                        });
                        soundEngine.playClick();
                      }}
                      className={`w-9 h-9 rounded-xl border-2 transition-transform ${
                        selectedVehicle.customization.primaryColor === c.hex ? 'border-white scale-110 shadow-lg' : 'border-slate-700 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Neon Underglow Swatches */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Neon Underglow Lighting
                  </span>
                  <button
                    onClick={() => {
                      onCustomizeVehicle(selectedVehicle.id, {
                        ...selectedVehicle.customization,
                        hasNeon: !selectedVehicle.customization.hasNeon,
                      });
                      soundEngine.playClick();
                    }}
                    className={`text-xs px-2.5 py-1 rounded-md font-bold uppercase ${
                      selectedVehicle.customization.hasNeon ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {selectedVehicle.customization.hasNeon ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {NEON_COLORS.map(c => (
                    <button
                      key={c.hex}
                      onClick={() => {
                        onCustomizeVehicle(selectedVehicle.id, {
                          ...selectedVehicle.customization,
                          neonColor: c.hex,
                          hasNeon: true,
                        });
                        soundEngine.playClick();
                      }}
                      className={`w-9 h-9 rounded-xl border-2 transition-transform ${
                        selectedVehicle.customization.neonColor === c.hex ? 'border-white scale-110 shadow-lg shadow-cyan-500/50' : 'border-slate-700 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PERFORMANCE UPGRADES */}
          {activeTab === 'upgrades' && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {(['engine', 'transmission', 'tires', 'brakes', 'nitro'] as const).map(part => {
                const level = selectedVehicle.currentUpgrades[part] || 0;
                const cost = getUpgradeCost(level);
                const isMax = level >= 5;

                return (
                  <div key={part} className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block capitalize">
                        {part}
                      </span>
                      {/* Level pips */}
                      <div className="flex gap-1 mt-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={`flex-1 h-1.5 rounded-full ${i < level ? 'bg-cyan-400' : 'bg-slate-800'}`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] font-mono text-cyan-400 font-bold block mt-1">
                        LEVEL {level} / 5
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        onUpgradeVehicle(selectedVehicle.id, part);
                        soundEngine.playClick();
                      }}
                      disabled={isMax || playerCredits < cost}
                      className="mt-3 w-full py-1.5 bg-slate-800 hover:bg-cyan-600 disabled:opacity-40 text-white font-bold text-[11px] uppercase rounded-lg transition-colors"
                    >
                      {isMax ? 'MAXED' : `+ $${cost}`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 4: RACE MODES & TRACK SELECTOR */}
          {activeTab === 'modes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Game Modes */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Select Game Mode
                </span>
                <div className="space-y-2">
                  {[
                    { id: 'car_vs_bike', label: 'Car vs Bike Race', desc: 'Cross-class high speed showdown!' },
                    { id: 'superbike_championship', label: 'Superbike Championship', desc: 'Pure superbike race cup' },
                    { id: 'supercar_championship', label: 'Supercar Championship', desc: 'V12 & hypercar trophy' },
                    { id: 'traffic_challenge', label: 'Highway Traffic Challenge', desc: 'Dodge cars & build combos' },
                    { id: 'free_roam', label: 'Free Roam Open City', desc: 'Stunts, wheelies & drift practice' },
                  ].map(m => (
                    <div
                      key={m.id}
                      onClick={() => { onSelectMode(m.id as GameMode); soundEngine.playClick(); }}
                      className={`cursor-pointer px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between ${
                        selectedMode === m.id
                          ? 'bg-cyan-950/70 border-cyan-400 text-white'
                          : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold uppercase">{m.label}</div>
                        <div className="text-[10px] text-slate-400">{m.desc}</div>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${selectedMode === m.id ? 'text-cyan-400' : 'text-slate-600'}`} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Tracks */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Select Racing Circuit
                </span>
                <div className="space-y-2">
                  {TRACK_CATALOG.map(t => (
                    <div
                      key={t.id}
                      onClick={() => { onSelectTrack(t); soundEngine.playClick(); }}
                      className={`cursor-pointer px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between ${
                        selectedTrack.id === t.id
                          ? 'bg-cyan-950/70 border-cyan-400 text-white'
                          : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold uppercase flex items-center gap-2">
                          {t.name}
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            t.difficulty === 'Easy' ? 'bg-emerald-950 text-emerald-400' :
                            t.difficulty === 'Medium' ? 'bg-cyan-950 text-cyan-400' :
                            t.difficulty === 'Hard' ? 'bg-amber-950 text-amber-400' : 'bg-rose-950 text-rose-400'
                          }`}>
                            {t.difficulty}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">{t.location} • {t.lengthKm} km</div>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${selectedTrack.id === t.id ? 'text-cyan-400' : 'text-slate-600'}`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

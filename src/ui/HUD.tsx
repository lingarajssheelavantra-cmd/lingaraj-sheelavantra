import React from 'react';
import { Camera, Volume2, VolumeX, RotateCcw, Pause, Zap, Flame } from 'lucide-react';
import { CameraView, VehicleType } from '../types';

interface HUDProps {
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
  vehicleType: VehicleType;
  cameraView: CameraView;
  score: { drift: number; wheelie: number; nearMiss: number };
  notification: string | null;
  countdown: number | 'GO' | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onResetVehicle: () => void;
  onPause: () => void;
  miniMapTrackPoints: Array<{ x: number; z: number }>;
  racerPositions: Array<{ id: string; x: number; z: number; isPlayer: boolean }>;
}

export const HUD: React.FC<HUDProps> = ({
  speedKmH,
  gear,
  rpm,
  nitroLevel,
  currentLap,
  totalLaps,
  position,
  totalRacers,
  lapTime,
  bestLapTime,
  vehicleType,
  cameraView,
  score,
  notification,
  countdown,
  isMuted,
  onToggleMute,
  onToggleCamera,
  onResetVehicle,
  onPause,
  miniMapTrackPoints,
  racerPositions,
}) => {
  // Format lap time into MM:SS.CC
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Mini-map scaling
  const mapWidth = 140;
  const mapHeight = 140;

  // Compute bounding box of track for mini-map
  let minX = -300, maxX = 500, minZ = -400, maxZ = 650;
  if (miniMapTrackPoints.length > 0) {
    minX = Math.min(...miniMapTrackPoints.map(p => p.x));
    maxX = Math.max(...miniMapTrackPoints.map(p => p.x));
    minZ = Math.min(...miniMapTrackPoints.map(p => p.z));
    maxZ = Math.max(...miniMapTrackPoints.map(p => p.z));
  }
  const spanX = Math.max(maxX - minX, 100);
  const spanZ = Math.max(maxZ - minZ, 100);

  const toMapCoord = (x: number, z: number) => {
    const normX = (x - minX) / spanX;
    const normZ = (z - minZ) / spanZ;
    return {
      x: 15 + normX * (mapWidth - 30),
      y: 15 + normZ * (mapHeight - 30),
    };
  };

  const pathD = miniMapTrackPoints.length > 0
    ? miniMapTrackPoints.reduce((acc, p, idx) => {
        const c = toMapCoord(p.x, p.z);
        return `${acc} ${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
      }, '') + ' Z'
    : '';

  const getOrdinal = (n: number) => {
    if (n === 1) return '1ST';
    if (n === 2) return '2ND';
    if (n === 3) return '3RD';
    return `${n}TH`;
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-4 md:p-6 overflow-hidden font-sans">
      {/* TOP HEADER: POSITION, LAP, TIMER, CONTROLS */}
      <div className="flex items-start justify-between w-full">
        {/* Left: Position & Lap Badge */}
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline gap-2 bg-slate-950/80 backdrop-blur-md border border-slate-800 px-4 py-2 rounded-xl text-white shadow-xl">
            <span className="text-3xl md:text-5xl font-black italic tracking-tighter text-amber-400">
              {getOrdinal(position)}
            </span>
            <span className="text-sm md:text-lg font-bold text-slate-400">
              / {totalRacers}
            </span>
          </div>

          <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-lg text-white flex items-center justify-between text-xs md:text-sm font-semibold">
            <span className="text-slate-400">LAP</span>
            <span className="text-cyan-400 font-bold ml-2">{currentLap} / {totalLaps}</span>
          </div>

          {/* Active Style Score (Drift / Wheelie) */}
          {(score.drift > 0 || score.wheelie > 0) && (
            <div className="bg-amber-500/20 border border-amber-500/40 px-3 py-1 rounded-lg text-amber-300 text-xs font-bold tracking-wider flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>STYLE: {score.drift + score.wheelie} PTS</span>
            </div>
          )}
        </div>

        {/* Center: Lap Timer & Floating Notification / Countdown */}
        <div className="flex flex-col items-center">
          <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800/80 px-4 py-1.5 rounded-xl text-center shadow-lg">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-medium block">Lap Time</span>
            <span className="text-xl md:text-2xl font-mono font-bold text-slate-100 tracking-wider">
              {formatTime(lapTime)}
            </span>
          </div>

          {/* Countdown Overlay */}
          {countdown !== null && (
            <div className="mt-8 transform animate-bounce">
              <span className={`text-6xl md:text-8xl font-black italic tracking-widest px-6 py-2 rounded-2xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] ${
                countdown === 'GO' ? 'text-emerald-400 bg-emerald-950/90 border-2 border-emerald-400' : 'text-amber-400 bg-slate-950/90 border-2 border-amber-400'
              }`}>
                {countdown}
              </span>
            </div>
          )}

          {/* Floating High-Speed Notification (e.g. Near-miss) */}
          {notification && (
            <div className="mt-4 px-4 py-2 bg-gradient-to-r from-cyan-600/90 to-blue-600/90 border border-cyan-300 text-white font-black tracking-wide text-sm md:text-base rounded-full shadow-2xl animate-pulse">
              {notification}
            </div>
          )}
        </div>

        {/* Right: Quick Action Controls & Mini-Map */}
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={onToggleCamera}
              className="p-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl border border-slate-700/80 transition-all shadow-md active:scale-95"
              title={`Camera (${cameraView})`}
            >
              <Camera className="w-5 h-5" />
            </button>
            <button
              onClick={onResetVehicle}
              className="p-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl border border-slate-700/80 transition-all shadow-md active:scale-95"
              title="Reset Vehicle to Track (R)"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={onToggleMute}
              className="p-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl border border-slate-700/80 transition-all shadow-md active:scale-95"
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
            </button>
            <button
              onClick={onPause}
              className="p-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl border border-slate-700/80 transition-all shadow-md active:scale-95"
              title="Pause Game (ESC)"
            >
              <Pause className="w-5 h-5" />
            </button>
          </div>

          {/* Radar Mini-Map */}
          <div className="w-32 h-32 md:w-36 md:h-36 bg-slate-950/85 backdrop-blur-md rounded-2xl border border-slate-800 p-2 shadow-2xl relative overflow-hidden">
            <div className="absolute top-1 left-2 text-[9px] uppercase font-bold tracking-widest text-slate-400">RADAR</div>
            <svg width="100%" height="100%" viewBox={`0 0 ${mapWidth} ${mapHeight}`} className="overflow-visible">
              {/* Track spline path */}
              <path
                d={pathD}
                fill="none"
                stroke="#334155"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={pathD}
                fill="none"
                stroke="#64748b"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Racers dots */}
              {racerPositions.map((r) => {
                const coord = toMapCoord(r.x, r.z);
                return (
                  <circle
                    key={r.id}
                    cx={coord.x}
                    cy={coord.y}
                    r={r.isPlayer ? 4.5 : 3}
                    fill={r.isPlayer ? '#00f0ff' : '#f43f5e'}
                    stroke={r.isPlayer ? '#ffffff' : '#000000'}
                    strokeWidth={r.isPlayer ? 1.5 : 0.8}
                  />
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* BOTTOM SPEEDOMETER & TACHOMETER CLUSTER */}
      <div className="flex items-end justify-between w-full">
        {/* Left: Controls hint for desktop */}
        <div className="hidden lg:flex flex-col gap-1 text-[11px] font-medium text-slate-400 bg-slate-950/70 backdrop-blur-md p-3 rounded-xl border border-slate-800/80">
          <div><span className="text-white font-bold">W / ↑</span> Accelerate &nbsp; <span className="text-white font-bold">S / ↓</span> Brake / Reverse</div>
          <div><span className="text-white font-bold">A / D</span> Steer &nbsp; <span className="text-white font-bold">SPACE</span> {vehicleType === 'bike' ? 'Wheelie' : 'Handbrake Drift'}</div>
          <div><span className="text-white font-bold">SHIFT / N</span> Nitro Boost &nbsp; <span className="text-white font-bold">C</span> Camera &nbsp; <span className="text-white font-bold">R</span> Reset</div>
        </div>

        {/* Right / Center: Speedometer & Tachometer Cluster */}
        <div className="flex flex-col items-end gap-2 ml-auto">
          {/* Nitro Tank Meter */}
          <div className="w-56 md:w-64 bg-slate-950/80 backdrop-blur-md border border-slate-800 p-2 rounded-xl flex items-center gap-2 shadow-xl">
            <Zap className={`w-4 h-4 ${nitroLevel > 20 ? 'text-cyan-400' : 'text-slate-500'}`} />
            <div className="flex-1 bg-slate-900 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full rounded-full transition-all duration-75 bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-400"
                style={{ width: `${nitroLevel}%` }}
              />
            </div>
            <span className="text-xs font-bold text-cyan-300 w-10 text-right">{nitroLevel}%</span>
          </div>

          {/* Speedometer Instrument Cluster */}
          <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800/90 rounded-2xl p-4 shadow-2xl flex items-center gap-5">
            {/* Gear indicator */}
            <div className="flex flex-col items-center justify-center border-r border-slate-800 pr-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">GEAR</span>
              <span className="text-3xl md:text-4xl font-black italic text-cyan-400">
                {gear}
              </span>
            </div>

            {/* Speed display & RPM Arc */}
            <div className="flex flex-col items-center">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl md:text-6xl font-black italic tracking-tighter text-white font-mono">
                  {speedKmH}
                </span>
                <span className="text-xs md:text-sm font-bold text-slate-400 tracking-wider">
                  KM/H
                </span>
              </div>

              {/* RPM Bar */}
              <div className="w-36 md:w-44 h-2 bg-slate-900 rounded-full overflow-hidden mt-1 flex gap-0.5">
                {Array.from({ length: 12 }).map((_, i) => {
                  const isActive = (i / 12) <= rpm;
                  const isRedline = i >= 10;
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-sm ${
                        isActive
                          ? isRedline
                            ? 'bg-rose-500'
                            : 'bg-emerald-400'
                          : 'bg-slate-800'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

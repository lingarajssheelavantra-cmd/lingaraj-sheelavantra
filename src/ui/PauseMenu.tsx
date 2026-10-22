import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX, Camera } from 'lucide-react';
import { CameraView } from '../types';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
  cameraView: CameraView;
  onToggleCamera: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onRestart,
  onQuit,
  cameraView,
  onToggleCamera,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl text-center">
        <h2 className="text-3xl font-black italic tracking-tight uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-cyan-400">
          Race Paused
        </h2>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">
          Street Legends Motorsport
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={onResume}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black italic tracking-wider uppercase text-sm rounded-xl transition-all shadow-lg shadow-cyan-500/25 active:scale-98 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-slate-950" /> Resume Race
          </button>

          <button
            onClick={onRestart}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm uppercase rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-700"
          >
            <RotateCcw className="w-4 h-4" /> Restart Race
          </button>

          <div className="flex gap-2">
            <button
              onClick={onToggleCamera}
              className="flex-1 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase rounded-xl border border-slate-700 flex items-center justify-center gap-1.5"
            >
              <Camera className="w-4 h-4" /> Cam: {cameraView}
            </button>
            <button
              onClick={onToggleMute}
              className="flex-1 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase rounded-xl border border-slate-700 flex items-center justify-center gap-1.5"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              {isMuted ? 'Muted' : 'Sound On'}
            </button>
          </div>

          <button
            onClick={onQuit}
            className="w-full mt-2 py-3 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 font-bold text-sm uppercase rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> Exit to Garage
          </button>
        </div>
      </div>
    </div>
  );
};

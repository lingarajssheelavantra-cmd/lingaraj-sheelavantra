import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Home, Award, DollarSign, Flame, Clock } from 'lucide-react';

interface VictoryModalProps {
  position: number;
  timeMs: number;
  creditsEarned: number;
  driftScore: number;
  wheelieScore: number;
  onRestart: () => void;
  onContinue: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  position,
  timeMs,
  creditsEarned,
  driftScore,
  wheelieScore,
  onRestart,
  onContinue,
}) => {
  useEffect(() => {
    if (position <= 3) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00f0ff', '#f59e0b', '#10b981', '#ffffff'],
        });
      } catch {}
    }
  }, [position]);

  const formatTotalTime = (ms: number) => {
    const totalSecs = ms / 1000;
    const mins = Math.floor(totalSecs / 60);
    const secs = Math.floor(totalSecs % 60);
    const hundredths = Math.floor((totalSecs % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
  };

  const isPodium = position <= 3;
  const positionTitle = position === 1 ? '1ST PLACE VICTORY!' : position === 2 ? '2ND PLACE PODIUM!' : position === 3 ? '3RD PLACE PODIUM!' : `${position}TH PLACE FINISH`;

  return (
    <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl text-center">
        {/* Podium Medal Icon */}
        <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center shadow-xl mb-4 ${
          position === 1
            ? 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 shadow-amber-500/30'
            : position === 2
            ? 'bg-gradient-to-tr from-slate-400 to-slate-200 text-slate-950 shadow-slate-400/30'
            : position === 3
            ? 'bg-gradient-to-tr from-amber-700 to-amber-500 text-white shadow-amber-700/30'
            : 'bg-slate-800 text-slate-400'
        }`}>
          <Trophy className="w-10 h-10" />
        </div>

        <h2 className="text-3xl font-black italic tracking-tight uppercase text-white">
          {positionTitle}
        </h2>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">
          Race Completed Successfully
        </p>

        {/* Results Stats Grid */}
        <div className="grid grid-cols-2 gap-3 my-6">
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/80 text-cyan-400">
              <Clock className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Time</span>
              <span className="text-base font-mono font-bold text-white">{formatTotalTime(timeMs)}</span>
            </div>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-950/80 text-amber-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Reward</span>
              <span className="text-base font-mono font-bold text-amber-400">+${creditsEarned.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-950/80 text-rose-400">
              <Flame className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Drift Score</span>
              <span className="text-base font-mono font-bold text-rose-300">{driftScore.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-950/80 text-indigo-400">
              <Award className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Wheelie Style</span>
              <span className="text-base font-mono font-bold text-indigo-300">{wheelieScore.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onRestart}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-700"
          >
            <RotateCcw className="w-4 h-4" /> Restart
          </button>

          <button
            onClick={onContinue}
            className="flex-2 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black italic tracking-wider uppercase text-xs rounded-xl transition-all shadow-lg shadow-cyan-500/25 active:scale-98 flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4 fill-slate-950" /> Continue to Garage
          </button>
        </div>
      </div>
    </div>
  );
};

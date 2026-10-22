import React from 'react';
import { ArrowLeft, ArrowRight, Zap, ShieldAlert, ChevronUp, ChevronDown } from 'lucide-react';
import { VehicleInput } from '../physics/vehiclePhysics';

interface TouchControlsProps {
  onInputChange: (input: Partial<VehicleInput>) => void;
  isBike: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({ onInputChange, isBike }) => {
  return (
    <div className="absolute inset-x-0 bottom-4 pointer-events-none flex justify-between px-4 md:hidden z-30 select-none">
      {/* Left side: Steering Left / Right */}
      <div className="flex gap-2 pointer-events-auto">
        <button
          className="w-16 h-16 rounded-2xl bg-slate-900/80 active:bg-cyan-600/80 border border-slate-700/80 flex items-center justify-center text-white active:scale-95 transition-transform"
          onTouchStart={() => onInputChange({ steer: -1 })}
          onTouchEnd={() => onInputChange({ steer: 0 })}
          onMouseDown={() => onInputChange({ steer: -1 })}
          onMouseUp={() => onInputChange({ steer: 0 })}
        >
          <ArrowLeft className="w-8 h-8" />
        </button>

        <button
          className="w-16 h-16 rounded-2xl bg-slate-900/80 active:bg-cyan-600/80 border border-slate-700/80 flex items-center justify-center text-white active:scale-95 transition-transform"
          onTouchStart={() => onInputChange({ steer: 1 })}
          onTouchEnd={() => onInputChange({ steer: 0 })}
          onMouseDown={() => onInputChange({ steer: 1 })}
          onMouseUp={() => onInputChange({ steer: 0 })}
        >
          <ArrowRight className="w-8 h-8" />
        </button>
      </div>

      {/* Right side: Gas, Brake, Nitro, Wheelie/Drift */}
      <div className="flex items-end gap-2 pointer-events-auto">
        {/* Handbrake / Wheelie */}
        <button
          className="w-14 h-14 rounded-2xl bg-amber-600/80 active:bg-amber-500 border border-amber-400/50 flex flex-col items-center justify-center text-white active:scale-95 transition-transform"
          onTouchStart={() => isBike ? onInputChange({ wheelie: true }) : onInputChange({ handbrake: true })}
          onTouchEnd={() => isBike ? onInputChange({ wheelie: false }) : onInputChange({ handbrake: false })}
          onMouseDown={() => isBike ? onInputChange({ wheelie: true }) : onInputChange({ handbrake: true })}
          onMouseUp={() => isBike ? onInputChange({ wheelie: false }) : onInputChange({ handbrake: false })}
        >
          <ShieldAlert className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase">{isBike ? 'WHEELIE' : 'DRIFT'}</span>
        </button>

        {/* Nitro */}
        <button
          className="w-14 h-14 rounded-2xl bg-cyan-600/90 active:bg-cyan-400 border border-cyan-300 flex flex-col items-center justify-center text-white active:scale-95 transition-transform shadow-lg shadow-cyan-500/30"
          onTouchStart={() => onInputChange({ nitro: true })}
          onTouchEnd={() => onInputChange({ nitro: false })}
          onMouseDown={() => onInputChange({ nitro: true })}
          onMouseUp={() => onInputChange({ nitro: false })}
        >
          <Zap className="w-6 h-6 fill-white" />
          <span className="text-[9px] font-black uppercase">NITRO</span>
        </button>

        {/* Brake / Reverse */}
        <button
          className="w-16 h-16 rounded-2xl bg-rose-700/80 active:bg-rose-600 border border-rose-500/50 flex flex-col items-center justify-center text-white active:scale-95 transition-transform"
          onTouchStart={() => onInputChange({ brake: 1 })}
          onTouchEnd={() => onInputChange({ brake: 0 })}
          onMouseDown={() => onInputChange({ brake: 1 })}
          onMouseUp={() => onInputChange({ brake: 0 })}
        >
          <ChevronDown className="w-7 h-7" />
          <span className="text-[9px] font-black uppercase">BRAKE</span>
        </button>

        {/* Gas / Throttle */}
        <button
          className="w-16 h-20 rounded-2xl bg-emerald-600/90 active:bg-emerald-500 border border-emerald-400 flex flex-col items-center justify-center text-white active:scale-95 transition-transform shadow-lg shadow-emerald-600/30"
          onTouchStart={() => onInputChange({ throttle: 1 })}
          onTouchEnd={() => onInputChange({ throttle: 0 })}
          onMouseDown={() => onInputChange({ throttle: 1 })}
          onMouseUp={() => onInputChange({ throttle: 0 })}
        >
          <ChevronUp className="w-9 h-9" />
          <span className="text-[10px] font-black uppercase tracking-wider">GAS</span>
        </button>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { VehicleConfig, TrackConfig, GameMode, CameraView } from './types';
import { VEHICLE_CATALOG } from './data/vehicles';
import { TRACK_CATALOG } from './data/tracks';
import { GameEngine } from './game/GameEngine';
import { MainMenu } from './ui/MainMenu';
import { HUD } from './ui/HUD';
import { PauseMenu } from './ui/PauseMenu';
import { VictoryModal } from './ui/VictoryModal';
import { TouchControls } from './ui/TouchControls';
import { soundEngine } from './audio/soundEngine';

type AppState = 'menu' | 'racing';

export default function App() {
  const [appState, setAppState] = useState<AppState>('menu');
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Player state persisted in localStorage
  const [playerCredits, setPlayerCredits] = useState<number>(() => {
    const saved = localStorage.getItem('street_legends_credits');
    return saved ? parseInt(saved, 10) : 35000;
  });

  const [unlockedVehicles, setUnlockedVehicles] = useState<string[]>(() => {
    const saved = localStorage.getItem('street_legends_unlocked');
    return saved ? JSON.parse(saved) : ['car_lamborghini', 'bike_ninja'];
  });

  const [selectedVehicle, setSelectedVehicle] = useState<VehicleConfig>(VEHICLE_CATALOG[0]);
  const [selectedTrack, setSelectedTrack] = useState<TrackConfig>(TRACK_CATALOG[0]);
  const [selectedMode, setSelectedMode] = useState<GameMode>('car_vs_bike');
  const [cameraView, setCameraView] = useState<CameraView>('chase');

  // Race Live State
  const [speedKmH, setSpeedKmH] = useState(0);
  const [gear, setGear] = useState(1);
  const [rpm, setRpm] = useState(0.2);
  const [nitroLevel, setNitroLevel] = useState(100);
  const [currentLap, setCurrentLap] = useState(1);
  const [totalLaps, setTotalLaps] = useState(2);
  const [position, setPosition] = useState(1);
  const [totalRacers, setTotalRacers] = useState(5);
  const [lapTime, setLapTime] = useState(0);
  const [bestLapTime, setBestLapTime] = useState(0);
  const [score, setScore] = useState({ drift: 0, wheelie: 0, nearMiss: 0 });
  const [notification, setNotification] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | 'GO' | null>(null);

  // Radar Mini-Map
  const [miniMapTrackPoints, setMiniMapTrackPoints] = useState<Array<{ x: number; z: number }>>([]);
  const [racerPositions, setRacerPositions] = useState<Array<{ id: string; x: number; z: number; isPlayer: boolean }>>([]);

  // Victory Results
  const [raceResults, setRaceResults] = useState<{
    position: number;
    timeMs: number;
    creditsEarned: number;
    driftScore: number;
    wheelieScore: number;
  } | null>(null);

  // References
  const gameMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Save credits & unlocked vehicles to localStorage
  useEffect(() => {
    localStorage.setItem('street_legends_credits', playerCredits.toString());
  }, [playerCredits]);

  useEffect(() => {
    localStorage.setItem('street_legends_unlocked', JSON.stringify(unlockedVehicles));
  }, [unlockedVehicles]);

  // Audio mute sync
  const handleToggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  // Start Race: Initialize GameEngine
  const handleStartRace = () => {
    soundEngine.init();
    soundEngine.resume();
    setAppState('racing');
    setIsPaused(false);
    setIsFinished(false);
    setRaceResults(null);
    setCountdown(3);
  };

  // Setup / teardown GameEngine
  useEffect(() => {
    if (appState !== 'racing' || !gameMountRef.current) return;

    const engine = new GameEngine(
      gameMountRef.current,
      selectedTrack,
      selectedVehicle,
      selectedMode,
      {
        onRaceUpdate: (data) => {
          setSpeedKmH(data.speedKmH);
          setGear(data.gear);
          setRpm(data.rpm);
          setNitroLevel(data.nitroLevel);
          setCurrentLap(data.currentLap);
          setTotalLaps(data.totalLaps);
          setPosition(data.position);
          setTotalRacers(data.totalRacers);
          setLapTime(data.lapTime);
          setBestLapTime(data.bestLapTime);
          setScore(data.score);
          setNotification(data.notification);

          if (engineRef.current) {
            setRacerPositions(engineRef.current.getRacerMiniMapPositions());
          }
        },
        onRaceFinish: (results) => {
          setIsFinished(true);
          setRaceResults(results);
          setPlayerCredits(prev => prev + results.creditsEarned);
        },
        onCountdownTick: (count) => {
          setCountdown(count);
          if (count === 'GO') {
            setTimeout(() => setCountdown(null), 1200);
          }
        },
      }
    );

    engineRef.current = engine;
    setMiniMapTrackPoints(engine.getTrackPoints());

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [appState, selectedTrack, selectedVehicle, selectedMode]);

  // Pause / Resume
  const handleTogglePause = () => {
    if (!engineRef.current) return;
    const next = !isPaused;
    setIsPaused(next);
    engineRef.current.setPaused(next);
  };

  // Restart Race
  const handleRestartRace = () => {
    if (engineRef.current) {
      engineRef.current.dispose();
      engineRef.current = null;
    }
    setIsPaused(false);
    setIsFinished(false);
    setRaceResults(null);
    setCountdown(3);

    // Re-mount by toggling
    setAppState('menu');
    setTimeout(() => {
      setAppState('racing');
    }, 50);
  };

  // Quit to Garage
  const handleQuitToMenu = () => {
    if (engineRef.current) {
      engineRef.current.dispose();
      engineRef.current = null;
    }
    setIsPaused(false);
    setIsFinished(false);
    setAppState('menu');
  };

  // Camera toggle
  const handleToggleCamera = () => {
    if (engineRef.current) {
      engineRef.current.toggleCamera();
      setCameraView(engineRef.current.cameraView);
    }
  };

  // Reset player to track
  const handleResetVehicle = () => {
    if (engineRef.current) {
      engineRef.current.resetPlayerToTrack();
    }
  };

  // Store purchases & customization
  const handleBuyVehicle = (vehicle: VehicleConfig) => {
    if (playerCredits >= vehicle.price && !unlockedVehicles.includes(vehicle.id)) {
      setPlayerCredits(prev => prev - vehicle.price);
      setUnlockedVehicles(prev => [...prev, vehicle.id]);
      setSelectedVehicle(vehicle);
      soundEngine.playVictory();
    }
  };

  const handleUpgradeVehicle = (vehicleId: string, part: 'engine' | 'transmission' | 'tires' | 'brakes' | 'nitro') => {
    const currentLvl = selectedVehicle.currentUpgrades[part] || 0;
    const cost = (currentLvl + 1) * 3500;
    if (playerCredits >= cost && currentLvl < 5) {
      setPlayerCredits(prev => prev - cost);
      setSelectedVehicle(prev => ({
        ...prev,
        currentUpgrades: {
          ...prev.currentUpgrades,
          [part]: currentLvl + 1,
        },
      }));
    }
  };

  const handleCustomizeVehicle = (vehicleId: string, custom: VehicleConfig['customization']) => {
    setSelectedVehicle(prev => ({
      ...prev,
      customization: custom,
    }));
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* MAIN MENU & SHOWROOM */}
      {appState === 'menu' && (
        <MainMenu
          playerCredits={playerCredits}
          unlockedVehicles={unlockedVehicles}
          selectedVehicle={selectedVehicle}
          selectedTrack={selectedTrack}
          selectedMode={selectedMode}
          onSelectVehicle={setSelectedVehicle}
          onSelectTrack={setSelectedTrack}
          onSelectMode={setSelectedMode}
          onStartRace={handleStartRace}
          onBuyVehicle={handleBuyVehicle}
          onUpgradeVehicle={handleUpgradeVehicle}
          onCustomizeVehicle={handleCustomizeVehicle}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* RACING VIEWPORT */}
      {appState === 'racing' && (
        <div className="relative w-full h-full">
          {/* Isolated WebGL Canvas Mount Container */}
          <div ref={gameMountRef} className="absolute inset-0 z-0 w-full h-full" />

          {/* HUD Overlay */}
          <HUD
            speedKmH={speedKmH}
            gear={gear}
            rpm={rpm}
            nitroLevel={nitroLevel}
            currentLap={currentLap}
            totalLaps={totalLaps}
            position={position}
            totalRacers={totalRacers}
            lapTime={lapTime}
            bestLapTime={bestLapTime}
            vehicleType={selectedVehicle.type}
            cameraView={cameraView}
            score={score}
            notification={notification}
            countdown={countdown}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onToggleCamera={handleToggleCamera}
            onResetVehicle={handleResetVehicle}
            onPause={handleTogglePause}
            miniMapTrackPoints={miniMapTrackPoints}
            racerPositions={racerPositions}
          />

          {/* Virtual Touch Controls for Mobile/Tablet */}
          <TouchControls
            isBike={selectedVehicle.type === 'bike'}
            onInputChange={(input) => {
              if (engineRef.current) {
                engineRef.current.touchInput = {
                  ...engineRef.current.touchInput,
                  ...input,
                };
              }
            }}
          />

          {/* Pause Menu Modal */}
          {isPaused && (
            <PauseMenu
              onResume={handleTogglePause}
              onRestart={handleRestartRace}
              onQuit={handleQuitToMenu}
              cameraView={cameraView}
              onToggleCamera={handleToggleCamera}
              isMuted={isMuted}
              onToggleMute={handleToggleMute}
            />
          )}

          {/* Victory Modal */}
          {isFinished && raceResults && (
            <VictoryModal
              position={raceResults.position}
              timeMs={raceResults.timeMs}
              creditsEarned={raceResults.creditsEarned}
              driftScore={raceResults.driftScore}
              wheelieScore={raceResults.wheelieScore}
              onRestart={handleRestartRace}
              onContinue={handleQuitToMenu}
            />
          )}
        </div>
      )}
    </div>
  );
}

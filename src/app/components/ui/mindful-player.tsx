import { useEffect, useState } from "react";
import { CloudRain, Waves, BrainCircuit, Volume2, VolumeX, Music } from "lucide-react";
import { ambienceService, type AmbienceMode } from "../../services/ambienceService";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { useReducedMotion } from "./use-reduced-motion";

export function MindfulPlayer() {
  const [mode, setMode] = useState<AmbienceMode>("none");
  const [volume, setVolume] = useState(0.2);
  const [isOpen, setIsOpen] = useState(false);
  const isReduced = useReducedMotion();

  useEffect(() => {
    setMode(ambienceService.getMode());
    setVolume(ambienceService.getVolume());
  }, []);

  const handleModeChange = (newMode: AmbienceMode) => {
    ambienceService.setMode(newMode);
    setMode(newMode);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    ambienceService.setVolume(vol);
    setVolume(vol);
  };

  const getModeLabel = (m: AmbienceMode) => {
    switch (m) {
      case "rain": return "Tiếng mưa rơi";
      case "ocean": return "Sóng biển vỗ";
      case "binaural": return "Sóng não tập trung";
      default: return "Không gian im lặng";
    }
  };

  const getModeIcon = (m: AmbienceMode) => {
    switch (m) {
      case "rain": return <CloudRain className="h-4 w-4" />;
      case "ocean": return <Waves className="h-4 w-4" />;
      case "binaural": return <BrainCircuit className="h-4 w-4" />;
      default: return <VolumeX className="h-4 w-4" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`relative h-9 rounded-full border border-app-line/60 bg-app-surface/40 backdrop-blur-md px-3 text-app-foreground transition-all duration-300 hover:border-app-accent/40 hover:bg-app-surface/80 ${
            mode !== "none" ? "shadow-md shadow-app-accent/5 ring-1 ring-app-accent/20" : ""
          }`}
          title="Không gian âm thanh chánh niệm"
        >
          <div className="flex items-center gap-2">
            {mode !== "none" ? (
              <span className="text-app-accent animate-pulse-slow">
                {getModeIcon(mode)}
              </span>
            ) : (
              <Music className="h-4 w-4 text-app-muted/80" />
            )}
            
            <span className="text-xs font-medium max-md:hidden">
              {mode !== "none" ? getModeLabel(mode) : "Âm thanh tập trung"}
            </span>

            {/* Micro Audio Visualizer Wave */}
            {mode !== "none" && !isReduced && (
              <div className="flex items-end gap-[2px] h-3 w-4 px-[1px]">
                <div className="w-[2px] bg-app-accent rounded-full animate-audio-wave-1 h-3" />
                <div className="w-[2px] bg-app-accent rounded-full animate-audio-wave-2 h-2" />
                <div className="w-[2px] bg-app-accent rounded-full animate-audio-wave-3 h-3" />
              </div>
            )}
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent 
        align="end" 
        className="w-72 p-4 rounded-2xl border border-app-line/60 bg-app-surface/90 backdrop-blur-xl shadow-2xl transition-all duration-300"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-app-line/40 pb-2">
            <h4 className="text-sm font-semibold tracking-wide text-app-foreground flex items-center gap-2">
              <Music className="h-4 w-4 text-app-accent" />
              Âm Thanh Chánh Niệm
            </h4>
            <span className="text-[10px] uppercase font-bold tracking-widest text-app-accent bg-app-accent/10 px-2 py-0.5 rounded-full">
              Zen Mode
            </span>
          </div>

          <p className="text-xs text-app-muted">
            Tạo không gian âm thanh êm dịu tổng hợp trực tiếp trên trình duyệt để tăng cường tập trung học tập và làm việc.
          </p>

          {/* Soundscapes Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {(["none", "rain", "ocean", "binaural"] as AmbienceMode[]).map((m) => {
              const active = mode === m;
              return (
                <button
                  type="button"
                  key={m}
                  onClick={() => handleModeChange(m)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all duration-300 ${
                    active
                      ? "border-app-accent bg-app-accent/10 text-app-accent shadow-sm"
                      : "border-app-line/40 bg-app-surface/30 text-app-foreground hover:border-app-line hover:bg-app-surface/70"
                  }`}
                >
                  <span className={`mb-1.5 p-1.5 rounded-lg ${active ? "bg-app-accent/15 text-app-accent" : "bg-app-muted/10 text-app-muted"}`}>
                    {getModeIcon(m)}
                  </span>
                  <span className="text-[11px] font-medium leading-tight">
                    {m === "none" ? "Im lặng" : m === "rain" ? "Mưa rơi" : m === "ocean" ? "Sóng biển" : "Sóng não"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Volume Control */}
          {mode !== "none" && (
            <div className="space-y-2 pt-2 border-t border-app-line/40 animate-fade-in">
              <div className="flex items-center justify-between text-xs font-medium text-app-foreground">
                <span className="flex items-center gap-1.5 text-app-muted">
                  <Volume2 className="h-3.5 w-3.5" />
                  Âm lượng
                </span>
                <span className="text-app-accent">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="w-full h-1 bg-app-line rounded-lg appearance-none cursor-pointer accent-app-accent focus:outline-none focus:ring-0"
              />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

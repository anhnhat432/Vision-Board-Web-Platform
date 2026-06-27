export type AssistantPetState =
  | "idle"
  | "running-right"
  | "running-left"
  | "waving"
  | "jumping"
  | "failed"
  | "waiting"
  | "running"
  | "review";

interface AssistantPetIconProps {
  state?: AssistantPetState;
  size?: number;
  animated?: boolean;
  className?: string;
  title?: string;
}

const PET_ROWS: Record<AssistantPetState, { row: number; frames: number; durationMs: number }> = {
  idle: { row: 0, frames: 6, durationMs: 1100 },
  "running-right": { row: 1, frames: 8, durationMs: 1060 },
  "running-left": { row: 2, frames: 8, durationMs: 1060 },
  waving: { row: 3, frames: 4, durationMs: 700 },
  jumping: { row: 4, frames: 5, durationMs: 840 },
  failed: { row: 5, frames: 8, durationMs: 1220 },
  waiting: { row: 6, frames: 6, durationMs: 1010 },
  running: { row: 7, frames: 6, durationMs: 820 },
  review: { row: 8, frames: 6, durationMs: 1030 },
};

export function AssistantPetIcon({
  state = "idle",
  size = 40,
  animated = true,
  className = "",
  title,
}: AssistantPetIconProps) {
  const row = PET_ROWS[state];
  const frameHeight = Math.round((size * 208) / 192);
  const accessibilityProps = title ? { role: "img" as const, "aria-label": title } : { "aria-hidden": true as const };

  return (
    <span
      {...accessibilityProps}
      className={`assistant-pet-sprite inline-flex shrink-0 ${animated ? "" : "assistant-pet-sprite--still"} ${className}`}
      data-state={state}
      data-animated={animated ? "true" : "false"}
      style={{
        width: size,
        height: frameHeight,
        ["--pet-size" as string]: `${size}px`,
        ["--pet-frames" as string]: row.frames,
        ["--pet-bg-width" as string]: `${size * 8}px`,
        ["--pet-bg-height" as string]: `${frameHeight * 9}px`,
        ["--pet-y" as string]: `${row.row * -frameHeight}px`,
        ["--pet-end-x" as string]: `${row.frames * -size}px`,
        ["--pet-duration" as string]: `${row.durationMs}ms`,
      }}
    />
  );
}

declare module "canvas-confetti" {
  type ConfettiOptions = Record<string, unknown>;
  type GlobalOptions = Record<string, unknown>;
  type ConfettiInstance = (options?: ConfettiOptions) => Promise<null> | null;

  interface ConfettiFn extends ConfettiInstance {
    create(canvas: HTMLCanvasElement, options?: GlobalOptions): ConfettiInstance;
    reset(): void;
  }

  const confetti: ConfettiFn;
  export default confetti;
}

interface MamCompanionBubbleProps {
  message: string;
}

export function MamCompanionBubble({ message }: MamCompanionBubbleProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="max-w-[18rem] rounded-2xl border border-app-line bg-app-surface/95 px-3.5 py-2.5 text-[12px] font-semibold leading-5 text-app-ink shadow-app-md"
    >
      {message}
    </div>
  );
}

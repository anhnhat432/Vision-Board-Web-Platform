import { type AmbientIllustrationProps, useIllustrationId } from "../utils";

function TaskDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="4" y1="4" x2="21" y2="21" gradientUnits="userSpaceOnUse">
        <stop stopColor="currentColor" stopOpacity="var(--mini-icon-strong, 0.72)" />
        <stop offset="1" stopColor="currentColor" stopOpacity="var(--mini-icon-soft, 0.18)" />
      </linearGradient>
    </defs>
  );
}

export function TaskTodoIcon({ className, ...rest }: AmbientIllustrationProps) {
  const id = useIllustrationId("task-todo");
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      role="presentation"
      className={className}
      {...rest}
    >
      <TaskDefs id={id} />
      <circle cx="12" cy="12" r="8.5" stroke={`url(#${id})`} strokeWidth="2" />
      <circle cx="12" cy="12" r="2.4" fill="currentColor" opacity="0.16" />
    </svg>
  );
}

export function TaskInProgressIcon({ className, ...rest }: AmbientIllustrationProps) {
  const id = useIllustrationId("task-progress");
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      role="presentation"
      className={className}
      {...rest}
    >
      <TaskDefs id={id} />
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" />
      <path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill={`url(#${id})`} />
      <path d="M12 3.5a8.5 8.5 0 0 1 0 17" stroke={`url(#${id})`} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function TaskDoneIcon({ className, ...rest }: AmbientIllustrationProps) {
  const id = useIllustrationId("task-done");
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      role="presentation"
      className={className}
      {...rest}
    >
      <TaskDefs id={id} />
      <circle cx="12" cy="12" r="9" fill={`url(#${id})`} />
      <path d="M7.6 12.2l3 3L16.8 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

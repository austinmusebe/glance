import { useState } from "react";

interface ProcessIconProps {
  icon?: string | null;
  name: string;
  className?: string;
}

export function ProcessIcon({ icon, name, className = "w-3.5 h-3.5" }: ProcessIconProps) {
  const [error, setError] = useState(false);

  if (icon && !error) {
    return (
      <img
        src={icon}
        alt={name}
        onError={() => setError(true)}
        className={`${className} shrink-0 rounded-[2px] object-contain`}
        loading="lazy"
      />
    );
  }

  // Fallback crisp mini app window SVG
  return (
    <div
      className={`${className} shrink-0 rounded-[2px] bg-white/10 flex items-center justify-center text-muted border border-border/50`}
      title={name}
      aria-hidden="true"
    >
      <svg
        width="9"
        height="9"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M3 9h18" />
      </svg>
    </div>
  );
}

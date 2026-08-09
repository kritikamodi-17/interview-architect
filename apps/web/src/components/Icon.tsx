import type { SVGProps } from "react";

export type IconName =
  | "arrow-right"
  | "arrow-up-right"
  | "book"
  | "bookmark"
  | "bookmark-filled"
  | "calendar"
  | "check"
  | "chevron-down"
  | "chevron-right"
  | "clock"
  | "compass"
  | "filter"
  | "flame"
  | "grid"
  | "info"
  | "layers"
  | "lightbulb"
  | "list"
  | "menu"
  | "play"
  | "refresh"
  | "search"
  | "sliders"
  | "sparkle"
  | "target"
  | "trend"
  | "x";

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, ...props }: IconProps): React.JSX.Element {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props
  };

  switch (name) {
    case "arrow-right":
      return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
    case "arrow-up-right":
      return <svg {...common}><path d="M7 17 17 7M9 7h8v8" /></svg>;
    case "book":
      return <svg {...common}><path d="M4.5 5.7A3.7 3.7 0 0 1 8 4h11.5v15H8a3.5 3.5 0 0 0-3.5 1.7V5.7Z" /><path d="M4.5 5.7v14.8M8 8h8" /></svg>;
    case "bookmark":
      return <svg {...common}><path d="M6.5 4.5A1.5 1.5 0 0 1 8 3h8a1.5 1.5 0 0 1 1.5 1.5V21l-5.5-3.3L6.5 21V4.5Z" /></svg>;
    case "bookmark-filled":
      return <svg {...common} fill="currentColor"><path d="M6.5 4.5A1.5 1.5 0 0 1 8 3h8a1.5 1.5 0 0 1 1.5 1.5V21l-5.5-3.3L6.5 21V4.5Z" /></svg>;
    case "calendar":
      return <svg {...common}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M7.5 3v4M16.5 3v4M3.5 10h17" /></svg>;
    case "check":
      return <svg {...common}><path d="m5 12 4.2 4.2L19 6.5" /></svg>;
    case "chevron-down":
      return <svg {...common}><path d="m6.5 9 5.5 5.5L17.5 9" /></svg>;
    case "chevron-right":
      return <svg {...common}><path d="m9 5.5 5.5 6.5L9 18.5" /></svg>;
    case "clock":
      return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></svg>;
    case "compass":
      return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="m14.8 9.2-2.2 5.6-3.4.9.8-3.5 4.8-2.9Z" /></svg>;
    case "filter":
      return <svg {...common}><path d="M4 5h16M7 12h10M10 19h4" /></svg>;
    case "flame":
      return <svg {...common}><path d="M13.5 3.5c.5 4-2.2 4.8-2.2 7.6 0 1.4.8 2.5 2.2 2.5 1.7 0 2.7-1.4 2.3-3.7 2.7 2.2 3.7 4.3 3.2 6.6-.6 3-3.1 4.8-6.8 4.8-4.3 0-7.2-2.5-7.2-6.2 0-3.6 2.3-6.7 5.7-9.8-.3 2.2.2 3.4 1.5 3.9" /></svg>;
    case "grid":
      return <svg {...common}><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>;
    case "info":
      return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M12 10.5v5M12 7.7h.01" /></svg>;
    case "layers":
      return <svg {...common}><path d="m12 3.5 8 4.4-8 4.4-8-4.4 8-4.4Z" /><path d="m4 12 8 4.4 8-4.4M4 16.1l8 4.4 8-4.4" /></svg>;
    case "lightbulb":
      return <svg {...common}><path d="M8.5 17.1h7M9.7 20h4.6M8.1 14.3c-1.1-.9-1.8-2.3-1.8-3.8a5.7 5.7 0 1 1 11.4 0c0 1.5-.7 2.9-1.8 3.8-.8.7-1.1 1.5-1.2 2.1H9.3c-.1-.6-.4-1.4-1.2-2.1Z" /></svg>;
    case "list":
      return <svg {...common}><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></svg>;
    case "menu":
      return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
    case "play":
      return <svg {...common}><path d="m8.5 5.5 10 6.5-10 6.5v-13Z" /></svg>;
    case "refresh":
      return <svg {...common}><path d="M20 11a8.2 8.2 0 0 0-14.5-4L3.5 9M4 4v5h5M4 13a8.2 8.2 0 0 0 14.5 4l2-2M20 20v-5h-5" /></svg>;
    case "search":
      return <svg {...common}><circle cx="10.7" cy="10.7" r="6.4" /><path d="m16 16 4.2 4.2" /></svg>;
    case "sliders":
      return <svg {...common}><path d="M4 7h5M14 7h6M4 17h9M18 17h2" /><circle cx="11" cy="7" r="2" /><circle cx="15" cy="17" r="2" /></svg>;
    case "sparkle":
      return <svg {...common}><path d="m12 3 1.2 5.2L18 10l-4.8 1.2L12 16l-1.2-4.8L6 10l4.8-1.8L12 3ZM19 15l.6 2.4L22 18l-2.4.6L19 21l-.6-2.4L16 18l2.4-.6L19 15Z" /></svg>;
    case "target":
      return <svg {...common}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.2" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2" /></svg>;
    case "trend":
      return <svg {...common}><path d="M4 18 9.5 12.5l3.5 3.5L20 8.5" /><path d="M15 8.5h5v5" /></svg>;
    case "x":
      return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>;
  }
}

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/* ─── Types ─── */
type Size = "sm" | "md" | "lg" | "xl";
type AnimateMode = "hover" | "mount" | "loop" | "none";
type ColorScheme = "auto" | "light" | "dark";

interface AideLogoProps {
  size?: Size;
  animate?: AnimateMode;
  colorScheme?: ColorScheme;
  className?: string;
}

/* ─── Size config ─── */
const sizeConfig: Record<Size, { swash: string; text: string; glow: number }> =
  {
    sm: { swash: "text-3xl", text: "text-xl", glow: 10 },
    md: { swash: "text-4xl", text: "text-2xl", glow: 16 },
    lg: { swash: "text-5xl", text: "text-3xl", glow: 22 },
    xl: { swash: "text-6xl", text: "text-4xl", glow: 28 },
  };

/* ─── Main AideLogo ─── */
export function AideLogo({
  size = "md",
  animate = "hover",
  colorScheme = "auto",
  className,
}: AideLogoProps) {
  const shouldReduce = useReducedMotion();
  const [isRevealed, setIsRevealed] = React.useState(false);
  const cfg = sizeConfig[size];

  const isDark = colorScheme === "dark";
  const gradFrom = isDark ? "#22D3EE" : "var(--primary)";
  const gradTo = isDark ? "#4ADE80" : "var(--accent)";
  const baseColor = isDark ? "rgba(255,255,255,0.92)" : "var(--foreground)";
  const shimmerHighlight = isDark
    ? "rgba(34,211,238,0.7)"
    : "rgba(8,145,178,0.55)";

  // Mount / loop triggers
  React.useEffect(() => {
    if (animate === "mount" && !shouldReduce) {
      const timer = setTimeout(() => setIsRevealed(true), 600);
      return () => clearTimeout(timer);
    }
    if (animate === "loop" && !shouldReduce) {
      setIsRevealed(true);
      const interval = setInterval(() => setIsRevealed((p) => !p), 3000);
      return () => clearInterval(interval);
    }
  }, [animate, shouldReduce]);

  const hoverHandlers =
    animate === "hover" && !shouldReduce
      ? {
          onMouseEnter: () => setIsRevealed(true),
          onMouseLeave: () => setIsRevealed(false),
        }
      : {};

  const shimmerGradient = `linear-gradient(90deg, ${baseColor} 0%, ${baseColor} 35%, ${shimmerHighlight} 50%, ${baseColor} 65%, ${baseColor} 100%)`;
  const revealedA = `linear-gradient(135deg, ${gradFrom} 0%, ${gradTo} 100%)`;
  const revealedIde = `linear-gradient(90deg, ${gradFrom} 0%, ${gradTo} 100%)`;

  const clipText: React.CSSProperties = {
    lineHeight: 1,
    backgroundSize: "300% 100%",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  };

  const g = cfg.glow;
  const revealed = isRevealed && !shouldReduce;

  return (
    <motion.div
      className={cn(
        "inline-flex items-baseline relative select-none cursor-default overflow-visible",
        className,
      )}
      aria-label="Aide - AI for Emergency Department"
      {...hoverHandlers}
      initial={animate === "mount" ? { opacity: 0, y: 6 } : undefined}
      animate={animate === "mount" ? { opacity: 1, y: 0 } : undefined}
      transition={
        animate === "mount"
          ? { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
          : undefined
      }
    >
      {/* "A" — Delius Swash Caps */}
      <motion.span
        className={cn(cfg.swash)}
        style={{
          ...clipText,
          fontFamily: "'Delius Swash Caps', cursive",
          fontWeight: 700,
          backgroundImage: shimmerGradient,
          animation: shouldReduce
            ? "none"
            : "aide-logo-shimmer 4s ease-in-out infinite",
        }}
        animate={
          isRevealed && !shouldReduce
            ? { backgroundImage: revealedA }
            : { backgroundImage: shimmerGradient }
        }
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        A
      </motion.span>

      {/* "ide" — Figtree */}
      <motion.span
        className={cn(cfg.text)}
        style={{
          ...clipText,
          fontFamily: "'Figtree', sans-serif",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          backgroundImage: shimmerGradient,
          animation: shouldReduce
            ? "none"
            : "aide-logo-shimmer 4s ease-in-out infinite",
          animationDelay: "0.15s",
        }}
        animate={
          isRevealed && !shouldReduce
            ? { backgroundImage: revealedIde }
            : { backgroundImage: shimmerGradient }
        }
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
      >
        ide
      </motion.span>

      {/*
        ── Performance-first glow system ──
        Key principle from the reference: NEVER animate box-shadow or filter.
        Instead, pre-render all glow layers at full intensity but opacity:0,
        then only animate opacity (GPU-composited, no repaints).
      */}
      <span
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          bottom: "-3px",
          height: "2px",
          willChange: "opacity",
        }}
      >
        {/* === DEFAULT STATE: thin subtle line (always visible) === */}
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${gradFrom}, ${gradTo})`,
            opacity: revealed ? 0 : 0.25,
            transition: "opacity 0.35s ease-out",
          }}
        />

        {/* === REVEALED STATE: full glow (pre-rendered, opacity-only transition) === */}

        {/* Core tube line — bright, crisp */}
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${gradFrom}, ${gradTo})`,
            opacity: revealed ? 1 : 0,
            transition: "opacity 0.35s ease-out",
          }}
        />

        {/* Inset glow — makes the tube look lit from within (box-shadow, but NOT animated) */}
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${gradFrom}, ${gradTo})`,
            boxShadow: isDark
              ? `0 0 ${g * 0.5}px rgba(34,211,238,0.8), inset 0 0 ${g * 0.3}px rgba(255,255,255,0.5)`
              : `0 0 ${g * 0.4}px rgba(8,145,178,0.5), inset 0 0 ${g * 0.2}px rgba(255,255,255,0.4)`,
            opacity: revealed ? 1 : 0,
            transition: "opacity 0.35s ease-out",
          }}
        />

        {/* White hotspot — bright core highlight */}
        <span
          className="absolute left-0 right-0 rounded-full"
          style={{
            top: "-1px",
            height: "4px",
            background: `linear-gradient(90deg,
              rgba(255,255,255,0.65),
              rgba(255,255,255,0.15) 40%,
              rgba(255,255,255,0.65)
            )`,
            filter: `blur(${Math.max(2, g * 0.08)}px)`,
            opacity: revealed ? (isDark ? 0.9 : 0.5) : 0,
            transition: "opacity 0.35s ease-out",
          }}
        />

        {/*
          ── 3D Ground reflection ──
          Uses perspective + rotateX to project the glow onto a "floor" plane,
          exactly like the video's ::before pseudo-element technique.
          The blur is STATIC (pre-rendered), only opacity animates.
        */}
        <span
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: "2px",
            height: `${g * 5}px`,
            transform: `perspective(${g * 8}px) rotateX(40deg)`,
            transformOrigin: "top center",
            background: `radial-gradient(ellipse 80% 40% at 50% 0%,
              ${isDark ? "rgba(34,211,238,0.35)" : "rgba(8,145,178,0.22)"} 0%,
              ${isDark ? "rgba(74,222,128,0.18)" : "rgba(34,197,94,0.10)"} 30%,
              transparent 70%
            )`,
            filter: `blur(${g * 0.4}px)`,
            opacity: revealed ? 1 : 0,
            transition: "opacity 0.4s ease-out 0.08s",
          }}
        />

        {/* Inner reflection — tighter, brighter for definition */}
        <span
          className="absolute pointer-events-none"
          style={{
            left: "10%",
            right: "10%",
            top: "2px",
            height: `${g * 3.5}px`,
            transform: `perspective(${g * 6}px) rotateX(35deg)`,
            transformOrigin: "top center",
            background: `radial-gradient(ellipse 70% 50% at 50% 0%,
              rgba(255,255,255,${isDark ? "0.18" : "0.10"}) 0%,
              transparent 60%
            )`,
            filter: `blur(${g * 0.25}px)`,
            opacity: revealed ? 1 : 0,
            transition: "opacity 0.4s ease-out 0.08s",
          }}
        />
      </span>
    </motion.div>
  );
}

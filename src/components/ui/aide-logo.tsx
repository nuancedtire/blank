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

  return (
    <motion.div
      className={cn(
        // Allow glow/blur to extend outside without being clipped (overflow-visible => overflow: visible) [web:77]
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

      {/* ── Tube light underline + downward cone spill (like reference) ── */}
      <motion.span
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          bottom: "-3px",
          height: "2px",
          transformOrigin: "left center",
        }}
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{
          opacity: isRevealed && !shouldReduce ? 1 : 0,
          scaleX: isRevealed && !shouldReduce ? 1 : 0,
        }}
        transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
      >
        {/* Tube core line */}
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${gradFrom}, ${gradTo})`,
            boxShadow: isDark
              ? `0 0 ${g * 0.9}px rgba(34,211,238,0.55), 0 0 ${g * 1.4}px rgba(74,222,128,0.35)`
              : `0 0 ${g * 0.7}px rgba(8,145,178,0.25)`,
          }}
        />

        {/* Slight tube hotspot (thicker + blurred) */}
        <span
          className="absolute left-0 right-0 rounded-full"
          style={{
            top: "-1px",
            height: "4px",
            background: `linear-gradient(90deg,
              rgba(255,255,255,0.70),
              rgba(255,255,255,0.18) 35%,
              rgba(255,255,255,0.70)
            )`,
            filter: `blur(${Math.max(2, g * 0.08)}px)`,
            opacity: isDark ? 0.95 : 0.55,
            mixBlendMode: isDark ? "screen" : "multiply",
          }}
        />

        {/* Hot bloom right under the tube */}
        <span
          className="absolute left-0 right-0 mx-auto"
          style={{
            top: "1px",
            width: "170%",
            transform: "translateX(-20%)",
            height: `${Math.max(10, g * 1.05)}px`,
            background: `radial-gradient(closest-side,
              rgba(255,255,255,0.55),
              rgba(255,255,255,0.00) 65%
            )`,
            filter: `blur(${g * 0.25}px)`,
            opacity: isDark ? 0.9 : 0.45,
            mixBlendMode: isDark ? "screen" : "normal",
          }}
        />

        {/* Downward cone spill (triangle-ish) */}
        <motion.span
          className="absolute pointer-events-none"
          style={{
            left: `-${g}px`,
            right: `-${g}px`, // room for blur at edges
            top: "2px", // start below the line
            height: `${g * 6}px`,
            transformOrigin: "left center",
            originX: 0, // originX/originY are Motion transform-origin shortcuts [web:16]
            background: `linear-gradient(180deg,
              rgba(34,211,238,0.28) 0%,
              rgba(74,222,128,0.16) 5%,
              rgba(74,222,128,0.00) 20%
            )`, // 180deg == "to bottom" [web:31]
            clipPath: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)",
            filter: `blur(${g * 0.58}px)`,
            opacity: isDark ? 1 : 0.55,
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isRevealed && !shouldReduce ? 1 : 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
        />

        {/* Inner cone for definition */}
        <motion.span
          className="absolute pointer-events-none"
          style={{
            left: `calc(10% - ${g}px)`,
            right: `calc(10% - ${g}px)`,
            top: "2px",
            height: `${g * 4.8}px`,
            transformOrigin: "left center",
            originX: 0,
            background: `linear-gradient(180deg,
              rgba(255,255,255,0.16) 0%,
              rgba(255,255,255,0.06) 5%,
              rgba(255,255,255,0.00) 30%
            )`,
            clipPath: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)",
            filter: `blur(${g * 0.38}px)`,
            opacity: isDark ? 0.75 : 0.3,
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isRevealed && !shouldReduce ? 1 : 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
        />
      </motion.span>
    </motion.div>
  );
}

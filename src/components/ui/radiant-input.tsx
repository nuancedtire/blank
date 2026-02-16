import React, { useState } from "react";
import { Plus, Mic, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RadiantPromptInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export function RadiantPromptInput({
  placeholder = "Ask anything...",
  value: propValue,
  onChange: propOnChange,
  onSubmit,
  className,
  disabled,
}: RadiantPromptInputProps) {
  const [internalValue, setInternalValue] = useState("");
  const isControlled = propValue !== undefined;
  const value = isControlled ? propValue : internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) {
      setInternalValue(e.target.value);
    }
    propOnChange?.(e.target.value);
  };

  const handleSubmit = () => {
    if (value && !disabled) {
      onSubmit?.(value);
      if (!isControlled) setInternalValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn("relative w-full max-w-3xl mx-auto", className)}>
      <style>{`
        @property --rotation {
          syntax: '<angle>';
          inherits: false;
          initial-value: 0deg;
        }

        @keyframes rotate-gradient {
          to {
            --rotation: 360deg;
          }
        }

        .radiant-input-wrapper {
          --border-size: 3px;
          --gradient: conic-gradient(
            from var(--rotation)
            at 50% 50% in oklab,
            oklch(0.55 0.18 195) 27%,
            oklch(0.68 0.14 160) 33%,
            oklch(0.72 0.12 180) 41%,
            oklch(0.65 0.16 145) 49%,
            oklch(0.55 0.18 195) 65%,
            oklch(0.60 0.15 175) 93%,
            oklch(0.55 0.18 195)
          );
          animation: rotate-gradient 5s infinite linear;
        }

        .radiant-input-wrapper::before {
          content: '';
          position: absolute;
          inset: calc(var(--border-size) * -1);
          border-radius: inherit;
          background: var(--gradient);
          z-index: -1;
          filter: blur(8px);
          opacity: 0.6;
        }

        .radiant-input-border {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: var(--border-size);
          background: var(--gradient);
          -webkit-mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
      `}</style>

      <div className="radiant-input-wrapper relative rounded-full bg-card group transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
        {/* Animated Gradient Border */}
        <div className="radiant-input-border rounded-full" />

        {/* Inner Content */}
        <div className="relative z-10 flex items-center gap-2 p-1.5 pl-4 pr-1.5 h-14 md:h-16">
          {/* Add Button */}
          <button
            type="button"
            className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full text-muted-foreground hover:bg-background hover:text-primary transition-colors cursor-pointer"
            aria-label="Add attachment"
          >
            <Plus size={20} strokeWidth={2} />
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/70 text-base md:text-lg font-light tracking-wide h-full w-full min-w-0"
          />

          {/* Right Actions */}
          <div className="flex items-center gap-1 md:gap-2">
            {/* Mic Button */}
            <button
              type="button"
              className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full text-muted-foreground hover:bg-background hover:text-primary transition-colors cursor-pointer"
              aria-label="Use microphone"
            >
              <Mic size={20} strokeWidth={2} />
            </button>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!value || disabled}
              className={cn(
                "flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full transition-all duration-300 cursor-pointer",
                value
                  ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:scale-105 active:scale-95 shadow-lg shadow-primary/30"
                  : "bg-muted text-primary/50 cursor-not-allowed",
              )}
              aria-label="Send message"
            >
              <ArrowUp size={22} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RadiantPromptInput;

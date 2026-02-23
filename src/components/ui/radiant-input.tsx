import React, { useState } from "react";
import { Search, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type SearchScopeOption =
  | "local"
  | "web";

export type SearchModeOption = "local" | "web";

export interface RadiantPromptInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  mode?: SearchModeOption;
  onModeChange?: (value: SearchModeOption) => void;
  className?: string;
  disabled?: boolean;
}

export function RadiantPromptInput({
  placeholder = "Ask anything...",
  value: propValue,
  onChange: propOnChange,
  onSubmit,
  mode = "local",
  onModeChange,
  className,
  disabled,
}: RadiantPromptInputProps) {
  const [internalValue, setInternalValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const isControlled = propValue !== undefined;
  const value = isControlled ? propValue : internalValue;
  const isExpanded = isFocused || value.trim().length > 0;

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
      <div
        className={cn(
          "border border-border/70 bg-card shadow-sm transition-all duration-150",
          isExpanded ? "rounded-2xl" : "rounded-xl",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 px-3 md:px-4",
            isExpanded ? "py-3" : "py-2.5",
          )}
        >
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />

          <input
            type="text"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/70 min-w-0 transition-all",
              isExpanded ? "text-base h-10" : "text-[15px] h-8",
            )}
          />

          <div className="inline-flex items-center rounded-lg bg-muted/70 p-1 shrink-0">
            <button
              type="button"
              onClick={() => onModeChange?.("local")}
              className={cn(
                "h-8 px-2.5 sm:px-3 text-xs rounded-md transition-colors min-w-[44px]",
                mode === "local"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="Search local documents"
            >
              Local
            </button>
            <button
              type="button"
              onClick={() => onModeChange?.("web")}
              className={cn(
                "h-8 px-2.5 sm:px-3 text-xs rounded-md transition-colors min-w-[44px]",
                mode === "web"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="Search web guidance"
            >
              Web
            </button>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!value || disabled}
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-150 cursor-pointer shrink-0",
              value
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
            aria-label="Send message"
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div
          className={cn(
            "flex items-center justify-start overflow-hidden transition-all duration-150",
            isExpanded
              ? "max-h-10 border-t border-border/70 px-3 py-2 opacity-100"
              : "max-h-0 border-t border-transparent px-3 py-0 opacity-0",
          )}
        >
          <p className="text-[11px] text-muted-foreground">
            {mode === "local"
              ? "Searching local guidelines as you type."
              : "Searching NICE + RCEM web sources as you type."}
          </p>
        </div>
      </div>
    </div>
  );
}

export default RadiantPromptInput;

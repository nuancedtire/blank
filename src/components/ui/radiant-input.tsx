import React, { useState } from "react";
import { Plus, Mic, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SearchScopeOption =
  | "all"
  | "local"
  | "external_all"
  | "external_nice"
  | "external_rcem";

export interface RadiantPromptInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  searchScope?: SearchScopeOption;
  onSearchScopeChange?: (value: SearchScopeOption) => void;
  className?: string;
  disabled?: boolean;
}

export function RadiantPromptInput({
  placeholder = "Ask anything...",
  value: propValue,
  onChange: propOnChange,
  onSubmit,
  searchScope = "all",
  onSearchScopeChange,
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
      <div className="rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="flex items-center gap-2 px-3 py-2.5 md:px-4 md:py-3">
          <button
            type="button"
            className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors cursor-pointer"
            aria-label="Add attachment"
          >
            <Plus size={18} strokeWidth={2} />
          </button>

          <input
            type="text"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/70 text-[15px] md:text-base h-9 min-w-0"
          />

          <button
            type="button"
            className="hidden md:flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors cursor-pointer"
            aria-label="Use microphone"
          >
            <Mic size={18} strokeWidth={2} />
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!value || disabled}
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-150 cursor-pointer",
              value
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
            aria-label="Send message"
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </button>
        </div>

        {onSearchScopeChange && (
          <div className="flex items-center justify-between border-t border-border/70 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Ask and press Enter</p>
            <Select
              value={searchScope}
              onValueChange={(value) =>
                onSearchScopeChange(value as SearchScopeOption)
              }
            >
              <SelectTrigger
                size="sm"
                className="h-8 rounded-md border-border/70 bg-background text-xs min-w-[128px]"
                aria-label="Search scope"
              >
                <SelectValue placeholder="Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="local">Local only</SelectItem>
                <SelectItem value="external_all">NICE + RCEM</SelectItem>
                <SelectItem value="external_nice">NICE only</SelectItem>
                <SelectItem value="external_rcem">RCEM only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}

export default RadiantPromptInput;

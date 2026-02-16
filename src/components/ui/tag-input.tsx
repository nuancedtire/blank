import * as React from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function TagInput({
  tags,
  onTagsChange,
  placeholder = "Add tag...",
  className,
  disabled,
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const addTag = (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onTagsChange([...tags, trimmed]);
    }
    setInputValue("");
  };

  const removeTag = (tag: string) => {
    onTagsChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    const newTags = pasted
      .split(/[,\n]/)
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t && !tags.includes(t));
    if (newTags.length > 0) {
      onTagsChange([...tags, ...newTags]);
    }
  };

  return (
    <div
      className={cn(
        "flex min-h-8 w-full flex-wrap items-center gap-1.5 rounded-xl border border-input bg-transparent px-2 py-1 text-sm transition-shadow focus-within:ring-2 focus-within:ring-primary/20",
        disabled && "opacity-50 pointer-events-none",
        className,
      )}
      onClick={() => inputRef.current?.focus()}
    >
      <AnimatePresence mode="popLayout">
        {tags.map((tag) => (
          <motion.span
            key={tag}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="inline-flex items-center gap-0.5 rounded-md bg-secondary px-1.5 py-0 text-[11px] font-medium text-secondary-foreground"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="ml-0.5 rounded-sm p-0 hover:bg-secondary-foreground/20 transition-colors"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => {
          if (inputValue.trim()) addTag(inputValue);
        }}
        placeholder={tags.length === 0 ? placeholder : ""}
        disabled={disabled}
        className="flex-1 min-w-[60px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

export { TagInput };

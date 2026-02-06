import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface GuidelineContentProps {
  title: string;
  content: string;
  version: string;
  source: "local" | "rcem" | "nice";
  category: string;
  lastUpdated: number;
}

const sourceLabels: Record<string, { label: string; className: string }> = {
  local: {
    label: "Local Guideline",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  rcem: {
    label: "RCEM Guideline",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  nice: {
    label: "NICE Guideline",
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
};

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Simple markdown-to-HTML renderer for guideline content
// Handles: headings, bold, lists, tables, horizontal rules
function renderMarkdown(content: string): string {
  const lines = content.split("\n");
  let html = "";
  let inTable = false;
  let inList = false;
  let listType: "ul" | "ol" = "ul";

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Close list if line is not a list item
    if (inList && !line.match(/^(\s*[-*]\s|^\s*\d+\.\s)/)) {
      html += `</${listType}>`;
      inList = false;
    }

    // Table handling
    if (line.startsWith("|")) {
      if (!inTable) {
        html += '<div class="overflow-x-auto my-4"><table class="w-full text-sm border-collapse">';
        inTable = true;
      }
      // Skip separator rows
      if (line.match(/^\|[\s-|:]+\|$/)) continue;

      const cells = line
        .split("|")
        .filter((c) => c.trim() !== "");
      const isHeader = i + 1 < lines.length && (lines[i + 1] ?? "").match(/^\|[\s-|:]+\|$/);
      const tag = isHeader ? "th" : "td";
      const cellClass =
        tag === "th"
          ? "border border-border px-3 py-2 bg-muted font-medium text-left"
          : "border border-border px-3 py-2";

      html += "<tr>";
      for (const cell of cells) {
        html += `<${tag} class="${cellClass}">${formatInline(cell.trim())}</${tag}>`;
      }
      html += "</tr>";
      continue;
    } else if (inTable) {
      html += "</table></div>";
      inTable = false;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const sizes: Record<number, string> = {
        1: "text-2xl font-bold mt-6 mb-3",
        2: "text-xl font-bold mt-5 mb-2",
        3: "text-lg font-semibold mt-4 mb-2",
        4: "text-base font-semibold mt-3 mb-1",
        5: "text-sm font-semibold mt-2 mb-1",
        6: "text-sm font-medium mt-2 mb-1",
      };
      html += `<h${level} class="${sizes[level]}">${formatInline(text)}</h${level}>`;
      continue;
    }

    // Horizontal rule
    if (line.match(/^---+$/)) {
      html += '<hr class="my-4 border-border" />';
      continue;
    }

    // Unordered list items
    const ulMatch = line.match(/^(\s*)[-*]\s+(.+)/);
    if (ulMatch) {
      if (!inList || listType !== "ul") {
        if (inList) html += `</${listType}>`;
        html += '<ul class="list-disc pl-6 my-2 space-y-1">';
        inList = true;
        listType = "ul";
      }
      html += `<li class="text-sm">${formatInline(ulMatch[2])}</li>`;
      continue;
    }

    // Ordered list items
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)/);
    if (olMatch) {
      if (!inList || listType !== "ol") {
        if (inList) html += `</${listType}>`;
        html += '<ol class="list-decimal pl-6 my-2 space-y-1">';
        inList = true;
        listType = "ol";
      }
      html += `<li class="text-sm">${formatInline(olMatch[2])}</li>`;
      continue;
    }

    // Empty lines
    if (line.trim() === "") {
      continue;
    }

    // Regular paragraph
    html += `<p class="text-sm my-2 leading-relaxed">${formatInline(line)}</p>`;
  }

  // Close open elements
  if (inList) html += `</${listType}>`;
  if (inTable) html += "</table></div>";

  return html;
}

function formatInline(text: string): string {
  // Bold **text** or __text__
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
  text = text.replace(/__(.+?)__/g, '<strong class="font-semibold">$1</strong>');
  // Italic *text* or _text_
  text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");
  text = text.replace(/_(.+?)_/g, "<em>$1</em>");
  // Inline code
  text = text.replace(
    /`(.+?)`/g,
    '<code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">$1</code>'
  );
  return text;
}

export function GuidelineContent({
  title,
  content,
  version,
  source,
  category,
  lastUpdated,
}: GuidelineContentProps) {
  const sourceInfo = sourceLabels[source];
  const html = renderMarkdown(content);

  return (
    <article>
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge variant="outline" className={cn("text-xs", sourceInfo?.className)}>
            {sourceInfo?.label}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {category}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Version {version}
          </span>
        </div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Last updated: {formatDate(lastUpdated)}
        </p>
      </header>

      <div
        className="guideline-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}

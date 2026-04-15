import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useConvexAuth } from "convex/react";
import { api } from "convex/_generated/api";
import { GuidelineContent } from "@/components/guidelines/guideline-content";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Star,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Download,
  Eye,
  FileCode,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PDFViewer, type PDFViewerRef } from "@embedpdf/react-pdf-viewer";
import { useTheme } from "@/components/theme";

const BRAND_PDF_THEME = {
  light: {
    background: {
      app: "#f0fdfa",
      surface: "#ffffff",
      surfaceAlt: "#ccfbf1",
      elevated: "#ffffff",
      overlay: "rgba(19, 78, 74, 0.16)",
      input: "#e0f2fe",
    },
    foreground: {
      primary: "#134e4a",
      secondary: "#0e7490",
      muted: "#5e6b6a",
      disabled: "#94a3b8",
      onAccent: "#ffffff",
    },
    border: {
      default: "#99f6e4",
      subtle: "#ccfbf1",
      strong: "#2dd4bf",
    },
    accent: {
      primary: "#0891b2",
      primaryHover: "#0e7490",
      primaryActive: "#155e75",
      primaryLight: "#cffafe",
      primaryForeground: "#ffffff",
    },
    interactive: {
      hover: "rgba(8, 145, 178, 0.08)",
      active: "rgba(8, 145, 178, 0.14)",
      selected: "rgba(34, 197, 94, 0.14)",
      focus: "#0891b2",
      focusRing: "rgba(8, 145, 178, 0.28)",
    },
    state: {
      error: "#ef4444",
      errorLight: "rgba(239, 68, 68, 0.16)",
      warning: "#f59e0b",
      warningLight: "rgba(245, 158, 11, 0.18)",
      success: "#22c55e",
      successLight: "rgba(34, 197, 94, 0.18)",
      info: "#0891b2",
      infoLight: "rgba(8, 145, 178, 0.18)",
    },
    scrollbar: {
      track: "#ecfeff",
      thumb: "#67e8f9",
      thumbHover: "#22d3ee",
    },
    tooltip: {
      background: "#134e4a",
      foreground: "#f0fdfa",
    },
  },
} as const;

const MAIN_TOOLBAR_ITEMS: any[] = [
  {
    type: "group",
    id: "left-group",
    alignment: "start",
    gap: 2,
    items: [
      {
        type: "command-button",
        id: "document-menu-button",
        commandId: "document:menu",
        variant: "icon",
        categories: ["document", "document-menu"],
      },
      { type: "divider", id: "divider-1", orientation: "vertical" },
      {
        type: "command-button",
        id: "sidebar-button",
        commandId: "panel:toggle-sidebar",
        variant: "icon",
        categories: ["panel", "panel-sidebar"],
      },
      {
        type: "command-button",
        id: "overflow-left-action-menu-button",
        commandId: "left-action-menu:overflow-menu",
        variant: "icon",
        categories: ["ui", "ui-menu"],
      },
      {
        type: "command-button",
        id: "page-settings-button",
        commandId: "page:settings",
        variant: "icon",
        categories: ["page", "page-settings"],
      },
    ],
  },
  { type: "divider", id: "divider-2", orientation: "vertical" },
  {
    type: "group",
    id: "center-group",
    alignment: "center",
    gap: 2,
    items: [
      {
        type: "command-button",
        id: "zoom-menu-button",
        commandId: "zoom:toggle-menu-mobile",
        variant: "icon",
        categories: ["zoom", "zoom-menu"],
      },
      { type: "custom", id: "zoom-toolbar", componentId: "zoom-toolbar", categories: ["zoom"] },
      {
        type: "divider",
        id: "divider-3",
        orientation: "vertical",
        visibilityDependsOn: { itemIds: ["zoom-toolbar", "zoom-menu-button"] },
      },
      {
        type: "command-button",
        id: "pan-button",
        commandId: "pan:toggle",
        variant: "icon",
        categories: ["tools", "pan"],
      },
      {
        type: "command-button",
        id: "pointer-button",
        commandId: "pointer:toggle",
        variant: "icon",
        categories: ["tools", "pointer"],
      },
    ],
  },
  { type: "spacer", id: "spacer-1", flex: true },
  {
    type: "custom",
    id: "mode-select-button",
    componentId: "mode-select-button",
    categories: ["mode"],
    visibilityDependsOn: { itemIds: ["mode:annotate", "mode:shapes", "mode:redact"] },
  },
  {
    type: "tab-group",
    id: "mode-tabs",
    tabs: [
      {
        id: "view-mode",
        commandId: "mode:view",
        variant: "text",
        categories: ["mode", "mode-view"],
        visibilityDependsOn: { itemIds: ["annotate-mode", "shapes-mode", "redact-mode"] },
      },
      {
        id: "annotate-mode",
        commandId: "mode:annotate",
        variant: "text",
        categories: ["mode", "mode-annotate", "annotation"],
      },
      {
        id: "shapes-mode",
        commandId: "mode:shapes",
        variant: "text",
        categories: ["mode", "mode-shapes", "annotation"],
      },
      {
        id: "redact-mode",
        commandId: "mode:redact",
        variant: "text",
        categories: ["mode", "mode-redact", "redaction"],
      },
      {
        id: "overflow-tabs-button",
        commandId: "tabs:overflow-menu",
        variant: "icon",
        categories: ["ui", "ui-menu"],
        visibilityDependsOn: { menuId: "mode-tabs-overflow-menu" },
      },
    ],
  },
  { type: "spacer", id: "spacer-2", flex: true },
  {
    type: "group",
    id: "right-group",
    alignment: "end",
    gap: 2,
    items: [
      {
        type: "command-button",
        id: "search-button",
        commandId: "panel:toggle-search",
        variant: "icon",
        categories: ["panel", "panel-search"],
      },
      {
        type: "command-button",
        id: "screenshot-button",
        commandId: "document:capture",
        variant: "icon",
        categories: ["document", "document-capture"],
      },
    ],
  },
];

const DOCUMENT_MENU_ITEMS: any[] = [
  { type: "command", id: "document:open", commandId: "document:open", categories: ["document", "document-open"] },
  { type: "command", id: "document:close", commandId: "document:close", categories: ["document", "document-close"] },
  { type: "divider", id: "divider-10", visibilityDependsOn: { itemIds: ["document:open", "document:close"] } },
  { type: "command", id: "document:print", commandId: "document:print", categories: ["document", "document-print"] },
  { type: "command", id: "document:capture", commandId: "document:capture", categories: ["document", "document-capture"] },
  { type: "command", id: "document:export", commandId: "document:export", categories: ["document", "document-export"] },
  {
    type: "divider",
    id: "divider-11",
    visibilityDependsOn: {
      itemIds: ["document:export", "document:print", "document:capture"],
    },
  },
  { type: "command", id: "document:fullscreen", commandId: "document:fullscreen", categories: ["document", "document-fullscreen"] },
];

export const Route = createFileRoute("/_authed/guideline/$slug")({
  component: GuidelineDetailPage,
});

function GuidelineDetailPage() {
  const { slug } = Route.useParams();
  const { resolvedTheme } = useTheme();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useConvexAuth();
  const viewerRef = React.useRef<PDFViewerRef>(null);
  const [viewMode, setViewMode] = React.useState<"pdf" | "text">("pdf");
  const viewerThemePreference = resolvedTheme === "dark" ? "dark" : "light";

  React.useEffect(() => {
    viewerRef.current?.container?.setTheme({
      ...BRAND_PDF_THEME,
      preference: viewerThemePreference,
    });
  }, [viewerThemePreference]);

  const { data: guideline, isLoading } = useQuery(
    convexQuery(api.guidelines.getBySlug, { slug }),
  );

  const { data: currentUser } = useQuery({
    ...convexQuery(api.users.me, {}),
    enabled: isAuthenticated,
  });

  // Get file URL if this guideline has an associated PDF
  const storageId = (guideline as any)?.storageId;
  const { data: fileUrl } = useQuery(
    convexQuery(api.documents.getFileUrl, {
      storageId: storageId ?? undefined,
    }),
  );

  const hasPdf = !!storageId && !!fileUrl;

  const togglePin = useConvexMutation(api.users.togglePin);
  const pinMutation = useMutation({
    mutationFn: () => togglePin({ guidelineId: (guideline as any)?._id }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: convexQuery(api.users.me, {}).queryKey,
      });
    },
  });

  const submitFeedback = useConvexMutation(api.auditLog.submitFeedback);
  const feedbackMutation = useMutation({
    mutationFn: (wasHelpful: boolean) =>
      submitFeedback({
        query: slug,
        guidelineId: (guideline as any)?._id,
        wasHelpful,
      }),
  });

  const pinnedIds =
    currentUser && currentUser._id
      ? ((currentUser as any).pinnedGuidelines ?? []).map(String)
      : [];
  const isPinned = guideline
    ? pinnedIds.includes(String((guideline as any)._id))
    : false;

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3 animate-pulse" />
        <p className="text-muted-foreground">Loading guideline...</p>
      </div>
    );
  }

  if (!guideline) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground mb-2">Guideline not found</p>
        <Link to="/search" search={{ threadId: undefined }}>
          <Button variant="outline" size="sm">
            Back to search
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with back button and actions */}
      <div className="flex items-center justify-between">
        <Link to="/search" search={{ threadId: undefined }}>
          <Button variant="ghost" size="sm" className="h-8 gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {hasPdf && (
            <>
              {/* Toggle between PDF and text view */}
              <div className="flex items-center rounded-lg border bg-muted p-0.5">
                <button
                  onClick={() => setViewMode("pdf")}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    viewMode === "pdf"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Eye className="h-3 w-3" />
                  PDF
                </button>
                <button
                  onClick={() => setViewMode("text")}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    viewMode === "text"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <FileCode className="h-3 w-3" />
                  Text
                </button>
              </div>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </a>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1"
            onClick={() => pinMutation.mutate()}
          >
            <Star
              className={
                isPinned ? "h-4 w-4 fill-yellow-400 text-yellow-400" : "h-4 w-4"
              }
            />
            {isPinned ? "Pinned" : "Pin"}
          </Button>
        </div>
      </div>

      {/* Guideline metadata header */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className={cn(
            "text-xs",
            guideline.source === "local"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-muted text-muted-foreground",
          )}
        >
          {guideline.source === "local" ? "LOCAL" : "LEGACY"}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {guideline.category}
        </Badge>
        <span className="text-xs text-muted-foreground">
          v{guideline.version} · Updated{" "}
          {new Date(guideline.lastUpdated).toLocaleDateString("en-GB")}
        </span>
      </div>

      {/* Content: PDF viewer or extracted text */}
      {hasPdf && viewMode === "pdf" ? (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="bg-muted/50 px-4 py-2 border-b">
            <h1 className="text-lg font-bold">{guideline.title}</h1>
          </div>
          {fileUrl ? (
            <PDFViewer
              ref={viewerRef}
              config={{
                theme: {
                  ...BRAND_PDF_THEME,
                  preference: viewerThemePreference,
                },
                tabBar: "never",
                disabledCategories: ["annotation", "redaction"],
                documentManager: {
                  initialDocuments: [
                    {
                      url: fileUrl,
                      name: `${guideline.title}.pdf`,
                      autoActivate: true,
                    },
                  ],
                },
              }}
              onReady={(registry) => {
                const uiPlugin = registry.getPlugin("ui");
                const ui = uiPlugin?.provides?.();
                if (!ui) return;

                ui.mergeSchema({
                  toolbars: {
                    "main-toolbar": {
                      id: "main-toolbar",
                      position: {
                        placement: "top",
                        slot: "main",
                        order: 0,
                      },
                      items: MAIN_TOOLBAR_ITEMS,
                    },
                  },
                  menus: {
                    "document-menu": {
                      id: "document-menu",
                      items: DOCUMENT_MENU_ITEMS,
                    },
                  },
                });
              }}
              className="w-full"
              style={{ height: "calc(100vh - 220px)", minHeight: "500px" }}
            />
          ) : null}
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-4 sm:p-6">
          <GuidelineContent
            title={guideline.title}
            content={guideline.content}
            version={guideline.version}
            source={guideline.source}
            category={guideline.category}
            lastUpdated={guideline.lastUpdated}
          />
        </div>
      )}

      {/* Feedback */}
      <div className="flex items-center justify-center gap-3 py-4">
        <span className="text-sm text-muted-foreground">
          Was this guideline helpful?
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1"
          onClick={() => feedbackMutation.mutate(true)}
          disabled={feedbackMutation.isSuccess}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          Yes
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1"
          onClick={() => feedbackMutation.mutate(false)}
          disabled={feedbackMutation.isSuccess}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
          No
        </Button>
        {feedbackMutation.isSuccess && (
          <span className="text-xs text-muted-foreground">
            Thanks for your feedback
          </span>
        )}
      </div>
    </div>
  );
}

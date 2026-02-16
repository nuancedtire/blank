import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useConvex } from "convex/react";
import { api } from "convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { TagInput } from "@/components/ui/tag-input";
import {
  ArrowLeft,
  Upload,
  FileText,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Sparkles,
  Check,
  Pencil,
  X,
  ChevronsUpDown,
} from "lucide-react";
import { extractTextFromPdf } from "@/lib/pdf-extract";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";

export const Route = createFileRoute("/_authed/admin/documents")({
  component: ManageDocumentsPage,
});

const CATEGORIES = [
  "Medical",
  "Trauma",
  "Resuscitation",
  "Paediatrics",
  "Policies",
  "Other",
];

function ManageDocumentsPage() {
  const convex = useConvex();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState("");
  const [selectedSource, setSelectedSource] = React.useState<
    "local" | "rcem" | "nice"
  >("local");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { data: documents } = useQuery(
    convexQuery(api.documents.listDocuments, {}),
  );

  const generateUploadUrl = useConvexMutation(api.documents.generateUploadUrl);
  const saveDocument = useConvexMutation(api.documents.saveDocument);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of Array.from(files)) {
        setUploadProgress(`Uploading ${file.name}...`);

        // Step 1: Get upload URL
        const uploadUrl = await generateUploadUrl({});

        // Step 2: Upload file to Convex storage
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const json = await result.json();
        const storageId = (json as any).storageId;

        // Step 3: Save document metadata (no category — LLM will infer)
        const documentId = await saveDocument({
          storageId,
          fileName: file.name,
          fileType: file.type,
          source: selectedSource,
        });

        // Step 4: Extract text
        setUploadProgress(`Extracting text from ${file.name}...`);
        const text = await extractText(file);

        if (text && text.length > 50) {
          // Step 5: LLM-process + RAG index + create draft guideline
          setUploadProgress(`Processing ${file.name} with AI...`);
          const title = file.name.replace(/\.[^/.]+$/, "");
          convex
            .action(api.documents.indexDocument, {
              documentId,
              content: text,
              title,
            })
            .catch((e) => console.error("Indexing error:", e));
        } else {
          console.warn(
            `Could not extract enough text from ${file.name}. File may be image-based.`,
          );
        }
      }

      // Refresh lists
      queryClient.invalidateQueries({
        queryKey: convexQuery(api.documents.listDocuments, {}).queryKey,
      });
    } catch (e) {
      console.error("Upload error:", e);
    } finally {
      setIsUploading(false);
      setUploadProgress("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm("Delete this document and its guideline entry?")) return;
    try {
      await convex.action(api.documents.deleteDocument, {
        documentId: documentId as any,
      });
      queryClient.invalidateQueries({
        queryKey: convexQuery(api.documents.listDocuments, {}).queryKey,
      });
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "indexed":
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "indexing":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const sourceLabels: Record<string, { label: string; className: string }> = {
    local: {
      label: "Local",
      className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    rcem: {
      label: "RCEM",
      className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    nice: {
      label: "NICE",
      className: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/admin">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Upload Documents</h1>
            <p className="text-sm text-muted-foreground">
              Upload PDFs & text files — AI extracts metadata, you review before
              publishing
            </p>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <Card className="py-0">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Upload Files</CardTitle>
          <CardDescription className="text-xs">
            Upload PDF, text, or markdown files. AI will extract the title,
            category, summary, and tags — you can review and adjust before
            publishing.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Guideline Source</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 w-full max-w-xs justify-between rounded-xl font-normal"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-block h-2 w-2 rounded-full",
                          selectedSource === "local" && "bg-emerald-500",
                          selectedSource === "rcem" && "bg-blue-500",
                          selectedSource === "nice" && "bg-purple-500",
                        )}
                      />
                      {selectedSource === "local"
                        ? "Local Trust"
                        : selectedSource.toUpperCase()}
                    </span>
                    <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuRadioGroup
                    value={selectedSource}
                    onValueChange={(v) =>
                      setSelectedSource(v as "local" | "rcem" | "nice")
                    }
                  >
                    <DropdownMenuRadioItem value="local">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-1" />
                      Local Trust
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="rcem">
                      <span className="inline-block h-2 w-2 rounded-full bg-blue-500 mr-1" />
                      RCEM
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="nice">
                      <span className="inline-block h-2 w-2 rounded-full bg-purple-500 mr-1" />
                      NICE
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.pdf"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">{uploadProgress}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Click to upload files</p>
                  <p className="text-xs text-muted-foreground">
                    Supports .pdf, .txt, .md — category & metadata auto-detected
                    by AI
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <div>
        <h2 className="text-base font-bold mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Uploaded Documents ({documents?.length ?? 0})
        </h2>
        <div className="space-y-2">
          {documents?.map((doc: any) => {
            const source = sourceLabels[doc.source];
            return (
              <DocumentRow
                key={doc._id}
                doc={doc}
                source={source}
                statusIcon={statusIcon(doc.status)}
                onDelete={() => handleDelete(doc._id)}
              />
            );
          })}
          {(!documents || documents.length === 0) && (
            <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
              No documents uploaded yet. Upload files above to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DocumentRow({
  doc,
  source,
  statusIcon,
  onDelete,
}: {
  doc: any;
  source: { label: string; className: string } | undefined;
  statusIcon: React.ReactNode;
  onDelete: () => void;
}) {
  const { data: fileUrl } = useQuery({
    ...convexQuery(api.documents.getFileUrl, { storageId: doc.storageId }),
    enabled: !!doc.storageId,
  });

  // Fetch linked guideline when indexed (to show review UI)
  const { data: guideline } = useQuery({
    ...convexQuery(
      api.documents.getLinkedGuideline,
      doc.guidelineId ? { guidelineId: doc.guidelineId } : "skip",
    ),
    enabled: !!doc.guidelineId,
  });

  const isDraft = guideline?.status === "draft";

  return (
    <Card
      className={isDraft ? "border-amber-500/40 bg-amber-500/5 p-0" : "p-0"}
    >
      <div className="flex items-center gap-3 p-3">
        {statusIcon}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{doc.fileName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${source?.className ?? ""}`}
            >
              {source?.label ?? doc.source}
            </Badge>
            <Badge
              variant={
                doc.status === "indexed"
                  ? "default"
                  : doc.status === "error"
                    ? "destructive"
                    : "secondary"
              }
              className="text-[10px] px-1.5 py-0"
            >
              {doc.status}
            </Badge>
            {isDraft && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
              >
                <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                Needs Review
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground">
              {new Date(doc.uploadedAt).toLocaleDateString("en-GB")}
            </span>
          </div>
          {doc.errorMessage && (
            <p className="text-xs text-destructive mt-1">{doc.errorMessage}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {fileUrl && (
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                title="View file"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </a>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Review panel for draft guidelines */}
      {isDraft && guideline && <ReviewPanel guideline={guideline} />}
    </Card>
  );
}

function ReviewPanel({ guideline }: { guideline: any }) {
  const queryClient = useQueryClient();
  const publishGuideline = useConvexMutation(api.documents.publishGuideline);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);

  // Editable fields
  const [title, setTitle] = React.useState(guideline.title);
  const [summary, setSummary] = React.useState(guideline.summary ?? "");
  const [category, setCategory] = React.useState(guideline.category);
  const [keywords, setKeywords] = React.useState<string[]>(
    guideline.keywords ?? [],
  );
  const [categoryOpen, setCategoryOpen] = React.useState(false);

  // Reset when guideline changes
  React.useEffect(() => {
    setTitle(guideline.title);
    setSummary(guideline.summary ?? "");
    setCategory(guideline.category);
    setKeywords(guideline.keywords ?? []);
  }, [guideline]);

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const overrides: any = {};
      if (title !== guideline.title) overrides.title = title;
      if (summary !== (guideline.summary ?? "")) overrides.summary = summary;
      if (category !== guideline.category) overrides.category = category;
      const origKw = (guideline.keywords ?? []).join(",");
      if (keywords.join(",") !== origKw) overrides.keywords = keywords;

      await publishGuideline({
        guidelineId: guideline._id,
        ...overrides,
      });

      setIsEditing(false);
      queryClient.invalidateQueries();
    } catch (e) {
      console.error("Publish error:", e);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="border-t px-4 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          AI-suggested metadata — review before publishing
        </p>
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs gap-1"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-3 w-3" />
            Edit
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2.5">
          <div className="space-y-1">
            <Label className="text-xs">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Summary</Label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="h-8 text-sm"
              rows={4}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={categoryOpen}
                    className="h-8 w-full justify-between rounded-xl text-sm font-normal"
                  >
                    {category || "Select..."}
                    <ChevronsUpDown className="h-3 w-3 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search category..."
                      className="h-8"
                    />
                    <CommandList>
                      <CommandEmpty>No category found.</CommandEmpty>
                      <CommandGroup>
                        {CATEGORIES.map((cat) => (
                          <CommandItem
                            key={cat}
                            value={cat}
                            onSelect={(val) => {
                              setCategory(
                                CATEGORIES.find(
                                  (c) => c.toLowerCase() === val.toLowerCase(),
                                ) ?? val,
                              );
                              setCategoryOpen(false);
                            }}
                          >
                            {cat}
                            <Check
                              className={cn(
                                "ml-auto h-3.5 w-3.5",
                                category === cat ? "opacity-100" : "opacity-0",
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tags</Label>
              <TagInput
                tags={keywords}
                onTagsChange={setKeywords}
                placeholder="sepsis, infection..."
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-muted-foreground w-14 shrink-0">
              Title
            </span>
            <span className="text-sm font-medium">{title}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-muted-foreground w-14 shrink-0">
              Summary
            </span>
            <span className="text-xs">{summary}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-14 shrink-0">
              Category
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {category}
            </Badge>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-xs text-muted-foreground w-14 shrink-0 pt-0.5">
              Tags
            </span>
            <div className="flex flex-wrap gap-1">
              <AnimatePresence mode="popLayout">
                {(guideline.keywords ?? []).map((tag: string) => (
                  <motion.span
                    key={tag}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                    >
                      {tag}
                    </Badge>
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-end pt-1">
        {isEditing && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => {
              setTitle(guideline.title);
              setSummary(guideline.summary ?? "");
              setCategory(guideline.category);
              setKeywords(guideline.keywords ?? []);
              setIsEditing(false);
            }}
          >
            <X className="h-3 w-3" />
            Cancel
          </Button>
        )}
        <Button
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={handlePublish}
          disabled={isPublishing}
        >
          {isPublishing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          {isEditing ? "Save & Publish" : "Approve & Publish"}
        </Button>
      </div>
    </div>
  );
}

// Extract text from any supported file type
async function extractText(file: File): Promise<string | null> {
  const type = file.type;
  const name = file.name.toLowerCase();

  // Text and markdown files
  if (
    type === "text/plain" ||
    type === "text/markdown" ||
    name.endsWith(".md") ||
    name.endsWith(".txt")
  ) {
    return await file.text();
  }

  // PDF files - use pdf.js for proper extraction
  if (type === "application/pdf" || name.endsWith(".pdf")) {
    try {
      const text = await extractTextFromPdf(file);
      if (text && text.trim().length > 50) {
        return text;
      }
      console.warn(
        `PDF ${file.name} appears to be image-based or has very little text.`,
      );
      return null;
    } catch (e) {
      console.error(`Failed to parse PDF ${file.name}:`, e);
      return null;
    }
  }

  return null;
}

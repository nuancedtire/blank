import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useConvex } from "convex/react";
import { api } from "convex/_generated/api";
import { Button } from "@/components/ui/button";
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
  ArrowLeft,
  Upload,
  FileText,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
} from "lucide-react";
import { extractTextFromPdf } from "@/lib/pdf-extract";

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
  const [selectedCategory, setSelectedCategory] = React.useState("Medical");
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

        // Step 3: Save document metadata
        const documentId = await saveDocument({
          storageId,
          fileName: file.name,
          fileType: file.type,
          source: selectedSource,
          category: selectedCategory,
        });

        // Step 4: Extract text
        setUploadProgress(`Extracting text from ${file.name}...`);
        const text = await extractText(file);

        if (text && text.length > 50) {
          // Step 5: LLM-process + RAG index + create guideline
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
              Upload PDFs & text files — auto-indexed for search and RAG
            </p>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Upload Files</CardTitle>
          <CardDescription className="text-xs">
            Upload PDF, text, or markdown files. They’ll be parsed, indexed into
            RAG, and added as browsable guidelines automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="source" className="text-xs">
                  Guideline Source
                </Label>
                <select
                  id="source"
                  value={selectedSource}
                  onChange={(e) =>
                    setSelectedSource(
                      e.target.value as "local" | "rcem" | "nice",
                    )
                  }
                  className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="local">Local Trust</option>
                  <option value="rcem">RCEM</option>
                  <option value="nice">NICE</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-xs">
                  Category
                </Label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
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
                    Supports .pdf, .txt, .md
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
        <div className="rounded-lg border bg-card divide-y">
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
            <div className="p-6 text-center text-sm text-muted-foreground">
              No documents uploaded yet. Upload files above to enable RAG
              search.
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

  return (
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
          {doc.category && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {doc.category}
            </Badge>
          )}
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
          <span className="text-[10px] text-muted-foreground">
            {new Date(doc.uploadedAt).toLocaleDateString("en-GB")}
          </span>
        </div>
        {doc.errorMessage && (
          <p className="text-xs text-destructive mt-1 truncate">
            {doc.errorMessage}
          </p>
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

import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  FileText,
  Upload,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/_authed/admin/guidelines")({
  component: ManageGuidelinesPage,
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function ManageGuidelinesPage() {
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const { data: guidelines } = useQuery(
    convexQuery(api.guidelines.listAll, {})
  );

  const createGuideline = useConvexMutation(api.guidelines.create);
  const updateGuideline = useConvexMutation(api.guidelines.update);
  const deleteGuideline = useConvexMutation(api.guidelines.remove);
  const seedGuidelines = useConvexMutation(api.guidelines.seed);

  const createMutation = useMutation({
    mutationFn: (data: any) => createGuideline(data),
    onSuccess: () => setShowForm(false),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateGuideline(data),
    onSuccess: () => {
      setEditingId(null);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGuideline({ id: id as any }),
  });

  const seedMutation = useMutation({
    mutationFn: () => seedGuidelines({}),
  });

  // Form state
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [category, setCategory] = React.useState("Medical");
  const [source, setSource] = React.useState<"local" | "rcem" | "nice">(
    "local"
  );
  const [version, setVersion] = React.useState("1.0");
  const [status, setStatus] = React.useState<
    "draft" | "published" | "archived"
  >("published");
  const [keywords, setKeywords] = React.useState("");

  const resetForm = () => {
    setTitle("");
    setContent("");
    setSummary("");
    setCategory("Medical");
    setSource("local");
    setVersion("1.0");
    setStatus("published");
    setKeywords("");
    setEditingId(null);
  };

  const startEdit = (g: any) => {
    setTitle(g.title);
    setContent(g.content);
    setSummary(g.summary ?? "");
    setCategory(g.category);
    setSource(g.source);
    setVersion(g.version);
    setStatus(g.status);
    setKeywords((g.keywords ?? []).join(", "));
    setEditingId(g._id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      title,
      slug: slugify(title),
      content,
      summary: summary || undefined,
      category,
      source,
      version,
      status,
      keywords: keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId as any, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

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
            <h1 className="text-xl font-bold">Manage Guidelines</h1>
            <p className="text-sm text-muted-foreground">
              {guidelines?.length ?? 0} total guidelines
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
          >
            {seedMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <Upload className="h-3.5 w-3.5 mr-1" />
            )}
            Seed Demo Data
          </Button>
          <Button
            size="sm"
            className="gap-1"
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
          >
            <Plus className="h-4 w-4" />
            {showForm ? "Cancel" : "Add"}
          </Button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">
              {editingId ? "Edit Guideline" : "New Guideline"}
            </CardTitle>
            <CardDescription className="text-xs">
              {editingId
                ? "Update the guideline content and metadata"
                : "Add guideline content in Markdown format"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-xs">
                    Title
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Adult Sepsis Pathway"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs">
                    Category
                  </Label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="Medical">Medical</option>
                    <option value="Trauma">Trauma</option>
                    <option value="Resuscitation">Resuscitation</option>
                    <option value="Paediatrics">Paediatrics</option>
                    <option value="Policies">Policies</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="summary" className="text-xs">
                  Summary (shown in search results)
                </Label>
                <Input
                  id="summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Brief one-line summary of this guideline"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="content" className="text-xs">
                  Content (Markdown)
                </Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="# Guideline Title&#10;&#10;## Section 1&#10;&#10;Content here..."
                  rows={12}
                  className="font-mono text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="source" className="text-xs">
                    Source
                  </Label>
                  <select
                    id="source"
                    value={source}
                    onChange={(e) =>
                      setSource(e.target.value as "local" | "rcem" | "nice")
                    }
                    className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="local">Local</option>
                    <option value="rcem">RCEM</option>
                    <option value="nice">NICE</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="version" className="text-xs">
                    Version
                  </Label>
                  <Input
                    id="version"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="1.0"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="status" className="text-xs">
                    Status
                  </Label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) =>
                      setStatus(
                        e.target.value as "draft" | "published" | "archived"
                      )
                    }
                    className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="keywords" className="text-xs">
                    Keywords
                  </Label>
                  <Input
                    id="keywords"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="sepsis, infection"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  )}
                  {editingId ? "Update" : "Create"} Guideline
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Guidelines List */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            All ({guidelines?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="published">
            Published (
            {guidelines?.filter((g: any) => g.status === "published").length ??
              0}
            )
          </TabsTrigger>
          <TabsTrigger value="draft">
            Drafts (
            {guidelines?.filter((g: any) => g.status === "draft").length ?? 0})
          </TabsTrigger>
        </TabsList>

        {["all", "published", "draft"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="rounded-lg border bg-card divide-y">
              {guidelines
                ?.filter(
                  (g: any) => tab === "all" || g.status === tab
                )
                .map((g: any) => (
                  <div
                    key={g._id}
                    className="flex items-center gap-3 p-3"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{g.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge
                          variant={
                            g.status === "published"
                              ? "default"
                              : g.status === "draft"
                                ? "secondary"
                                : "outline"
                          }
                          className="text-[10px] px-1.5 py-0"
                        >
                          {g.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {g.source.toUpperCase()} | v{g.version}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => startEdit(g)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (
                            confirm(
                              `Delete "${g.title}"? This cannot be undone.`
                            )
                          ) {
                            deleteMutation.mutate(g._id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              {(!guidelines || guidelines.length === 0) && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No guidelines yet. Click "Add" or "Seed Demo Data" to get
                  started.
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

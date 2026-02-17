import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useConvex } from "convex/react";
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
  Plus,
  Edit,
  Trash2,
  FileText,
  Upload,
  Loader2,
  ChevronsUpDown,
  Check,
  Archive,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  const convex = useConvex();
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const { data: guidelines } = useQuery(
    convexQuery(api.guidelines.listAll, {}),
  );

  const { data: archivedGuidelines } = useQuery(
    convexQuery(api.documents.listArchived, {}),
  );

  const createGuideline = useConvexMutation(api.guidelines.create);
  const updateGuideline = useConvexMutation(api.guidelines.update);
  const deleteGuideline = useConvexMutation(api.guidelines.remove);
  const seedGuidelines = useConvexMutation(api.guidelines.seed);
  const archiveGuideline = useConvexMutation(api.documents.archiveGuideline);

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
    "local",
  );
  const [version, setVersion] = React.useState("1.0");
  const [status, setStatus] = React.useState<
    "draft" | "published" | "archived"
  >("published");
  const [keywords, setKeywords] = React.useState<string[]>([]);
  const [categoryOpen, setCategoryOpen] = React.useState(false);

  const CATEGORIES = [
    "Medical",
    "Trauma",
    "Resuscitation",
    "Paediatrics",
    "Policies",
    "Other",
  ];

  const resetForm = () => {
    setTitle("");
    setContent("");
    setSummary("");
    setCategory("Medical");
    setSource("local");
    setVersion("1.0");
    setStatus("published");
    setKeywords([]);
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
    setKeywords(g.keywords ?? []);
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
      keywords,
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
        <Card className="py-0">
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
                  <Label className="text-xs">Category</Label>
                  <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={categoryOpen}
                        className="h-9 w-full justify-between rounded-xl font-normal"
                      >
                        {category || "Select..."}
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
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
                                      (c) =>
                                        c.toLowerCase() === val.toLowerCase(),
                                    ) ?? val,
                                  );
                                  setCategoryOpen(false);
                                }}
                              >
                                {cat}
                                <Check
                                  className={cn(
                                    "ml-auto h-3.5 w-3.5",
                                    category === cat
                                      ? "opacity-100"
                                      : "opacity-0",
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
                  <Label className="text-xs">Source</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-9 w-full justify-between rounded-xl font-normal"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-block h-2 w-2 rounded-full",
                              source === "local" && "bg-emerald-500",
                              source === "rcem" && "bg-blue-500",
                              source === "nice" && "bg-purple-500",
                            )}
                          />
                          {source === "local" ? "Local" : source.toUpperCase()}
                        </span>
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-40">
                      <DropdownMenuRadioGroup
                        value={source}
                        onValueChange={(v) =>
                          setSource(v as "local" | "rcem" | "nice")
                        }
                      >
                        <DropdownMenuRadioItem value="local">
                          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-1" />
                          Local
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
                  <Label className="text-xs">Status</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-9 w-full justify-between rounded-xl font-normal"
                      >
                        <span className="capitalize">{status}</span>
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-40">
                      <DropdownMenuRadioGroup
                        value={status}
                        onValueChange={(v) =>
                          setStatus(v as "draft" | "published" | "archived")
                        }
                      >
                        <DropdownMenuRadioItem value="draft">
                          Draft
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="published">
                          Published
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="archived">
                          Archived
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Keywords</Label>
                  <TagInput
                    tags={keywords}
                    onTagsChange={setKeywords}
                    placeholder="sepsis, infection..."
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
            All ({(guidelines?.filter((g: any) => g.status !== "archived").length) ?? 0})
          </TabsTrigger>
          <TabsTrigger value="published">
            Published (
            {guidelines?.filter((g: any) => g.status === "published").length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="draft">
            Drafts (
            {guidelines?.filter((g: any) => g.status === "draft").length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived ({archivedGuidelines?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {(["all", "published", "draft"] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="rounded-lg border bg-card divide-y">
              {guidelines
                ?.filter((g: any) =>
                  tab === "all"
                    ? g.status !== "archived"
                    : g.status === tab,
                )
                .map((g: any) => (
                  <div key={g._id} className="flex items-center gap-3 p-3">
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
                      {g.status === "published" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          title="Archive guideline"
                          onClick={() => {
                            if (
                              confirm(
                                `Archive "${g.title}"? It will be hidden from search and the agent.`,
                              )
                            ) {
                              archiveGuideline({ guidelineId: g._id as any });
                            }
                          }}
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (
                            confirm(
                              `Delete "${g.title}"? This cannot be undone.`,
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
              {(!guidelines ||
                guidelines.filter((g: any) =>
                  tab === "all" ? g.status !== "archived" : g.status === tab,
                ).length === 0) && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No guidelines yet. Click "Add" or "Seed Demo Data" to get
                  started.
                </div>
              )}
            </div>
          </TabsContent>
        ))}

        <TabsContent value="archived">
          <div className="rounded-lg border bg-card divide-y">
            {archivedGuidelines?.map((g: any) => (
              <div key={g._id} className="flex items-center gap-3 p-3">
                <FileText className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-muted-foreground">
                    {g.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0"
                    >
                      archived
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {g.source.toUpperCase()} | v{g.version}
                    </span>
                    {g.archivedAt && (
                      <span className="text-[10px] text-muted-foreground">
                        · {new Date(g.archivedAt).toLocaleDateString("en-GB")}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs shrink-0"
                  title="Restore guideline"
                  onClick={() => {
                    if (
                      confirm(
                        `Restore "${g.title}"? It will be published and re-added to search.`,
                      )
                    ) {
                      convex
                        .action(api.documents.restoreGuideline, {
                          guidelineId: g._id as any,
                        })
                        .catch(console.error);
                    }
                  }}
                >
                  <RotateCcw className="h-3 w-3" />
                  Restore
                </Button>
              </div>
            ))}
            {(!archivedGuidelines || archivedGuidelines.length === 0) && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No archived guidelines.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

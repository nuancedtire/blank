import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Languages,
  HeartPulse,
  ToggleLeft,
  Globe,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authed/admin/features")({
  component: FeaturesAdmin,
});

type SearchDomain = { domain: string; label: string; enabled: boolean };

function FeaturesAdmin() {
  const { data: flags } = useQuery(
    convexQuery(api.siteSettings.getFeatureFlags, {}),
  );
  const updateFlags = useConvexMutation(api.siteSettings.updateFeatureFlags);
  const { mutate: update, isPending } = useMutation({
    mutationFn: (newFlags: {
      interpreterEnabled: boolean;
      mentalHealthEnabled: boolean;
    }) => updateFlags(newFlags),
    onSuccess: () => toast.success("Feature flags updated"),
    onError: (err: Error) => toast.error(err.message),
  });

  const interpreterEnabled = flags?.interpreterEnabled ?? false;
  const mentalHealthEnabled = flags?.mentalHealthEnabled ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ToggleLeft className="h-5 w-5" />
          Feature Controls
        </h1>
        <p className="text-sm text-muted-foreground">
          Enable or disable platform features. Changes take effect immediately
          for all users.
        </p>
      </div>

      <div className="grid gap-4">
        {/* Interpreter toggle */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 grid place-items-center">
                  <Languages className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-sm">
                    Language Interpreter
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Voice-to-voice AI interpreter for bedside
                    clinician-patient communication
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="interpreter-toggle"
                  className="text-xs text-muted-foreground"
                >
                  {interpreterEnabled ? "Active" : "Disabled"}
                </Label>
                <Switch
                  id="interpreter-toggle"
                  checked={interpreterEnabled}
                  disabled={isPending}
                  onCheckedChange={(checked) =>
                    update({
                      interpreterEnabled: checked,
                      mentalHealthEnabled,
                    })
                  }
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                When enabled, the Interpreter nav item appears for all
                authenticated users.
              </p>
              <p>
                Supports 40+ languages with real-time voice interpretation via
                OpenAI Realtime API.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* MH Companion toggle */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-rose-500/10 grid place-items-center">
                  <HeartPulse className="h-5 w-5 text-rose-500" />
                </div>
                <div>
                  <CardTitle className="text-sm">
                    Mental Health Companion
                  </CardTitle>
                  <CardDescription className="text-xs">
                    AI companion for mental health patients in the ED waiting
                    room (PHQ-9, C-SSRS)
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="mh-toggle"
                  className="text-xs text-muted-foreground"
                >
                  {mentalHealthEnabled ? "Active" : "Disabled"}
                </Label>
                <Switch
                  id="mh-toggle"
                  checked={mentalHealthEnabled}
                  disabled={isPending}
                  onCheckedChange={(checked) =>
                    update({
                      interpreterEnabled,
                      mentalHealthEnabled: checked,
                    })
                  }
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                When enabled, the Mental Health nav item and clinician dashboard
                appear for authenticated users.
              </p>
              <p>
                Patient-facing companion links (/companion/...) remain
                accessible regardless of this toggle — active sessions are not
                interrupted.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Search Domains */}
        <SearchDomainsCard
          domains={flags?.searchDomains ?? [
            { domain: "nice.org.uk", label: "NICE", enabled: true },
            { domain: "rcem.ac.uk", label: "RCEM", enabled: true },
          ]}
        />
      </div>
    </div>
  );
}

function SearchDomainsCard({ domains }: { domains: SearchDomain[] }) {
  const [localDomains, setLocalDomains] = React.useState<SearchDomain[]>(domains);
  const [newDomain, setNewDomain] = React.useState("");
  const [newLabel, setNewLabel] = React.useState("");

  // Sync from server when data loads
  React.useEffect(() => {
    setLocalDomains(domains);
  }, [domains]);

  const updateDomains = useConvexMutation(
    api.siteSettings.updateSearchDomains,
  );
  const { mutate: save, isPending } = useMutation({
    mutationFn: (searchDomains: SearchDomain[]) =>
      updateDomains({ searchDomains }),
    onSuccess: () => toast.success("Search domains updated"),
    onError: (err: Error) => toast.error(err.message),
  });

  const hasChanges =
    JSON.stringify(localDomains) !== JSON.stringify(domains);

  const addDomain = () => {
    const domain = newDomain.trim().toLowerCase();
    const label = newLabel.trim();
    if (!domain || !label) {
      toast.error("Both domain and label are required");
      return;
    }
    if (localDomains.some((d) => d.domain === domain)) {
      toast.error("Domain already exists");
      return;
    }
    setLocalDomains([...localDomains, { domain, label, enabled: true }]);
    setNewDomain("");
    setNewLabel("");
  };

  const removeDomain = (domain: string) => {
    setLocalDomains(localDomains.filter((d) => d.domain !== domain));
  };

  const toggleDomain = (domain: string) => {
    setLocalDomains(
      localDomains.map((d) =>
        d.domain === domain ? { ...d, enabled: !d.enabled } : d,
      ),
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 grid place-items-center">
            <Globe className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <CardTitle className="text-sm">Search Domains</CardTitle>
            <CardDescription className="text-xs">
              Configure which clinical guideline domains are searched by the AI
              agent and web search
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing domains */}
        <div className="space-y-2">
          {localDomains.map((d) => (
            <div
              key={d.domain}
              className="flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <Switch
                  checked={d.enabled}
                  onCheckedChange={() => toggleDomain(d.domain)}
                />
                <div>
                  <p className="text-sm font-medium">{d.label}</p>
                  <p className="text-xs text-muted-foreground">{d.domain}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => removeDomain(d.domain)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {localDomains.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No search domains configured. Add one below.
            </p>
          )}
        </div>

        {/* Add new domain */}
        <div className="flex gap-2">
          <Input
            placeholder="Domain (e.g. bsaci.org)"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            className="text-sm"
          />
          <Input
            placeholder="Label (e.g. BSACI)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="text-sm w-32"
          />
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={addDomain}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Save */}
        {hasChanges && (
          <div className="flex justify-end pt-2">
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => save(localDomains)}
            >
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          These domains control where the AI agent searches externally (via Exa),
          where web search results are filtered to, and which PDFs can be proxied.
          For the PDF proxy allowlist, also set the <code>ALLOWED_PDF_DOMAINS</code>{" "}
          environment variable in your deployment.
        </p>
      </CardContent>
    </Card>
  );
}

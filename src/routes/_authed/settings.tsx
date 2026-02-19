import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Link as LinkIcon,
  Bell,
  Smartphone,
  LogOut,
  Trash2,
  Mail,
  FileText,
  Megaphone,
  Check,
  X,
  Loader2,
  Pencil,
  Globe,
} from "lucide-react";

export const Route = createFileRoute("/_authed/settings")({
  component: SettingsPage,
});

/* ─── Types ─── */
interface Account {
  id: string;
  providerId: string;
  accountId: string;
  userId: string;
  scopes: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface Session {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/* ─── Social provider config ─── */
function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 21 21"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

const providers = [
  {
    id: "google",
    name: "Google",
    icon: GoogleIcon,
    color: "bg-white dark:bg-zinc-800",
  },
  {
    id: "microsoft",
    name: "Microsoft",
    icon: MicrosoftIcon,
    color: "bg-white dark:bg-zinc-800",
  },
] as const;

/* ─── Section wrapper ─── */
function Section({
  id,
  icon: Icon,
  title,
  description,
  children,
  delay = 0,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden"
    >
      <div className="px-5 py-4 sm:px-6 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </motion.section>
  );
}

/* ─── Main page ─── */
function SettingsPage() {
  const { data: accountInfo, refetch } = useQuery(
    convexQuery(api.settings.getAccountInfo, {}),
  );

  const [sessions, setSessions] = useState<Session[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentSessionToken, setCurrentSessionToken] = useState<string | null>(
    null,
  );

  const fetchSessions = useCallback(() => {
    authClient.listSessions().then((result: any) => {
      if (result.data && !result.error) {
        setSessions(result.data);
      }
    });
  }, []);

  const fetchAccounts = useCallback(() => {
    authClient.listAccounts().then((result: any) => {
      if (result.data && !result.error) {
        setAccounts(result.data);
      }
    });
  }, []);

  useEffect(() => {
    fetchSessions();
    fetchAccounts();

    // Get the current session to identify it in the list
    authClient.getSession().then((result: any) => {
      if (result.data?.session) {
        setCurrentSessionToken(result.data.session.token);
      }
    });
  }, [fetchSessions, fetchAccounts]);

  return (
    <div className="min-h-[calc(100vh-8rem)] max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="pt-2"
      >
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your account and preferences
        </p>
      </motion.div>

      <ProfileSection accountInfo={accountInfo} onUpdate={refetch} />

      <LinkedAccountsSection accounts={accounts} onUpdate={fetchAccounts} />

      <SessionsSection
        sessions={sessions}
        currentSessionToken={currentSessionToken}
        onUpdate={fetchSessions}
      />

      <NotificationsSection
        preferences={accountInfo?.notificationPreferences}
      />
    </div>
  );
}

/* ─── Profile ─── */
function ProfileSection({
  accountInfo,
  onUpdate,
}: {
  accountInfo: any;
  onUpdate: () => void;
}) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (accountInfo?.profile?.name) setName(accountInfo.profile.name);
  }, [accountInfo?.profile?.name]);

  const updateProfile = useConvexMutation(api.settings.updateProfile);
  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      toast({ title: "Profile updated" });
      setIsEditing(false);
      onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (name.trim()) {
      profileMutation.mutate({ name: name.trim() });
    }
  };

  return (
    <Section
      id="profile"
      icon={User}
      title="Profile"
      description="Your personal information"
      delay={0.05}
    >
      <div className="space-y-4">
        {/* Name */}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Display Name
            </Label>
            {isEditing ? (
              <div className="flex items-center gap-2 mt-1.5">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="h-9 text-sm rounded-lg"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                    if (e.key === "Escape") setIsEditing(false);
                  }}
                />
                <Button
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-lg"
                  onClick={handleSave}
                  disabled={profileMutation.isPending}
                >
                  {profileMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0 rounded-lg"
                  onClick={() => {
                    setIsEditing(false);
                    setName(accountInfo?.profile?.name || "");
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {accountInfo?.profile?.name || "Not set"}
                </p>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Email */}
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Email
          </Label>
          <div className="flex items-center gap-2 mt-1">
            <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <p className="text-sm font-medium text-foreground truncate">
              {accountInfo?.auth?.email}
            </p>
            {accountInfo?.auth?.emailVerified && (
              <Badge
                variant="secondary"
                className="text-[10px] bg-accent/15 text-accent border-accent/20 shrink-0"
              >
                Verified
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ─── Linked Accounts ─── */
function LinkedAccountsSection({
  accounts,
  onUpdate,
}: {
  accounts: Account[];
  onUpdate: () => void;
}) {
  const { toast } = useToast();
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(
    null,
  );

  const logUnlinked = useConvexMutation(api.settings.logAccountUnlinked);
  const unlinkMutation = useMutation({ mutationFn: logUnlinked });

  const handleLink = async (providerId: string) => {
    setLinkingProvider(providerId);
    try {
      // linkSocial triggers an OAuth redirect — the page navigates away,
      // so we don't need to handle success here. The audit log can be
      // handled via a callback URL or on the next page load.
      await authClient.linkSocial({
        provider: providerId,
        callbackURL: "/settings",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to link account",
        variant: "destructive",
      });
      setLinkingProvider(null);
    }
  };

  const handleUnlink = async (providerId: string) => {
    const account = accounts.find((a) => a.providerId === providerId);
    if (!account) return;

    // Prevent unlinking the last auth method
    if (accounts.length <= 1) {
      toast({
        title: "Cannot unlink",
        description: "You need at least one sign-in method.",
        variant: "destructive",
      });
      return;
    }

    setUnlinkingProvider(providerId);
    try {
      const result = await authClient.unlinkAccount({
        providerId,
        accountId: account.accountId,
      });

      if ((result as any).error) {
        toast({
          title: "Error",
          description: (result as any).error.message,
          variant: "destructive",
        });
      } else {
        await unlinkMutation.mutateAsync({ provider: providerId });
        toast({ title: `${providerId} account unlinked` });
        onUpdate();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUnlinkingProvider(null);
    }
  };

  return (
    <Section
      id="accounts"
      icon={LinkIcon}
      title="Linked Accounts"
      description="Connect social accounts for easier sign-in"
      delay={0.15}
    >
      <div className="space-y-3">
        {providers.map((provider) => {
          const linked = accounts.find((a) => a.providerId === provider.id);
          const isLinking = linkingProvider === provider.id;
          const isUnlinking = unlinkingProvider === provider.id;
          const ProviderIcon = provider.icon;

          return (
            <div
              key={provider.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background">
                  <ProviderIcon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {provider.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {linked ? (
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
                        Connected
                      </span>
                    ) : (
                      "Not connected"
                    )}
                  </p>
                </div>
              </div>

              {linked ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-destructive rounded-lg"
                  onClick={() => handleUnlink(provider.id)}
                  disabled={isUnlinking}
                >
                  {isUnlinking ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Unlink"
                  )}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs rounded-lg gap-1.5"
                  onClick={() => handleLink(provider.id)}
                  disabled={isLinking}
                >
                  {isLinking ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <LinkIcon className="h-3 w-3" />
                      Link
                    </>
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ─── Sessions ─── */
function SessionsSection({
  sessions,
  currentSessionToken,
  onUpdate,
}: {
  sessions: Session[];
  currentSessionToken: string | null;
  onUpdate: () => void;
}) {
  const { toast } = useToast();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  const logRevoked = useConvexMutation(api.settings.logSessionRevoked);
  const logAllRevoked = useConvexMutation(api.settings.logAllSessionsRevoked);
  const revokeMutation = useMutation({ mutationFn: logRevoked });
  const revokeAllMutation = useMutation({ mutationFn: logAllRevoked });

  const otherSessions = sessions.filter((s) => s.token !== currentSessionToken);

  const handleRevoke = async (session: Session) => {
    setRevokingId(session.token);
    try {
      const result = await authClient.revokeSession({ token: session.token });
      if ((result as any).error) {
        toast({
          title: "Error",
          description: (result as any).error.message,
          variant: "destructive",
        });
      } else {
        await revokeMutation.mutateAsync({ sessionId: session.id });
        toast({ title: "Session revoked" });
        onUpdate();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAll = async () => {
    setIsRevokingAll(true);
    try {
      const result = await authClient.revokeOtherSessions();
      if ((result as any).error) {
        toast({
          title: "Error",
          description: (result as any).error.message,
          variant: "destructive",
        });
      } else {
        await revokeAllMutation.mutateAsync({
          count: otherSessions.length,
        });
        toast({ title: "All other sessions revoked" });
        onUpdate();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRevokingAll(false);
    }
  };

  function parseUserAgent(ua?: string | null): string {
    if (!ua) return "Unknown device";
    // Simple extraction: grab the first recognizable browser/OS token
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari")) return "Safari";
    if (ua.includes("Edge")) return "Edge";
    return ua.split("/")[0] || "Unknown device";
  }

  return (
    <Section
      id="sessions"
      icon={Smartphone}
      title="Active Sessions"
      description="Devices where you're signed in"
      delay={0.2}
    >
      {/* Revoke all button */}
      {otherSessions.length > 0 && (
        <div className="mb-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs rounded-lg gap-1.5 text-muted-foreground"
              >
                <LogOut className="h-3 w-3" />
                Sign out all other devices
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Sign out all other sessions?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will sign you out from {otherSessions.length} other{" "}
                  {otherSessions.length === 1 ? "device" : "devices"}. Your
                  current session will remain active.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-lg">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRevokeAll}
                  disabled={isRevokingAll}
                  className="rounded-lg"
                >
                  {isRevokingAll && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Sign Out All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <div className="space-y-2.5">
        <AnimatePresence mode="popLayout">
          {sessions.map((session) => {
            const isCurrent = session.token === currentSessionToken;
            return (
              <motion.div
                key={session.token}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors ${
                  isCurrent
                    ? "border-primary/30 bg-primary/[0.04]"
                    : "border-border/60"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      isCurrent ? "bg-primary/10" : "bg-muted/60"
                    }`}
                  >
                    <Globe
                      className={`h-4 w-4 ${
                        isCurrent ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {parseUserAgent(session.userAgent)}
                      </p>
                      {isCurrent && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-primary/10 text-primary border-primary/20 shrink-0"
                        >
                          This device
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {session.ipAddress || "Unknown IP"}
                      {" · "}
                      {new Date(session.createdAt).toLocaleDateString(
                        undefined,
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      )}
                    </p>
                  </div>
                </div>

                {!isCurrent && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRevoke(session)}
                    disabled={revokingId === session.token}
                  >
                    {revokingId === session.token ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {sessions.length === 0 && (
          <div className="text-center py-10 text-sm text-muted-foreground">
            No active sessions found
          </div>
        )}
      </div>
    </Section>
  );
}

/* ─── Notifications ─── */
function NotificationsSection({ preferences }: { preferences: any }) {
  const { toast } = useToast();
  const [localPrefs, setLocalPrefs] = useState(
    preferences || {
      emailNotifications: true,
      pushNotifications: false,
      newGuidelineAlerts: true,
      systemAnnouncements: true,
    },
  );

  useEffect(() => {
    if (preferences) setLocalPrefs(preferences);
  }, [preferences]);

  const updatePreferences = useConvexMutation(
    api.settings.updateNotificationPreferences,
  );
  const prefsMutation = useMutation({
    mutationFn: updatePreferences,
    onSuccess: () => {
      toast({ title: "Preferences saved" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggle = (key: string) => {
    const newPrefs = { ...localPrefs, [key]: !localPrefs[key] };
    setLocalPrefs(newPrefs);
    prefsMutation.mutate({ preferences: newPrefs });
  };

  const notificationTypes = [
    {
      key: "emailNotifications",
      label: "Email Notifications",
      description: "Receive notifications via email",
      icon: Mail,
    },
    {
      key: "newGuidelineAlerts",
      label: "New Guidelines",
      description: "Alerts when new guidelines are published",
      icon: FileText,
    },
    {
      key: "systemAnnouncements",
      label: "Announcements",
      description: "Platform updates and maintenance notices",
      icon: Megaphone,
    },
  ];

  return (
    <Section
      id="notifications"
      icon={Bell}
      title="Notifications"
      description="Choose what you want to be notified about"
      delay={0.25}
    >
      <div className="space-y-1">
        {notificationTypes.map((type) => (
          <div
            key={type.key}
            className="flex items-center justify-between gap-4 rounded-xl px-3 py-3.5 hover:bg-muted/30 transition-colors -mx-1"
          >
            <div className="flex items-center gap-3">
              <type.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {type.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {type.description}
                </p>
              </div>
            </div>
            <Switch
              checked={localPrefs[type.key as keyof typeof localPrefs]}
              onCheckedChange={() => handleToggle(type.key)}
              disabled={prefsMutation.isPending}
            />
          </div>
        ))}
      </div>
    </Section>
  );
}

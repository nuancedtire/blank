import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Lock,
  Link as LinkIcon,
  Shield,
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
} from "lucide-react";

export const Route = createFileRoute("/_authed/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { data: accountInfo, refetch } = useQuery(
    convexQuery(api.settings.getAccountInfo, {})
  );
  
  // Fetch sessions and accounts using Better Auth client
  const [sessions, setSessions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    // Fetch sessions
    authClient.listSessions().then((result: any) => {
      if (result.data && !result.error) {
        setSessions(result.data);
      }
    });
    
    // Fetch linked accounts
    authClient.listAccounts().then((result: any) => {
      if (result.data && !result.error) {
        setAccounts(result.data);
      }
    });
  }, []);

  const refetchSessions = () => {
    authClient.listSessions().then((result: any) => {
      if (result.data && !result.error) {
        setSessions(result.data);
      }
    });
  };

  const refetchAccounts = () => {
    authClient.listAccounts().then((result: any) => {
      if (result.data && !result.error) {
        setAccounts(result.data);
      }
    });
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your account, security, and preferences
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr] xl:grid-cols-[280px_1fr]">
        {/* Sidebar Navigation */}
        <motion.nav
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-1"
        >
          <NavItem href="#profile" icon={User} label="Profile" />
          <NavItem href="#security" icon={Shield} label="Security & Password" />
          <NavItem href="#accounts" icon={LinkIcon} label="Linked Accounts" />
          <NavItem href="#sessions" icon={Smartphone} label="Active Sessions" />
          <NavItem href="#notifications" icon={Bell} label="Notifications" />
        </motion.nav>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="space-y-6"
        >
          <ProfileSection 
            accountInfo={accountInfo} 
            onUpdate={refetch} 
          />
          
          <SecuritySection 
            hasPassword={accounts.some((a: any) => a.provider === "credential")}
          />
          
          <LinkedAccountsSection 
            accounts={accounts} 
            onUpdate={refetchAccounts}
          />
          
          <SessionsSection 
            sessions={sessions} 
            onUpdate={refetchSessions}
          />
          
          <NotificationsSection 
            preferences={accountInfo?.notificationPreferences}
          />
        </motion.div>
      </div>
    </div>
  );
}

function NavItem({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Icon className="h-4 w-4" />
      {label}
    </a>
  );
}

// Profile Section
function ProfileSection({ accountInfo, onUpdate }: { accountInfo: any; onUpdate: () => void }) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(accountInfo?.profile?.name || "");
  
  const updateProfile = useConvexMutation(api.settings.updateProfile);
  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      toast({ title: "Profile updated", description: "Your name has been updated." });
      setIsEditing(false);
      onUpdate();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (name.trim()) {
      profileMutation.mutate({ name: name.trim() });
    }
  };

  return (
    <Card id="profile" className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Profile
        </CardTitle>
        <CardDescription>Manage your profile information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            {isEditing ? (
              <div className="flex gap-2">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
                <Button size="icon" onClick={handleSave} disabled={profileMutation.isPending}>
                  {profileMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
                <Button size="icon" variant="outline" onClick={() => setIsEditing(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2">
                <span>{accountInfo?.profile?.name || "Not set"}</span>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{accountInfo?.auth?.email}</span>
              {accountInfo?.auth?.emailVerified && (
                <Badge variant="secondary" className="ml-auto text-xs">Verified</Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Security Section
function SecuritySection({ hasPassword }: { hasPassword: boolean }) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const logPasswordChanged = useConvexMutation(api.settings.logPasswordChanged);
  const logMutation = useMutation({ mutationFn: logPasswordChanged });

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }

    try {
      const result = await authClient.changePassword({
        currentPassword: hasPassword ? currentPassword : "",
        newPassword,
        revokeOtherSessions: true,
      });

      if (result.error) {
        toast({ title: "Error", description: result.error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Password changed successfully" });
        await logMutation.mutateAsync({});
        setIsOpen(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Card id="security">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Security
        </CardTitle>
        <CardDescription>Manage your password and security settings</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Lock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Password</p>
                <p className="text-sm text-muted-foreground">
                  {hasPassword ? "Change your password" : "Set a password for your account"}
                </p>
              </div>
            </div>
            <DialogTrigger asChild>
              <Button variant="outline">
                {hasPassword ? "Change Password" : "Set Password"}
              </Button>
            </DialogTrigger>
          </div>
          
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{hasPassword ? "Change Password" : "Set Password"}</DialogTitle>
              <DialogDescription>
                {hasPassword 
                  ? "Enter your current password and a new password." 
                  : "Create a password for your account."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {hasPassword && (
                <div className="space-y-2">
                  <Label htmlFor="current">Current Password</Label>
                  <Input
                    id="current"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="new">New Password</Label>
                <Input
                  id="new"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm New Password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={handleChangePassword}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Linked Accounts Section
function LinkedAccountsSection({ accounts, onUpdate }: { accounts: any[]; onUpdate: () => void }) {
  const { toast } = useToast();
  const logLinked = useConvexMutation(api.settings.logAccountLinked);
  const logUnlinked = useConvexMutation(api.settings.logAccountUnlinked);
  const linkMutation = useMutation({ mutationFn: logLinked });
  const unlinkMutation = useMutation({ mutationFn: logUnlinked });

  const providers = [
    { id: "microsoft", name: "Microsoft", icon: "M" },
    { id: "google", name: "Google", icon: "G" },
  ];

  const handleLink = async (provider: string) => {
    try {
      const result = await authClient.linkSocial({
        provider,
        callbackURL: "/settings",
      });
      
      if (result.error) {
        toast({ title: "Error", description: result.error.message, variant: "destructive" });
      } else {
        await linkMutation.mutateAsync({ provider });
        toast({ title: "Success", description: `${provider} account linked` });
        onUpdate();
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleUnlink = async (provider: string) => {
    try {
      // Get the account for this provider
      const account = accounts.find((a: any) => a.provider === provider);
      if (!account) return;

      // Check if this is the last auth method
      const authMethods = accounts.length;
      if (authMethods <= 1) {
        toast({ 
          title: "Cannot unlink", 
          description: "You must have at least one login method.",
          variant: "destructive" 
        });
        return;
      }

      const result = await authClient.unlinkAccount({ 
        providerId: provider,
        accountId: account.id || account.accountId,
      });
      
      if (result.error) {
        toast({ title: "Error", description: result.error.message, variant: "destructive" });
      } else {
        await unlinkMutation.mutateAsync({ provider });
        toast({ title: "Success", description: `${provider} account unlinked` });
        onUpdate();
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Card id="accounts">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5 text-primary" />
          Linked Accounts
        </CardTitle>
        <CardDescription>Connect your account with social login providers</CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {providers.map((provider) => {
          const linked = accounts.find((a: any) => a.provider === provider.id);
          return (
            <div
              key={provider.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                  {provider.icon}
                </div>
                <div>
                  <p className="font-medium">{provider.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {linked ? "Connected" : "Not connected"}
                  </p>
                </div>
              </div>
              {linked ? (
                <Button variant="outline" size="sm" onClick={() => handleUnlink(provider.id)}>
                  Unlink
                </Button>
              ) : (
                <Button size="sm" onClick={() => handleLink(provider.id)}>
                  Link Account
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// Sessions Section
function SessionsSection({ sessions, onUpdate }: { sessions: any[]; onUpdate: () => void }) {
  const { toast } = useToast();
  const logRevoked = useConvexMutation(api.settings.logSessionRevoked);
  const logAllRevoked = useConvexMutation(api.settings.logAllSessionsRevoked);
  const revokeMutation = useMutation({ mutationFn: logRevoked });
  const revokeAllMutation = useMutation({ mutationFn: logAllRevoked });

  const handleRevoke = async (session: any) => {
    try {
      const result = await authClient.revokeSession({ token: session.token });
      if (result.error) {
        toast({ title: "Error", description: result.error.message, variant: "destructive" });
      } else {
        await revokeMutation.mutateAsync({ sessionId: session.id || session.token });
        toast({ title: "Success", description: "Session revoked" });
        onUpdate();
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRevokeAll = async () => {
    try {
      const result = await authClient.revokeSessions();
      if (result.error) {
        toast({ title: "Error", description: result.error.message, variant: "destructive" });
      } else {
        const otherSessions = sessions.filter((s: any) => !s.isCurrent);
        await revokeAllMutation.mutateAsync({ count: otherSessions.length });
        toast({ title: "Success", description: "All other sessions revoked" });
        onUpdate();
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Card id="sessions">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Active Sessions
            </CardTitle>
            <CardDescription>Manage your active sessions across devices</CardDescription>
          </div>
          {sessions.length > 1 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign out all other sessions?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will sign you out from all devices except this one.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRevokeAll}>Sign Out All</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {sessions.map((session: any) => (
          <div
            key={session.token || session.id}
            className={`flex items-center justify-between rounded-lg border p-4 ${
              session.isCurrent ? "border-primary/50 bg-primary/5" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-muted p-2">
                <Smartphone className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">
                    {session.userAgent?.split(" ")[0] || "Unknown Device"}
                  </p>
                  {session.isCurrent && (
                    <Badge variant="secondary" className="text-xs">Current</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {session.ipAddress || "Unknown IP"} · {new Date(session.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            {!session.isCurrent && (
              <Button variant="ghost" size="icon" onClick={() => handleRevoke(session)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No active sessions found
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Notifications Section
function NotificationsSection({ preferences }: { preferences: any }) {
  const { toast } = useToast();
  const [localPrefs, setLocalPrefs] = useState(preferences || {
    emailNotifications: true,
    pushNotifications: false,
    newGuidelineAlerts: true,
    systemAnnouncements: true,
  });

  // Update local state when preferences prop changes
  useEffect(() => {
    if (preferences) {
      setLocalPrefs(preferences);
    }
  }, [preferences]);

  const updatePreferences = useConvexMutation(api.settings.updateNotificationPreferences);
  const prefsMutation = useMutation({
    mutationFn: updatePreferences,
    onSuccess: () => {
      toast({ title: "Preferences saved", description: "Your notification preferences have been updated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleToggle = (key: string) => {
    const newPrefs = { ...localPrefs, [key]: !localPrefs[key] };
    setLocalPrefs(newPrefs);
    prefsMutation.mutate({ preferences: newPrefs });
  };

  const notificationTypes = [
    { key: "emailNotifications", label: "Email Notifications", description: "Receive notifications via email", icon: Mail },
    { key: "newGuidelineAlerts", label: "New Guidelines", description: "Get notified when new guidelines are published", icon: FileText },
    { key: "systemAnnouncements", label: "System Announcements", description: "Important updates about the platform", icon: Megaphone },
  ];

  return (
    <Card id="notifications">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Notifications
        </CardTitle>
        <CardDescription>Choose what notifications you receive</CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {notificationTypes.map((type) => (
          <div key={type.key} className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <type.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">{type.label}</p>
                <p className="text-sm text-muted-foreground">{type.description}</p>
              </div>
            </div>
            <Switch
              checked={localPrefs[type.key as keyof typeof localPrefs]}
              onCheckedChange={() => handleToggle(type.key)}
              disabled={prefsMutation.isPending}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

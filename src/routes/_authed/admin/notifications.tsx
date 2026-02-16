import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Megaphone,
  Plus,
  Trash2,
  Edit3,
  Users,
  Eye,
  Clock,
  AlertCircle,
  Info,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/_authed/admin/notifications")({
  component: AdminNotificationsPage,
});

const notificationTypes = [
  { value: "info", label: "Info", icon: Info, color: "bg-blue-500" },
  { value: "success", label: "Success", icon: CheckCircle, color: "bg-green-500" },
  { value: "warning", label: "Warning", icon: AlertTriangle, color: "bg-yellow-500" },
  { value: "alert", label: "Alert", icon: AlertCircle, color: "bg-red-500" },
];

function AdminNotificationsPage() {
  const { data: notifications, refetch } = useQuery(
    convexQuery(api.notifications.listAll, {})
  );
  const { data: users } = useQuery(convexQuery(api.users.listAll, {}));
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="min-h-[calc(100vh-8rem)] space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground text-sm">
            Create and manage notifications for users
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Notification
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <CreateNotificationForm 
              users={users || []} 
              onSuccess={() => {
                setIsCreateOpen(false);
                refetch();
              }}
            />
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatCard
          title="Total"
          value={notifications?.length || 0}
          icon={Megaphone}
        />
        <StatCard
          title="Broadcast"
          value={notifications?.filter((n: any) => n.isBroadcast).length || 0}
          icon={Users}
        />
        <StatCard
          title="Active"
          value={notifications?.filter((n: any) => !n.expiresAt || n.expiresAt > Date.now()).length || 0}
          icon={Eye}
        />
        <StatCard
          title="Expired"
          value={notifications?.filter((n: any) => n.expiresAt && n.expiresAt < Date.now()).length || 0}
          icon={Clock}
        />
      </motion.div>

      {/* Notifications List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="space-y-4"
      >
        <h2 className="text-lg font-semibold">All Notifications</h2>
        <div className="space-y-3">
          {notifications?.map((notification: any) => (
            <NotificationCard
              key={notification._id}
              notification={notification}
              onUpdate={refetch}
            />
          ))}
          {(!notifications || notifications.length === 0) && (
            <div className="text-center py-12 text-muted-foreground border rounded-lg">
              <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No notifications created yet</p>
              <p className="text-sm mt-1">Create your first notification to get started</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon }: { title: string; value: number; icon: any }) {
  return (
    <Card className="py-4">
      <CardContent className="flex items-center gap-4">
        <div className="rounded-full bg-primary/10 p-3">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateNotificationForm({ users, onSuccess }: { users: any[]; onSuccess: () => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [isBroadcast, setIsBroadcast] = useState(true);
  const [targetUserIds, setTargetUserIds] = useState<string[]>([]);
  const [expiresInDays, setExpiresInDays] = useState<string>("");

  const createNotification = useConvexMutation(api.notifications.create);
  const createMutation = useMutation({
    mutationFn: createNotification,
    onSuccess: () => {
      toast({ title: "Success", description: "Notification created successfully" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: "Error", description: "Title and message are required", variant: "destructive" });
      return;
    }

    const expiresAt = expiresInDays ? Date.now() + parseInt(expiresInDays) * 24 * 60 * 60 * 1000 : undefined;

    createMutation.mutate({
      title: title.trim(),
      message: message.trim(),
      type: type as "info" | "success" | "warning" | "alert",
      isBroadcast,
      targetUserIds: isBroadcast ? undefined : targetUserIds as any,
      expiresAt,
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create Notification</DialogTitle>
        <DialogDescription>
          Send a notification to all users or specific users
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification title"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Notification message"
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {notificationTypes.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${t.color}`} />
                    {t.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="font-medium">Broadcast to all users</p>
            <p className="text-sm text-muted-foreground">
              Send to all users instead of selected ones
            </p>
          </div>
          <Switch checked={isBroadcast} onCheckedChange={setIsBroadcast} />
        </div>
        {!isBroadcast && (
          <div className="space-y-2">
            <Label>Target Users</Label>
            <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
              {users.map((user: any) => (
                <label
                  key={user._id}
                  className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={targetUserIds.includes(user._id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTargetUserIds([...targetUserIds, user._id]);
                      } else {
                        setTargetUserIds(targetUserIds.filter((id) => id !== user._id));
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{user.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{user.email}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="expires">Expires In (days, optional)</Label>
          <Input
            id="expires"
            type="number"
            min="1"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value)}
            placeholder="Leave empty for no expiration"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onSuccess}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={createMutation.isPending}>
          {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create Notification
        </Button>
      </DialogFooter>
    </>
  );
}

function NotificationCard({ notification, onUpdate }: { notification: any; onUpdate: () => void }) {
  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const typeInfo = notificationTypes.find((t) => t.value === notification.type) || notificationTypes[0];
  const TypeIcon = typeInfo.icon;

  const isExpired = notification.expiresAt && notification.expiresAt < Date.now();

  const deleteNotification = useConvexMutation(api.notifications.remove);
  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      toast({ title: "Success", description: "Notification deleted" });
      onUpdate();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Card className={`overflow-hidden ${isExpired ? "opacity-60" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={`rounded-full ${typeInfo.color} p-2 text-white`}>
            <TypeIcon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{notification.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <EditNotificationForm
                      notification={notification}
                      onSuccess={() => {
                        setIsEditOpen(false);
                        onUpdate();
                      }}
                    />
                  </DialogContent>
                </Dialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete notification?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. The notification will be permanently removed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate({ notificationId: notification._id })}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
              <Badge variant={notification.isBroadcast ? "default" : "secondary"} className="text-xs">
                {notification.isBroadcast ? "Broadcast" : "Targeted"}
              </Badge>
              {notification.isBroadcast && (
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {notification.readCount || 0} read
                </span>
              )}
              <span>by {notification.creatorName || "Unknown"}</span>
              {isExpired && (
                <Badge variant="outline" className="text-xs text-destructive border-destructive">
                  Expired
                </Badge>
              )}
              {notification.expiresAt && !isExpired && (
                <span>Expires {new Date(notification.expiresAt).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EditNotificationForm({ notification, onSuccess }: { notification: any; onSuccess: () => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState(notification.title);
  const [message, setMessage] = useState(notification.message);
  const [type, setType] = useState(notification.type);

  const updateNotification = useConvexMutation(api.notifications.update);
  const updateMutation = useMutation({
    mutationFn: updateNotification,
    onSuccess: () => {
      toast({ title: "Success", description: "Notification updated" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: "Error", description: "Title and message are required", variant: "destructive" });
      return;
    }

    updateMutation.mutate({
      notificationId: notification._id,
      title: title.trim(),
      message: message.trim(),
      type: type as "info" | "success" | "warning" | "alert",
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Notification</DialogTitle>
        <DialogDescription>Update the notification details</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="edit-title">Title</Label>
          <Input
            id="edit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-message">Message</Label>
          <Textarea
            id="edit-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-type">Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {notificationTypes.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${t.color}`} />
                    {t.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onSuccess}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
          {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </DialogFooter>
    </>
  );
}

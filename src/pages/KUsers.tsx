import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, ChevronRight, Shield } from "lucide-react";
import PageTabs from "@/components/PageTabs";
import { useUsers } from "@/hooks/use-users";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import type { AppRole } from "@/types/database";

const tabs = ["K-Users", "K-Owners", "K-Admins"];

const roleMap: Record<string, AppRole> = {
  "K-Users": "user",
  "K-Owners": "owner",
  "K-Admins": "admin",
};

const KUsers = () => {
  const [activeTab, setActiveTab] = useState("K-Users");
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: users = [], isLoading } = useUsers(roleMap[activeTab]);
  const queryClient = useQueryClient();

  const [selectedUser, setSelectedUser] = useState<{ id: string; full_name: string; role: AppRole | null } | null>(null);
  const [newRole, setNewRole] = useState<AppRole>("user");
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleOpenRoleDialog = (user: { id: string; full_name: string; role: AppRole | null }) => {
    if (!isAdmin) return;
    setSelectedUser(user);
    setNewRole(user.role || "user");
  };

  const handleChangeRole = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      // Upsert: delete existing role then insert new one
      await supabase.from("user_roles").delete().eq("user_id", selectedUser.id);
      const { error } = await supabase.from("user_roles").insert({ user_id: selectedUser.id, role: newRole });
      if (error) throw error;
      toast({ title: "Role updated", description: `${selectedUser.full_name} is now ${newRole}.` });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setSelectedUser(null);
    } catch (e: any) {
      toast({ title: "Failed to update role", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="p-6">
        <div className="bg-card rounded-xl border p-6 animate-fade-in shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">
                {activeTab === "K-Users" ? "List of users" : activeTab === "K-Owners" ? "List of owners" : "List of admins"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {users.length} {activeTab === "K-Users" ? "users" : activeTab === "K-Owners" ? "owners" : "admins"}
              </p>
            </div>
            {activeTab !== "K-Users" && (
              <Button onClick={() => navigate("/dashboard/users/add", { state: { role: activeTab === "K-Owners" ? "owner" : "admin" } })}>
                <User size={16} className="mr-2" />
                Add new {activeTab === "K-Owners" ? "owner" : "admin"}
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Phone</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date Added</th>
                    {isAdmin && <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Role</th>}
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const date = new Date(user.created_at);
                    return (
                      <tr
                        key={user.id}
                        className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleOpenRoleDialog({ id: user.id, full_name: user.full_name, role: user.role })}
                      >
                        <td className="py-3 px-4">
                          <div className="text-sm font-semibold">{user.full_name}</div>
                        </td>
                        <td className="py-3 px-4 text-sm">{user.email}</td>
                        <td className="py-3 px-4 text-sm">{user.phone || '—'}</td>
                        <td className="py-3 px-4">
                          <div className="text-sm font-semibold">{date.toLocaleDateString()}</div>
                          <div className="text-xs text-muted-foreground">{date.toLocaleTimeString()}</div>
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-muted">
                              <Shield size={12} />
                              {user.role || "user"}
                            </span>
                          </td>
                        )}
                        <td className="py-3 px-4">
                          <ChevronRight size={18} className="text-muted-foreground" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {users.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No {activeTab === "K-Users" ? "users" : activeTab === "K-Owners" ? "owners" : "admins"} found.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Role Change Dialog (Admin only) */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Update the role for <span className="font-semibold">{selectedUser?.full_name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <label className="text-sm font-medium">New Role</label>
            <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>Cancel</Button>
            <Button onClick={handleChangeRole} disabled={saving}>
              {saving ? "Saving..." : "Save Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KUsers;

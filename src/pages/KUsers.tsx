import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, ChevronRight } from "lucide-react";
import PageTabs from "@/components/PageTabs";
import { useUsers } from "@/hooks/use-users";
import { Skeleton } from "@/components/ui/skeleton";
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
  const { data: users = [], isLoading } = useUsers(roleMap[activeTab]);

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
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const date = new Date(user.created_at);
                    return (
                      <tr key={user.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer">
                        <td className="py-3 px-4">
                          <div className="text-sm font-semibold">{user.full_name}</div>
                        </td>
                        <td className="py-3 px-4 text-sm">{user.email}</td>
                        <td className="py-3 px-4 text-sm">{user.phone || '—'}</td>
                        <td className="py-3 px-4">
                          <div className="text-sm font-semibold">{date.toLocaleDateString()}</div>
                          <div className="text-xs text-muted-foreground">{date.toLocaleTimeString()}</div>
                        </td>
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
    </div>
  );
};

export default KUsers;

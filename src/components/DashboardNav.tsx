import { useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Monitor, LayoutGrid, LogOut, Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useAvatarUpload } from "@/hooks/use-avatar-upload";
import KonnectikLogo from "@/assets/logo-white.png";

const navItems = [
  { label: "Dashboard", path: "/dashboard", exact: true },
  { label: "Users", path: "/dashboard/users", adminOnly: true },
  { label: "K-Zones", path: "/dashboard/k-zones" },
  { label: "K-Plans", path: "/dashboard/k-plans", adminOnly: true },
  { label: "Transactions", path: "/dashboard/transactions" },
  { label: "Notifications", path: "/dashboard/notifications", adminOnly: true },
  { label: "AP Health", path: "/dashboard/ap-health", adminOnly: true },
  { label: "Help Center", path: "/dashboard/help" },
];

const DashboardNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();
  const { uploadAvatar, uploading } = useAvatarUpload();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleSignOut = async () => {
    await signOut();
    navigate("/signin");
  };

  const displayName = profile?.full_name || "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const roleLabel = role === "admin" ? "Admin" : role === "owner" ? "Owner" : "User";

  return (
    <header className="bg-nav text-nav-foreground">
      <div className="flex items-center justify-between px-6 pt-3">
        <div className="flex items-end gap-8">
          <Link to="/dashboard" className="flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-lg bg-primary-foreground/10 flex items-center justify-center">
                <img
                  src={KonnectikLogo}
                  alt="Konnectik Logo"
                  className="h-10 w-10 rounded-lg bg-transparent p-1"
                />
            </div>
          </Link>

          <nav className="flex items-end gap-0.5">
            {navItems
              .filter((item) => !item.adminOnly || role === 'admin')
              .map((item) => {
              const isActive = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path) && !item.exact;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative px-4 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-secondary text-tab-active font-semibold rounded-t-lg -mb-px z-10"
                      : "hover:bg-primary-foreground/10 rounded-t-lg mb-0 font-medium"
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <>
                      <span className="absolute -left-2 bottom-0 w-2 h-2 bg-secondary" style={{
                        borderBottomRightRadius: '8px',
                        boxShadow: '4px 0 0 0 hsl(var(--secondary))',
                        background: 'transparent',
                      }} />
                      <span className="absolute -right-2 bottom-0 w-2 h-2 bg-secondary" style={{
                        borderBottomLeftRadius: '8px',
                        boxShadow: '-4px 0 0 0 hsl(var(--secondary))',
                        background: 'transparent',
                      }} />
                    </>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4 mb-2">
          <button className="p-2 rounded-md hover:bg-primary-foreground/10 transition-colors">
            <LayoutGrid size={18} />
          </button>
          <button className="p-2 rounded-md hover:bg-primary-foreground/10 transition-colors">
            <Monitor size={18} />
          </button>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-md hover:bg-primary-foreground/10 transition-colors"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
          <div
            className="flex items-center gap-3 ml-2 cursor-pointer rounded-lg px-2 py-1 hover:bg-primary-foreground/10 transition-colors"
            onClick={() => navigate("/dashboard/profile")}
            title="Profile settings"
          >
            <div className="text-right text-sm">
              <div className="font-semibold">{displayName}</div>
              <div className="text-xs opacity-80">{roleLabel}</div>
            </div>
            <div className="relative group">
              <Avatar className="h-9 w-9 bg-primary-foreground text-foreground cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                <AvatarFallback className="bg-primary-foreground text-foreground font-bold text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                <Camera size={14} className="text-white" />
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    await uploadAvatar(file);
                    window.location.reload();
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardNav;

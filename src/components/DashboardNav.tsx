import { Link, useLocation } from "react-router-dom";
import { Monitor, LayoutGrid } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import KonnectikLogo from "@/assets/logo-white.png";

const navItems = [
  { label: "Dashboard", path: "/dashboard", exact: true },
  { label: "Users", path: "/dashboard/users" },
  { label: "K-Zones", path: "/dashboard/k-zones" },
  { label: "K-Plans", path: "/dashboard/k-plans" },
  { label: "Transactions", path: "/dashboard/transactions" },
  { label: "Help Center", path: "/dashboard/help" },
];

const DashboardNav = () => {
  const location = useLocation();

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
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
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
                  {/* Curved connectors */}
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
          <div className="flex items-center gap-3 ml-2">
            <div className="text-right text-sm">
              <div className="font-semibold">Admin User</div>
              <div className="text-xs opacity-80">Admin</div>
            </div>
            <Avatar className="h-9 w-9 bg-primary-foreground text-foreground">
              <AvatarFallback className="bg-primary-foreground text-foreground font-bold text-sm">
                A
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardNav;

import { Link, useLocation } from "react-router-dom";
import { Monitor, LayoutGrid } from "lucide-react";
import KonnectikLogo from "./KonnectikLogo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
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
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
              <span className="font-bold text-lg">K</span>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary-foreground text-foreground"
                      : "hover:bg-primary-foreground/10"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
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

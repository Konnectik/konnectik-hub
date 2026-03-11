import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useWifiZones } from "@/hooks/use-wifi-zones";
import { useRouters } from "@/hooks/use-routers";
import { useTransactions } from "@/hooks/use-transactions";
import { useUsers } from "@/hooks/use-users";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wifi,
  Router,
  ArrowRightLeft,
  Wallet,
  Users,
  UserCheck,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";

const statusStyles: Record<string, string> = {
  Completed: "bg-green-100 text-green-700 border-green-200",
  Pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Failed: "bg-red-100 text-red-700 border-red-200",
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: zones = [], isLoading: zonesLoading } = useWifiZones();
  const { data: routers = [] } = useRouters();
  const { data: transactions = [], isLoading: txLoading } = useTransactions();
  const { data: allUsers = [] } = useUsers();
  const { data: owners = [] } = useUsers('owner');

  const totalBalance = transactions
    .filter((tx) => tx.status === "Completed" && tx.type === "credit")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const summaryCards = [
    {
      title: "Wi-Fi Zones",
      value: zones.length,
      icon: Wifi,
      subtitle: `${zones.filter((z) => z.status === "Active").length} active`,
      onClick: () => navigate("/dashboard/k-zones"),
      color: "text-primary",
      bgColor: "bg-accent",
    },
    {
      title: "Routers",
      value: routers.length,
      icon: Router,
      subtitle: `Across ${zones.length} zones`,
      onClick: () => navigate("/dashboard/k-zones"),
      color: "text-tab-active",
      bgColor: "bg-tab-active-bg",
    },
    {
      title: "Transactions",
      value: transactions.length,
      icon: ArrowRightLeft,
      subtitle: `${transactions.filter((tx) => tx.status === "Pending").length} pending`,
      onClick: () => navigate("/dashboard/transactions"),
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "Balance",
      value: `${totalBalance.toLocaleString()} XAF`,
      icon: Wallet,
      subtitle: "Available to withdraw",
      onClick: () => navigate("/dashboard/mybalance"),
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
  ];

  const adminCards = isAdmin
    ? [
        {
          title: "Total Users",
          value: allUsers.length,
          icon: Users,
          subtitle: "Registered users",
          onClick: () => navigate("/dashboard/users"),
          color: "text-violet-600",
          bgColor: "bg-violet-50",
        },
        {
          title: "K-Owners",
          value: owners.length,
          icon: UserCheck,
          subtitle: "Wi-Fi zone owners",
          onClick: () => navigate("/dashboard/users"),
          color: "text-sky-600",
          bgColor: "bg-sky-50",
        },
      ]
    : [];

  const allCards = [...adminCards, ...summaryCards];
  const isLoading = zonesLoading || txLoading;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {isAdmin ? "Admin Dashboard" : "My Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Platform overview and key metrics" : "Overview of your Wi-Fi zones and earnings"}
          </p>
        </div>
        <Badge variant="outline" className="text-tab-active border-tab-active bg-tab-active-bg font-semibold px-3 py-1">
          {isAdmin ? "Admin" : "Zone Owner"}
        </Badge>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCards.map((card) => (
            <Card key={card.title} className="cursor-pointer hover:shadow-md transition-shadow group animate-fade-in" onClick={card.onClick}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <div className={`h-9 w-9 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                  <card.icon size={18} className={card.color} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{card.value}</div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                  <ArrowUpRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Transactions</CardTitle>
            <button onClick={() => navigate("/dashboard/transactions")} className="text-sm text-tab-active hover:underline font-medium">View all</button>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No transactions yet.</p>
            ) : (
              <div className="space-y-2">
                {transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-3 px-4 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div>
                      <div className="font-medium text-sm text-foreground">{tx.user_name}</div>
                      <div className="text-xs text-muted-foreground">{tx.zone_name} · {tx.bundle_name}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm text-foreground">{tx.amount.toLocaleString()} {tx.currency}</span>
                      <Badge variant="outline" className={statusStyles[tx.status]}>{tx.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Zone Overview</CardTitle>
            <button onClick={() => navigate("/dashboard/k-zones")} className="text-sm text-tab-active hover:underline font-medium">Manage zones</button>
          </CardHeader>
          <CardContent>
            {zones.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No zones yet.</p>
            ) : (
              <div className="space-y-2">
                {zones.map((zone) => {
                  const zoneRevenue = transactions
                    .filter((tx) => tx.zone_id === zone.id && tx.status === "Completed" && tx.type === "credit")
                    .reduce((sum, tx) => sum + tx.amount, 0);
                  const zoneTxCount = transactions.filter((tx) => tx.zone_id === zone.id).length;
                  return (
                    <div key={zone.id} className="flex items-center justify-between py-3 px-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate("/dashboard/k-zones")}>
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${zone.status === "Active" ? "bg-emerald-50" : "bg-muted"}`}>
                          <Wifi size={14} className={zone.status === "Active" ? "text-emerald-600" : "text-muted-foreground"} />
                        </div>
                        <div>
                          <div className="font-medium text-sm text-foreground">{zone.name}</div>
                          <div className="text-xs text-muted-foreground">{zoneTxCount} transactions</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-sm text-emerald-600">+{zoneRevenue.toLocaleString()} XAF</div>
                        <Badge variant="outline" className={zone.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-muted text-muted-foreground"}>
                          {zone.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="animate-fade-in">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Revenue Summary</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Earnings from completed transactions</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <TrendingUp size={18} className="text-emerald-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{totalBalance.toLocaleString()} XAF</div>
          <p className="text-sm text-muted-foreground mt-1">
            From {transactions.filter((tx) => tx.status === "Completed").length} completed transactions across {zones.length} zones
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;

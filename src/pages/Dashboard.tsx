import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
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

// Mock data
const mockZones = [
  { id: 1, name: "Cité des Palmiers", routers: 3, status: "Active" },
  { id: 2, name: "PK17", routers: 2, status: "Active" },
  { id: 3, name: "Molyko, Buea", routers: 4, status: "Inactive" },
];

const ownedZoneIds = [1, 3];

const mockTransactions = [
  { id: 1, user: "Jean Kamga", zone: "Cité des Palmiers", zoneId: 1, plan: "K-DISCO", amount: 150, date: "21/12/2024", status: "Completed" },
  { id: 2, user: "Marie Ndongo", zone: "PK17", zoneId: 2, plan: "K-YAMO", amount: 300, date: "22/12/2024", status: "Completed" },
  { id: 3, user: "Paul Ekambi", zone: "Molyko, Buea", zoneId: 3, plan: "K-FLEX", amount: 1000, date: "23/12/2024", status: "Pending" },
  { id: 4, user: "Aisha Bello", zone: "Cité des Palmiers", zoneId: 1, plan: "K-FAMILY", amount: 2500, date: "01/01/2025", status: "Completed" },
  { id: 5, user: "Grace Tabi", zone: "PK17", zoneId: 2, plan: "K-YAMO", amount: 300, date: "10/01/2025", status: "Failed" },
];

const adminStats = { totalUsers: 128, totalOwners: 12 };

const statusStyles: Record<string, string> = {
  Completed: "bg-green-100 text-green-700 border-green-200",
  Pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Failed: "bg-red-100 text-red-700 border-red-200",
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const zones = isAdmin ? mockZones : mockZones.filter((z) => ownedZoneIds.includes(z.id));
  const transactions = isAdmin ? mockTransactions : mockTransactions.filter((tx) => ownedZoneIds.includes(tx.zoneId));

  const totalRouters = zones.reduce((sum, z) => sum + z.routers, 0);
  const totalBalance = transactions.filter((tx) => tx.status === "Completed").reduce((sum, tx) => sum + tx.amount, 0);

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
      value: totalRouters,
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

  const adminCards = [
    {
      title: "Total Users",
      value: adminStats.totalUsers,
      icon: Users,
      subtitle: "Registered users",
      onClick: () => navigate("/dashboard/users"),
      color: "text-violet-600",
      bgColor: "bg-violet-50",
    },
    {
      title: "K-Owners",
      value: adminStats.totalOwners,
      icon: UserCheck,
      subtitle: "Wi-Fi zone owners",
      onClick: () => navigate("/dashboard/users"),
      color: "text-sky-600",
      bgColor: "bg-sky-50",
    },
  ];

  const allCards = isAdmin ? [...adminCards, ...summaryCards] : summaryCards;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {isAdmin ? "Admin Dashboard" : "My Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Platform overview and key metrics"
              : "Overview of your Wi-Fi zones and earnings"}
          </p>
        </div>
        <Badge
          variant="outline"
          className="text-tab-active border-tab-active bg-tab-active-bg font-semibold px-3 py-1"
        >
          {isAdmin ? "Admin" : "Zone Owner"}
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {allCards.map((card) => (
          <Card
            key={card.title}
            className="cursor-pointer hover:shadow-md transition-shadow group animate-fade-in"
            onClick={card.onClick}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`h-9 w-9 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                <card.icon size={18} className={card.color} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{card.value}</div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                <ArrowUpRight
                  size={14}
                  className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Transactions & Zone Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Transactions</CardTitle>
            <button
              onClick={() => navigate("/dashboard/transactions")}
              className="text-sm text-tab-active hover:underline font-medium"
            >
              View all
            </button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {transactions.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-3 px-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <div className="font-medium text-sm text-foreground">{tx.user}</div>
                    <div className="text-xs text-muted-foreground">
                      {tx.zone} · {tx.plan}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm text-foreground">
                      {tx.amount.toLocaleString()} XAF
                    </span>
                    <Badge variant="outline" className={statusStyles[tx.status]}>
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Zone Overview */}
        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Zone Overview</CardTitle>
            <button
              onClick={() => navigate("/dashboard/k-zones")}
              className="text-sm text-tab-active hover:underline font-medium"
            >
              Manage zones
            </button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {zones.map((zone) => {
                const zoneRevenue = transactions
                  .filter((tx) => tx.zoneId === zone.id && tx.status === "Completed")
                  .reduce((sum, tx) => sum + tx.amount, 0);
                const zoneTxCount = transactions.filter((tx) => tx.zoneId === zone.id).length;
                return (
                  <div
                    key={zone.id}
                    className="flex items-center justify-between py-3 px-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate("/dashboard/k-zones")}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${zone.status === "Active" ? "bg-emerald-50" : "bg-muted"}`}>
                        <Wifi size={14} className={zone.status === "Active" ? "text-emerald-600" : "text-muted-foreground"} />
                      </div>
                      <div>
                        <div className="font-medium text-sm text-foreground">{zone.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {zone.routers} routers · {zoneTxCount} transactions
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm text-emerald-600">
                        +{zoneRevenue.toLocaleString()} XAF
                      </div>
                      <Badge
                        variant="outline"
                        className={zone.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-muted text-muted-foreground"}
                      >
                        {zone.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend (simple summary) */}
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
          <div className="text-3xl font-bold text-foreground">
            {totalBalance.toLocaleString()} XAF
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            From {transactions.filter((tx) => tx.status === "Completed").length} completed transactions across {zones.length} zones
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;

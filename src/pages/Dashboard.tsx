import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useAccessPoints } from "@/hooks/use-access-points";
import { useWalletTransactions } from "@/hooks/use-wallet-transactions";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wifi,
  ArrowRightLeft,
  Wallet,
  Users,
  Package,
  Activity,
  TrendingUp,
  ArrowUpRight,
  Radio,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const statusStyles: Record<string, string> = {
  confirmed: "bg-green-100 text-green-700 border-green-200",
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  failed: "bg-red-100 text-red-700 border-red-200",
};

const txTypeLabel: Record<string, string> = {
  recharge: "Recharge",
  debit: "Debit",
  refund: "Refund",
  reward: "Reward",
  gift: "Gift",
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: zones = [], isLoading: zonesLoading } = useWifiZones();
  const { data: walletTx = [], isLoading: txLoading } = useWalletTransactions();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  const isLoading = zonesLoading || txLoading || statsLoading;

  // Build revenue-by-zone chart data from wallet transactions (debits linked to zones would need joins;
  // for now use zone overview as-is and KPI cards from the stats function)
  const kpiCards = [
    {
      title: "Total Users",
      value: stats?.total_users ?? 0,
      icon: Users,
      subtitle: "Registered accounts",
      onClick: () => navigate("/dashboard/users"),
      color: "text-violet-600",
      bgColor: "bg-violet-50",
      adminOnly: true,
    },
    {
      title: "Active Bundles",
      value: stats?.active_bundles ?? 0,
      icon: Package,
      subtitle: "Currently active",
      onClick: () => navigate("/dashboard/k-plans"),
      color: "text-primary",
      bgColor: "bg-accent",
      adminOnly: false,
    },
    {
      title: "Active Sessions",
      value: stats?.active_sessions ?? 0,
      icon: Activity,
      subtitle: "Users connected now",
      onClick: () => navigate("/dashboard/transactions"),
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      adminOnly: false,
    },
    {
      title: "Access Points",
      value: `${stats?.online_access_points ?? 0}/${stats?.total_access_points ?? 0}`,
      icon: Radio,
      subtitle: "Online / Total",
      onClick: () => navigate("/dashboard/k-zones"),
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      adminOnly: false,
    },
    {
      title: "Wi-Fi Zones",
      value: zones.length,
      icon: Wifi,
      subtitle: `${zones.filter((z) => z.status === "Active").length} active`,
      onClick: () => navigate("/dashboard/k-zones"),
      color: "text-tab-active",
      bgColor: "bg-tab-active-bg",
      adminOnly: false,
    },
    {
      title: "Wallet Transactions",
      value: walletTx.length,
      icon: ArrowRightLeft,
      subtitle: `${walletTx.filter((tx) => tx.status === "pending").length} pending`,
      onClick: () => navigate("/dashboard/transactions"),
      color: "text-sky-600",
      bgColor: "bg-sky-50",
      adminOnly: false,
    },
  ];

  const visibleCards = isAdmin ? kpiCards : kpiCards.filter((c) => !c.adminOnly);

  // Revenue chart data
  const gmv = stats?.total_gmv_xaf ?? 0;
  const platformRevenue = stats?.platform_revenue_xaf ?? 0;
  const providerRevenue = gmv - platformRevenue;
  const revenueChart = [
    { name: "GMV", amount: gmv },
    { name: "Platform", amount: platformRevenue },
    { name: "Providers", amount: providerRevenue > 0 ? providerRevenue : 0 },
  ];

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

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleCards.map((card) => (
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
        {/* Revenue Chart */}
        {isAdmin && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">Revenue Breakdown</CardTitle>
              <p className="text-sm text-muted-foreground">GMV vs Platform vs Provider earnings (XAF)</p>
            </CardHeader>
            <CardContent>
              {gmv === 0 ? (
                <p className="text-muted-foreground text-center py-8">No revenue data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={revenueChart}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => `${v.toLocaleString()} XAF`} />
                    <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Wallet Transactions */}
        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Transactions</CardTitle>
            <button onClick={() => navigate("/dashboard/transactions")} className="text-sm text-tab-active hover:underline font-medium">View all</button>
          </CardHeader>
          <CardContent>
            {walletTx.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No transactions yet.</p>
            ) : (
              <div className="space-y-2">
                {walletTx.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-3 px-4 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div>
                      <div className="font-medium text-sm text-foreground">{txTypeLabel[tx.type] || tx.type}</div>
                      <div className="text-xs text-muted-foreground font-mono">{tx.reference.slice(0, 12)}…</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm text-foreground">{tx.net_xaf.toLocaleString()} XAF</span>
                      <Badge variant="outline" className={statusStyles[tx.status]}>{tx.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Summary */}
      <Card className="animate-fade-in">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Revenue Summary</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Gross merchandise value from all bundle purchases</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <TrendingUp size={18} className="text-emerald-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{gmv.toLocaleString()} XAF</div>
          <div className="flex gap-6 mt-2">
            <p className="text-sm text-muted-foreground">
              Platform: <span className="font-semibold text-foreground">{platformRevenue.toLocaleString()} XAF</span>
            </p>
            {isAdmin && (
              <p className="text-sm text-muted-foreground">
                Providers: <span className="font-semibold text-foreground">{(providerRevenue > 0 ? providerRevenue : 0).toLocaleString()} XAF</span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownLeft, ArrowUpRight, DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import PageTabs from "@/components/PageTabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Mock: current user role
type UserRole = "admin" | "zone-owner";
const currentRole: UserRole = "admin";

const mockZones = [
  { id: 1, name: "Cité des Palmiers" },
  { id: 2, name: "PK17" },
  { id: 3, name: "Molyko, Buea" },
  { id: 4, name: "Ngoa Ekele" },
];

// Admin sees all; zone-owner sees only their zones
const ownedZoneIds = [1, 3]; // mock: zone-owner owns these

const allTransactions = [
  { id: 1, type: "credit" as const, user: "Jean Kamga", zone: "Cité des Palmiers", zoneId: 1, plan: "K-DISCO", amount: 150, ccy: "XAF", date: "21/12/2024", status: "Completed" },
  { id: 2, type: "credit" as const, user: "Marie Ndongo", zone: "PK17", zoneId: 2, plan: "K-YAMO", amount: 300, ccy: "XAF", date: "22/12/2024", status: "Completed" },
  { id: 3, type: "credit" as const, user: "Paul Ekambi", zone: "Molyko, Buea", zoneId: 3, plan: "K-FLEX", amount: 1000, ccy: "XAF", date: "23/12/2024", status: "Pending" },
  { id: 4, type: "credit" as const, user: "Aisha Bello", zone: "Ngoa Ekele", zoneId: 4, plan: "K-FAMILY", amount: 2500, ccy: "XAF", date: "01/01/2025", status: "Completed" },
  { id: 5, type: "withdrawal" as const, user: "Admin", zone: "—", zoneId: 0, plan: "—", amount: 2000, ccy: "XAF", date: "02/01/2025", status: "Completed" },
  { id: 6, type: "credit" as const, user: "Grace Tabi", zone: "Cité des Palmiers", zoneId: 1, plan: "K-YAMO", amount: 300, ccy: "XAF", date: "10/01/2025", status: "Completed" },
  { id: 7, type: "withdrawal" as const, user: "Zone Owner", zone: "Molyko, Buea", zoneId: 3, plan: "—", amount: 500, ccy: "XAF", date: "12/01/2025", status: "Completed" },
];

const tabs = ["Overview", "Withdrawal History"];

const statusStyles: Record<string, string> = {
  Completed: "bg-green-100 text-green-700 border-green-200",
  Pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Failed: "bg-red-100 text-red-700 border-red-200",
};

const MyBalance = () => {
  const [activeTab, setActiveTab] = useState("Overview");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("");

  const isAdmin = currentRole === "admin";

  // Filter transactions based on role
  const transactions = isAdmin
    ? allTransactions
    : allTransactions.filter((tx) => ownedZoneIds.includes(tx.zoneId));

  const completedCredits = transactions
    .filter((tx) => tx.type === "credit" && tx.status === "Completed")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const completedWithdrawals = transactions
    .filter((tx) => tx.type === "withdrawal" && tx.status === "Completed")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const balance = completedCredits - completedWithdrawals;
  const pendingAmount = transactions
    .filter((tx) => tx.status === "Pending")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const withdrawals = transactions.filter((tx) => tx.type === "withdrawal");

  return (
    <div>
      <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="p-6 space-y-6">
        {/* Role indicator */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">
              {isAdmin ? "System Cashflow Overview" : "My Balance"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? "Monitor all financial activity across the platform"
                : "View earnings from your Wi-Fi zones"}
            </p>
          </div>
          <Badge variant="outline" className="text-tab-active border-tab-active bg-tab-active-bg font-semibold px-3 py-1">
            {isAdmin ? "Admin" : "Zone Owner"}
          </Badge>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {isAdmin ? "Total Balance" : "Available Balance"}
              </CardTitle>
              <Wallet size={18} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{balance.toLocaleString()} XAF</div>
              <p className="text-xs text-muted-foreground mt-1">
                {pendingAmount > 0 && `${pendingAmount.toLocaleString()} XAF pending`}
              </p>
            </CardContent>
          </Card>

          <Card className="animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Income
              </CardTitle>
              <TrendingUp size={18} className="text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +{completedCredits.toLocaleString()} XAF
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                From {transactions.filter((tx) => tx.type === "credit" && tx.status === "Completed").length} transactions
              </p>
            </CardContent>
          </Card>

          <Card className="animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Withdrawn
              </CardTitle>
              <TrendingDown size={18} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                -{completedWithdrawals.toLocaleString()} XAF
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {withdrawals.filter((tx) => tx.status === "Completed").length} withdrawals made
              </p>
            </CardContent>
          </Card>
        </div>

        {activeTab === "Overview" && (
          <>
            {/* Zone Breakdown (admin sees all, owner sees own) */}
            <Card className="animate-fade-in">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {isAdmin ? "Revenue by Zone" : "Your Zone Earnings"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Breakdown of income per Wi-Fi zone
                  </p>
                </div>
                <Button onClick={() => setWithdrawOpen(true)}>
                  <ArrowUpRight size={16} className="mr-2" />
                  Withdraw
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(isAdmin ? mockZones : mockZones.filter((z) => ownedZoneIds.includes(z.id))).map(
                    (zone) => {
                      const zoneIncome = transactions
                        .filter((tx) => tx.zoneId === zone.id && tx.type === "credit" && tx.status === "Completed")
                        .reduce((sum, tx) => sum + tx.amount, 0);
                      const txCount = transactions.filter((tx) => tx.zoneId === zone.id && tx.type === "credit").length;
                      return (
                        <div
                          key={zone.id}
                          className="flex items-center justify-between py-3 px-4 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div>
                            <div className="font-semibold">{zone.name}</div>
                            <div className="text-xs text-muted-foreground">{txCount} transactions</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">+{zoneIncome.toLocaleString()} XAF</div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {transactions.slice(0, 5).map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between py-3 px-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            tx.type === "credit" ? "bg-green-100" : "bg-muted"
                          }`}
                        >
                          {tx.type === "credit" ? (
                            <ArrowDownLeft size={14} className="text-green-600" />
                          ) : (
                            <ArrowUpRight size={14} className="text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {tx.type === "credit" ? `${tx.user} — ${tx.plan}` : "Withdrawal"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {tx.zone} · {tx.date}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`font-semibold text-sm ${tx.type === "credit" ? "text-green-600" : ""}`}>
                          {tx.type === "credit" ? "+" : "-"}{tx.amount.toLocaleString()} XAF
                        </div>
                        <Badge variant="outline" className={statusStyles[tx.status]}>
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === "Withdrawal History" && (
          <Card className="animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Withdrawal History</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {withdrawals.length} withdrawal{withdrawals.length !== 1 ? "s" : ""}
                </p>
              </div>
              <Button onClick={() => setWithdrawOpen(true)}>
                <ArrowUpRight size={16} className="mr-2" />
                Withdraw
              </Button>
            </CardHeader>
            <CardContent>
              {withdrawals.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No withdrawals yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Amount</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.map((tx) => (
                        <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="py-4 px-4 font-medium">{tx.date}</td>
                          <td className="py-4 px-4 font-semibold">{tx.amount.toLocaleString()} XAF</td>
                          <td className="py-4 px-4">
                            <Badge variant="outline" className={statusStyles[tx.status]}>
                              {tx.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Withdrawal</DialogTitle>
            <DialogDescription>
              Enter the amount you'd like to withdraw and select a payment method.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Amount (XAF)</Label>
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Available: {balance.toLocaleString()} XAF
              </p>
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={withdrawMethod} onValueChange={setWithdrawMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="momo">Mobile Money (MTN)</SelectItem>
                  <SelectItem value="om">Orange Money</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button disabled={!withdrawAmount || !withdrawMethod}>
              Confirm Withdrawal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyBalance;

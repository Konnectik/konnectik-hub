import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownLeft, ArrowUpRight, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import PageTabs from "@/components/PageTabs";
import { useTransactions } from "@/hooks/use-transactions";
import { useWifiZones } from "@/hooks/use-wifi-zones";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  const { isAdmin } = useAuth();
  const { data: transactions = [], isLoading: txLoading } = useTransactions();
  const { data: zones = [] } = useWifiZones();

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

  if (txLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{isAdmin ? "System Cashflow Overview" : "My Balance"}</h2>
            <p className="text-sm text-muted-foreground">
              {isAdmin ? "Monitor all financial activity across the platform" : "View earnings from your Wi-Fi zones"}
            </p>
          </div>
          <Badge variant="outline" className="text-tab-active border-tab-active bg-tab-active-bg font-semibold px-3 py-1">
            {isAdmin ? "Admin" : "Zone Owner"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{isAdmin ? "Total Balance" : "Available Balance"}</CardTitle>
              <Wallet size={18} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{balance.toLocaleString()} XAF</div>
              {pendingAmount > 0 && <p className="text-xs text-muted-foreground mt-1">{pendingAmount.toLocaleString()} XAF pending</p>}
            </CardContent>
          </Card>
          <Card className="animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
              <TrendingUp size={18} className="text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">+{completedCredits.toLocaleString()} XAF</div>
              <p className="text-xs text-muted-foreground mt-1">From {transactions.filter((tx) => tx.type === "credit" && tx.status === "Completed").length} transactions</p>
            </CardContent>
          </Card>
          <Card className="animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Withdrawn</CardTitle>
              <TrendingDown size={18} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-{completedWithdrawals.toLocaleString()} XAF</div>
              <p className="text-xs text-muted-foreground mt-1">{withdrawals.filter((tx) => tx.status === "Completed").length} withdrawals made</p>
            </CardContent>
          </Card>
        </div>

        {activeTab === "Overview" && (
          <>
            <Card className="animate-fade-in">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{isAdmin ? "Revenue by Zone" : "Your Zone Earnings"}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Breakdown of income per Wi-Fi zone</p>
                </div>
                <Button onClick={() => setWithdrawOpen(true)}>
                  <ArrowUpRight size={16} className="mr-2" />Withdraw
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {zones.map((zone) => {
                    const zoneIncome = transactions
                      .filter((tx) => tx.zone_id === zone.id && tx.type === "credit" && tx.status === "Completed")
                      .reduce((sum, tx) => sum + tx.amount, 0);
                    const txCount = transactions.filter((tx) => tx.zone_id === zone.id && tx.type === "credit").length;
                    return (
                      <div key={zone.id} className="flex items-center justify-between py-3 px-4 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div>
                          <div className="font-semibold">{zone.name}</div>
                          <div className="text-xs text-muted-foreground">{txCount} transactions</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">+{zoneIncome.toLocaleString()} XAF</div>
                        </div>
                      </div>
                    );
                  })}
                  {zones.length === 0 && <p className="text-muted-foreground text-center py-4">No zones found.</p>}
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in">
              <CardHeader><CardTitle className="text-lg">Recent Activity</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {transactions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between py-3 px-4 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${tx.type === "credit" ? "bg-green-100" : "bg-muted"}`}>
                          {tx.type === "credit" ? <ArrowDownLeft size={14} className="text-green-600" /> : <ArrowUpRight size={14} className="text-muted-foreground" />}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{tx.type === "credit" ? `${tx.user_name} — ${tx.bundle_name}` : "Withdrawal"}</div>
                          <div className="text-xs text-muted-foreground">{tx.zone_name} · {new Date(tx.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`font-semibold text-sm ${tx.type === "credit" ? "text-green-600" : ""}`}>
                          {tx.type === "credit" ? "+" : "-"}{tx.amount.toLocaleString()} {tx.currency}
                        </div>
                        <Badge variant="outline" className={statusStyles[tx.status]}>{tx.status}</Badge>
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && <p className="text-muted-foreground text-center py-4">No activity yet.</p>}
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
                <p className="text-sm text-muted-foreground">{withdrawals.length} withdrawal{withdrawals.length !== 1 ? "s" : ""}</p>
              </div>
              <Button onClick={() => setWithdrawOpen(true)}>
                <ArrowUpRight size={16} className="mr-2" />Withdraw
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
                          <td className="py-4 px-4 font-medium">{new Date(tx.created_at).toLocaleDateString()}</td>
                          <td className="py-4 px-4 font-semibold">{tx.amount.toLocaleString()} {tx.currency}</td>
                          <td className="py-4 px-4">
                            <Badge variant="outline" className={statusStyles[tx.status]}>{tx.status}</Badge>
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

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Withdrawal</DialogTitle>
            <DialogDescription>Enter the amount you'd like to withdraw and select a payment method.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Amount (XAF)</Label>
              <Input type="number" placeholder="e.g. 5000" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} />
              <p className="text-xs text-muted-foreground">Available: {balance.toLocaleString()} XAF</p>
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={withdrawMethod} onValueChange={setWithdrawMethod}>
                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="momo">Mobile Money (MTN)</SelectItem>
                  <SelectItem value="om">Orange Money</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button disabled={!withdrawAmount || !withdrawMethod}>Confirm Withdrawal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyBalance;

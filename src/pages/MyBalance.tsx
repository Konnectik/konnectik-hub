import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownLeft, ArrowUpRight, TrendingUp, TrendingDown, Wallet, AlertCircle } from "lucide-react";
import PageTabs from "@/components/PageTabs";
import { useWalletTransactions } from "@/hooks/use-wallet-transactions";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const tabs = ["Overview", "Withdrawal History"];

const statusStyles: Record<string, string> = {
  confirmed: "bg-green-100 text-green-700 border-green-200",
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  failed: "bg-red-100 text-red-700 border-red-200",
};

const MIN_WITHDRAWAL = 5000;

const MyBalance = () => {
  const [activeTab, setActiveTab] = useState("Overview");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("");

  const { isAdmin, profile } = useAuth();
  const { data: walletTx = [], isLoading: txLoading } = useWalletTransactions();

  const walletBalance = profile?.wallet_balance_xaf ?? 0;

  const totalRecharges = walletTx
    .filter((tx) => tx.type === "recharge" && tx.status === "confirmed")
    .reduce((sum, tx) => sum + tx.net_xaf, 0);

  const totalDebits = walletTx
    .filter((tx) => tx.type === "debit" && tx.status === "confirmed")
    .reduce((sum, tx) => sum + tx.net_xaf, 0);

  const pendingAmount = walletTx
    .filter((tx) => tx.status === "pending")
    .reduce((sum, tx) => sum + tx.amount_xaf, 0);

  // Filter debit transactions as "withdrawals" for the history tab
  const withdrawals = walletTx.filter((tx) => tx.type === "debit");

  const handleWithdraw = () => {
    const amount = Number(withdrawAmount);
    if (amount < MIN_WITHDRAWAL) {
      toast({
        title: "Minimum not met",
        description: `Minimum withdrawal is ${MIN_WITHDRAWAL.toLocaleString()} XAF.`,
        variant: "destructive",
      });
      return;
    }
    if (amount > walletBalance) {
      toast({
        title: "Insufficient balance",
        description: `Your available balance is ${walletBalance.toLocaleString()} XAF.`,
        variant: "destructive",
      });
      return;
    }
    // TODO: Call process-payout edge function once built
    toast({
      title: "Withdrawal requested",
      description: `${amount.toLocaleString()} XAF via ${withdrawMethod}. Processing will begin shortly.`,
    });
    setWithdrawOpen(false);
    setWithdrawAmount("");
    setWithdrawMethod("");
  };

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
              {isAdmin ? "Monitor all financial activity across the platform" : "View your wallet balance and transaction history"}
            </p>
          </div>
          <Badge variant="outline" className="text-tab-active border-tab-active bg-tab-active-bg font-semibold px-3 py-1">
            {isAdmin ? "Admin" : "Zone Owner"}
          </Badge>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Wallet Balance</CardTitle>
              <Wallet size={18} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{walletBalance.toLocaleString()} XAF</div>
              {pendingAmount > 0 && <p className="text-xs text-muted-foreground mt-1">{pendingAmount.toLocaleString()} XAF pending</p>}
            </CardContent>
          </Card>
          <Card className="animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Recharges</CardTitle>
              <TrendingUp size={18} className="text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">+{totalRecharges.toLocaleString()} XAF</div>
              <p className="text-xs text-muted-foreground mt-1">
                {walletTx.filter((tx) => tx.type === "recharge" && tx.status === "confirmed").length} recharges
              </p>
            </CardContent>
          </Card>
          <Card className="animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Debits</CardTitle>
              <TrendingDown size={18} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-{totalDebits.toLocaleString()} XAF</div>
              <p className="text-xs text-muted-foreground mt-1">
                {walletTx.filter((tx) => tx.type === "debit" && tx.status === "confirmed").length} debits
              </p>
            </CardContent>
          </Card>
        </div>

        {activeTab === "Overview" && (
          <>
            {/* Withdraw CTA */}
            <Card className="animate-fade-in">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Withdraw Funds</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Minimum withdrawal: {MIN_WITHDRAWAL.toLocaleString()} XAF</p>
                </div>
                <Button onClick={() => setWithdrawOpen(true)} disabled={walletBalance < MIN_WITHDRAWAL}>
                  <ArrowUpRight size={16} className="mr-2" />Withdraw
                </Button>
              </CardHeader>
              {walletBalance < MIN_WITHDRAWAL && (
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <AlertCircle size={14} />
                    Insufficient balance for withdrawal (min {MIN_WITHDRAWAL.toLocaleString()} XAF).
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Recent Activity */}
            <Card className="animate-fade-in">
              <CardHeader><CardTitle className="text-lg">Recent Activity</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {walletTx.slice(0, 8).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between py-3 px-4 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${tx.type === "recharge" || tx.type === "reward" || tx.type === "gift" ? "bg-green-100" : "bg-muted"}`}>
                          {tx.type === "recharge" || tx.type === "reward" || tx.type === "gift"
                            ? <ArrowDownLeft size={14} className="text-green-600" />
                            : <ArrowUpRight size={14} className="text-muted-foreground" />}
                        </div>
                        <div>
                          <div className="font-medium text-sm capitalize">{tx.type}</div>
                          <div className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`font-semibold text-sm ${tx.type === "recharge" || tx.type === "reward" || tx.type === "gift" ? "text-green-600" : ""}`}>
                          {tx.type === "recharge" || tx.type === "reward" || tx.type === "gift" ? "+" : "-"}{tx.net_xaf.toLocaleString()} XAF
                        </div>
                        <Badge variant="outline" className={statusStyles[tx.status]}>{tx.status}</Badge>
                      </div>
                    </div>
                  ))}
                  {walletTx.length === 0 && <p className="text-muted-foreground text-center py-4">No activity yet.</p>}
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
              <Button onClick={() => setWithdrawOpen(true)} disabled={walletBalance < MIN_WITHDRAWAL}>
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
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Fee</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Net</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Reference</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.map((tx) => (
                        <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="py-4 px-4 font-medium">{new Date(tx.created_at).toLocaleDateString()}</td>
                          <td className="py-4 px-4 font-semibold">{tx.amount_xaf.toLocaleString()} XAF</td>
                          <td className="py-4 px-4 text-muted-foreground">{tx.fee_xaf.toLocaleString()} XAF</td>
                          <td className="py-4 px-4 font-bold">{tx.net_xaf.toLocaleString()} XAF</td>
                          <td className="py-4 px-4 font-mono text-xs">{tx.reference}</td>
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

      {/* Withdrawal Dialog */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Withdrawal</DialogTitle>
            <DialogDescription>
              Minimum withdrawal: {MIN_WITHDRAWAL.toLocaleString()} XAF. Available: {walletBalance.toLocaleString()} XAF.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Amount (XAF)</Label>
              <Input type="number" placeholder={`Min ${MIN_WITHDRAWAL.toLocaleString()}`} value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} min={MIN_WITHDRAWAL} max={walletBalance} />
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
            <Button onClick={handleWithdraw} disabled={!withdrawAmount || !withdrawMethod}>
              Confirm Withdrawal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyBalance;

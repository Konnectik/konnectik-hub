import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PageTabs from "@/components/PageTabs";
import { useWalletTransactions } from "@/hooks/use-wallet-transactions";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { WalletTxStatus, WalletTxType } from "@/types/database";

const tabs = ["All", "Recharges", "Debits", "Refunds"];

const statusStyles: Record<WalletTxStatus, string> = {
  confirmed: "bg-green-100 text-green-700 border-green-200",
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  failed: "bg-red-100 text-red-700 border-red-200",
};

const typeLabels: Record<WalletTxType, string> = {
  recharge: "Recharge",
  debit: "Debit",
  refund: "Refund",
  reward: "Reward",
  gift: "Gift",
};

const typeFilterMap: Record<string, WalletTxType[] | null> = {
  All: null,
  Recharges: ["recharge"],
  Debits: ["debit"],
  Refunds: ["refund"],
};

const Transx = () => {
  const [activeTab, setActiveTab] = useState("All");
  const navigate = useNavigate();
  const { data: transactions = [], isLoading } = useWalletTransactions();

  const filtered = typeFilterMap[activeTab]
    ? transactions.filter((tx) => typeFilterMap[activeTab]!.includes(tx.type))
    : transactions;

  return (
    <div>
      <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="p-6">
        <div className="bg-card rounded-xl border p-6 animate-fade-in shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">Wallet Transactions</h2>
              <p className="text-sm text-muted-foreground">{filtered.length} transactions</p>
            </div>
            <Button onClick={() => navigate("/dashboard/mybalance")}>
              <Wallet size={16} className="mr-2" />
              My Balance
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((tx) => {
                    const date = new Date(tx.created_at);
                    return (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {typeLabels[tx.type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">{tx.amount_xaf.toLocaleString()} XAF</TableCell>
                        <TableCell className="text-muted-foreground">{tx.fee_xaf.toLocaleString()} XAF</TableCell>
                        <TableCell className="font-bold">{tx.net_xaf.toLocaleString()} XAF</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusStyles[tx.status]}>
                            {tx.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs max-w-[120px] truncate block">{tx.reference}</span>
                          {tx.mansar_ref && (
                            <span className="text-xs text-muted-foreground block mt-0.5">Mansar: {tx.mansar_ref}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{date.toLocaleDateString()}</div>
                          <div className="text-xs text-muted-foreground">{date.toLocaleTimeString()}</div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {filtered.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No transactions found.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Transx;

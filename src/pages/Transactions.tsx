import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PageTabs from "@/components/PageTabs";
import { useTransactions } from "@/hooks/use-transactions";
import { Skeleton } from "@/components/ui/skeleton";

const tabs = ["Transactions"];

const statusStyles: Record<string, string> = {
  Completed: "bg-green-100 text-green-700 border-green-200",
  Pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Failed: "bg-red-100 text-red-700 border-red-200",
};

const Transx = () => {
  const [activeTab, setActiveTab] = useState("Transactions");
  const navigate = useNavigate();
  const { data: transactions = [], isLoading } = useTransactions();

  return (
    <div>
      <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="p-6">
        <div className="bg-card rounded-xl border p-6 animate-fade-in shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">List of Transactions</h2>
              <p className="text-sm text-muted-foreground">{transactions.length} transactions</p>
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">User</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Wi-Fi Zone</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Plan</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const date = new Date(tx.created_at);
                    return (
                      <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer">
                        <td className="py-4 px-4 font-medium">{tx.user_name}</td>
                        <td className="py-4 px-4 text-sm text-muted-foreground">{tx.zone_name}</td>
                        <td className="py-4 px-4 text-sm font-semibold">{tx.bundle_name}</td>
                        <td className="py-4 px-4">
                          <div className="text-sm font-semibold">{tx.amount.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">{tx.currency}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm font-semibold">{date.toLocaleDateString()}</div>
                          <div className="text-xs text-muted-foreground">{date.toLocaleTimeString()}</div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant="outline" className={statusStyles[tx.status]}>
                            {tx.status}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <ChevronRight size={18} className="text-muted-foreground" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {transactions.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No transactions yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Transx;

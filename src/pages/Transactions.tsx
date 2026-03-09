import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PageTabs from "@/components/PageTabs";

const tabs = ["Transactions"];

const mockTransactions = [
  { id: 1, user: "Jean Kamga", zone: "Cité des Palmiers", plan: "K-DISCO", amount: 150, ccy: "XAF", date: "21/12/2024", time: "10:40 PM", status: "Completed" },
  { id: 2, user: "Marie Ndongo", zone: "PK17", plan: "K-YAMO", amount: 300, ccy: "XAF", date: "22/12/2024", time: "08:15 AM", status: "Completed" },
  { id: 3, user: "Paul Ekambi", zone: "Molyko, Buea", plan: "K-FLEX", amount: 1000, ccy: "XAF", date: "23/12/2024", time: "02:30 PM", status: "Pending" },
  { id: 4, user: "Aisha Bello", zone: "Ngoa Ekele", plan: "K-FAMILY", amount: 2500, ccy: "XAF", date: "01/01/2025", time: "04:00 PM", status: "Completed" },
  { id: 5, user: "David Fon", zone: "PK17", plan: "K-DISCO", amount: 150, ccy: "XAF", date: "05/01/2025", time: "11:20 AM", status: "Failed" },
  { id: 6, user: "Grace Tabi", zone: "Cité des Palmiers", plan: "K-YAMO", amount: 300, ccy: "XAF", date: "10/01/2025", time: "09:00 AM", status: "Completed" },
  { id: 7, user: "Samuel Njoh", zone: "Molyko, Buea", plan: "K-FAMILY", amount: 2500, ccy: "XAF", date: "15/01/2025", time: "06:45 PM", status: "Pending" },
];

const statusStyles: Record<string, string> = {
  Completed: "bg-green-100 text-green-700 border-green-200",
  Pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Failed: "bg-red-100 text-red-700 border-red-200",
};

const Transx = () => {
  const [activeTab, setActiveTab] = useState("Transactions");
  const navigate = useNavigate();

  return (
    <div>
      <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="p-6">
        <div className="bg-card rounded-xl border p-6 animate-fade-in shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">List of Transactions</h2>
              <p className="text-sm text-muted-foreground">{mockTransactions.length} transactions</p>
            </div>
            <Button onClick={() => navigate("/dashboard/mybalance")}>
              <Wallet size={16} className="mr-2" />
              My Balance
            </Button>
          </div>

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
                {mockTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer">
                    <td className="py-4 px-4 font-medium">{tx.user}</td>
                    <td className="py-4 px-4 text-sm text-muted-foreground">{tx.zone}</td>
                    <td className="py-4 px-4 text-sm font-semibold">{tx.plan}</td>
                    <td className="py-4 px-4">
                      <div className="text-sm font-semibold">{tx.amount.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{tx.ccy}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm font-semibold">{tx.date}</div>
                      <div className="text-xs text-muted-foreground">{tx.time}</div>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transx;

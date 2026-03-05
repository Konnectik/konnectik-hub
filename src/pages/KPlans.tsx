import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Currency, ChevronRight } from "lucide-react";
import PageTabs from "@/components/PageTabs";
import { a } from "vitest/dist/chunks/suite.d.FvehnV49.js";

const tabs = ["Bundles"];

const mockPlans = [
  { id: 1, name: "K-DISCO", duration: 6, duration_unit: "Hours", price: 150, ccy: "XAF", date: "21/12/2022", time: "10:40 PM" },
  { id: 2, name: "K-YAMO", duration: 24, duration_unit: "Hours", price: 300, ccy: "XAF", date: "21/12/2023", time: "10:40 PM" },
  { id: 3, name: "K-FLEX", duration: 5, duration_unit: "Days", price: 1000, ccy: "XAF", date: "21/12/2023", time: "10:40 PM" },
  { id: 4, name: "K-FAMILY", duration: 30, duration_unit: "Days", price: 2500, ccy: "XAF", date: "01/01/2026", time: "16:00 AM" },
];

const KPlans = () => {
  const [activeTab, setActiveTab] = useState("Bundles");
  const navigate = useNavigate();

  return (
    <div>
      <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content */}
      <div className="p-6">
        <div className="bg-card rounded-xl border p-6 animate-fade-in shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">List of bundles</h2>
              <p className="text-sm text-muted-foreground">{mockPlans.length} bundles</p>
            </div>
            <Button onClick={activeTab === "Bundles" ? () => navigate("/dashboard/k-plans/add") : undefined}>
              <Currency size={16} className="mr-2" />
              Add new bundle
            </Button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Duration</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Price</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Created at</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {mockPlans.map((plan) => (
                  <tr key={plan.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer">
                    <td className="py-3 px-4 font-medium">{plan.name}</td>
                    <td className="py-3 px-4">
                      <div className="text-sm font-semibold">{plan.duration}</div>
                      <div className="text-xs text-muted-foreground">{plan.duration_unit}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm font-semibold">{plan.price}</div>
                      <div className="text-xs text-muted-foreground">{plan.ccy}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm font-semibold">{plan.date}</div>
                      <div className="text-xs text-muted-foreground">{plan.time}</div>
                    </td>
                    <td className="py-3 px-4">
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

export default KPlans;

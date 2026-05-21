import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Currency, ChevronRight } from "lucide-react";
import PageTabs from "@/components/PageTabs";
import { useBundles } from "@/hooks/use-bundles";
import { Skeleton } from "@/components/ui/skeleton";

const tabs = ["Bundles"];

const KPlans = () => {
  const [activeTab, setActiveTab] = useState("Bundles");
  const navigate = useNavigate();
  const { data: bundles = [], isLoading } = useBundles();

  return (
    <div>
      <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="p-6">
        <div className="bg-card rounded-xl border p-6 animate-fade-in shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">List of bundles</h2>
              <p className="text-sm text-muted-foreground">{bundles.length} bundles</p>
            </div>
            <Button onClick={() => navigate("/dashboard/k-plans/add")}>
              <Currency size={16} className="mr-2" />
              Add new bundle
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
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
                  {bundles.map((plan) => {
                    const date = new Date(plan.created_at);
                    return (
                      <tr key={plan.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/dashboard/k-plans/${plan.id}`)}>
                        <td className="py-3 px-4 font-medium">{plan.name}</td>
                        <td className="py-3 px-4">
                          <div className="text-sm font-semibold">{plan.duration}</div>
                          <div className="text-xs text-muted-foreground">{plan.duration_unit}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm font-semibold">{plan.price.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">{plan.currency}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm font-semibold">{date.toLocaleDateString()}</div>
                          <div className="text-xs text-muted-foreground">{date.toLocaleTimeString()}</div>
                        </td>
                        <td className="py-3 px-4">
                          <ChevronRight size={18} className="text-muted-foreground" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {bundles.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No bundles yet. Add your first one!</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KPlans;

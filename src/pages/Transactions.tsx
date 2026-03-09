import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, Wallet } from "lucide-react";
import PageTabs from "@/components/PageTabs";

const tabs = ["Transactions"];

const Transx = () => {
    const [activeTab, setActiveTab] = useState("Transactions");
    const navigate = useNavigate();

    return (
        <div>
            <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Content */}
            <div className="p-6">
                <div className="bg-card rounded-xl border p-6 animate-fade-in shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold">List of Transactions</h2>
                            <p className="text-sm text-muted-foreground">{} transactions</p>
                        </div>
                        <Button onClick={activeTab === "Transactions" ? () => navigate("/dashboard/mybalance") : undefined}>
                            <Wallet size={16} className="mr-2" />
                            My Balance
                        </Button>
                    </div>
                </div>
            </div>"

        </div>
    )
};

export default Transx;
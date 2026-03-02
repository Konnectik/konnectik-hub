import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, ChevronRight } from "lucide-react";

const tabs = ["Zones", "Routers"];

const mockZones = [
  { id: 1, name: "Cité des Palmiers", location: "4.05603 N, 9.76367 E", radius: 150, bandwidth: 300, date: "21/12/2022", time: "10:40 PM" },
  { id: 2, name: "PK17", location: "4.05603 N, 9.76367 E", radius: 300, bandwidth: 1000, date: "21/12/2023", time: "10:40 PM" },
  { id: 3, name: "PK17-2", location: "4.05603 N, 9.76367 E", radius: 300, bandwidth: 1000, date: "21/12/2023", time: "10:40 PM" },
  { id: 4, name: "Molyko, Buea", location: "4.05603 N, 9.76367 E", radius: 200, bandwidth: 300, date: "01/01/2026", time: "16:00 AM" },
  { id: 5, name: "Ngoa Ekele", location: "4.05603 N, 9.76367 E", radius: 150, bandwidth: 300, date: "21/12/2022", time: "10:40 PM" },
];

const KZones = () => {
  const [activeTab, setActiveTab] = useState("Zones");

  return (
    <div>
      {/* Tabs */}
      <div className="bg-muted/60 px-6 pt-2">
        <div className="flex items-end gap-0.5">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === tab
                  ? "bg-background text-foreground rounded-t-lg border border-b-0 border-border -mb-px z-10 border-t-[3px] border-t-primary"
                  : "text-muted-foreground hover:text-foreground rounded-t-lg hover:bg-background/50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="border-b border-border -mx-6" />
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="bg-card rounded-xl border p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">List of zones</h2>
              <p className="text-sm text-muted-foreground">{mockZones.length} zones</p>
            </div>
            <Button>
              <MapPin size={16} className="mr-2" />
              Add new zone
            </Button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Location</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Radius (m)</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Bandwidth Limit (Mbps)</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date Added</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {mockZones.map((zone) => (
                  <tr key={zone.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer">
                    <td className="py-4 px-4 font-medium">{zone.name}</td>
                    <td className="py-4 px-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <MapPin size={14} className="text-muted-foreground" />
                        </div>
                        {zone.location}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm">{zone.radius}</td>
                    <td className="py-4 px-4 text-sm">{zone.bandwidth}</td>
                    <td className="py-4 px-4">
                      <div className="text-sm font-semibold">{zone.date}</div>
                      <div className="text-xs text-muted-foreground">{zone.time}</div>
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

export default KZones;

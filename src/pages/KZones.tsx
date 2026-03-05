import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, ChevronRight, Wifi } from "lucide-react";

const tabs = ["Zones", "Routers"];

const mockZones = [
  { id: 1, name: "Cité des Palmiers", location: "4.05603 N, 9.76367 E", radius: 150, bandwidth: 300, date: "21/12/2022", time: "10:40 PM" },
  { id: 2, name: "PK17", location: "4.05603 N, 9.76367 E", radius: 300, bandwidth: 1000, date: "21/12/2023", time: "10:40 PM" },
  { id: 3, name: "PK17-2", location: "4.05603 N, 9.76367 E", radius: 300, bandwidth: 1000, date: "21/12/2023", time: "10:40 PM" },
  { id: 4, name: "Molyko, Buea", location: "4.05603 N, 9.76367 E", radius: 200, bandwidth: 300, date: "01/01/2026", time: "16:00 AM" },
  { id: 5, name: "Ngoa Ekele", location: "4.05603 N, 9.76367 E", radius: 150, bandwidth: 300, date: "21/12/2022", time: "10:40 PM" },
];

const mockRouters = [
  { id: 1, name: "Cité des Palmiers", username: "citpalmiers", zone: "Cité des Palmiers", location: "4.05603 N, 9.76367 E", status: "Online"},
  { id: 2, name: "PK17 Router", username: "pk17router", zone: "PK17", location: "4.05603 N, 9.76367 E", status: "Online"},
  { id: 3, name: "Molyko Router", username: "molykorouter", zone: "Molyko, Buea", location: "4.05603 N, 9.76367 E", status: "Offline"},
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
                  ? "rounded-md shadow-sm"
                  : "text-muted-foreground hover:text-foreground rounded-md hover:bg-background/50"
              }`}
              style={
                activeTab === tab
                  ? { color: "#2F4F9D", backgroundColor: "#F3F4FF" }
                  : undefined
              }
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="border-b border-border -mx-6" />
      </div>

      {/* Content */}
      <div className="p-6 bg-gray-50 rounded-xl">
        <div className="bg-white rounded-xl border p-6 animate-fade-in shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">
                {activeTab === "Zones" ? "List of zones" : "List of routers"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {activeTab === "Zones" ? mockZones.length : mockRouters.length}{" "}
                {activeTab === "Zones" ? "zones" : "routers"}
              </p>
            </div>
            <Button>
              {activeTab === "Zones" ? (
                <MapPin size={16} className="mr-2" />
              ) : (
                <Wifi size={16} className="mr-2" />
              )}
              Add new {activeTab === "Zones" ? "zone" : "router"}
            </Button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  {activeTab === "Zones" ? (
                    <>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Location</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Radius (m)</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Bandwidth Limit (Mbps)</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date Added</th>
                    </>
                  ) : (
                    <>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Username</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Attached Zone</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                    </>
                  )}
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {activeTab === "Zones"
                  ? mockZones.map((zone) => (
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
                    ))
                  : mockRouters.map((router) => (
                      <tr key={router.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer">
                        <td className="py-4 px-4 font-medium">{router.name}</td>
                        <td className="py-4 px-4 text-sm text-muted-foreground">{router.username}</td>
                        <td className="py-4 px-4 ">
                          <div className="text-sm font-semibold">{router.zone}</div>
                          <div className="text-xs text-muted-foreground">{router.location}</div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={
                            router.status === "Online"
                              ? "text-green-500 font-medium"
                              : "text-red-500 font-medium"
                          }>
                            {router.status}
                          </span>
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

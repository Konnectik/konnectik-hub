import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, ChevronRight, Wifi } from "lucide-react";
import PageTabs from "@/components/PageTabs";
import { useWifiZones } from "@/hooks/use-wifi-zones";
import { useRouters } from "@/hooks/use-routers";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const tabs = ["Zones", "Routers"];

const KZones = () => {
  const [activeTab, setActiveTab] = useState("Zones");
  const navigate = useNavigate();
  const { data: zones = [], isLoading: zonesLoading } = useWifiZones();
  const { data: routers = [], isLoading: routersLoading } = useRouters();
  const [mapZone, setMapZone] = useState<{ name: string; lat: number; lng: number } | null>(null);

  const isLoading = activeTab === "Zones" ? zonesLoading : routersLoading;

  const parseLocation = (location: string) => {
    const [lat, lng] = location.split(",").map((s) => parseFloat(s.trim()));
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    return null;
  };

  return (
    <div>
      <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="p-6">
        <div className="bg-card rounded-xl border p-6 animate-fade-in shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">
                {activeTab === "Zones" ? "List of zones" : "List of routers"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {activeTab === "Zones" ? zones.length : routers.length}{" "}
                {activeTab === "Zones" ? "zones" : "routers"}
              </p>
            </div>
            <Button onClick={activeTab === "Zones" ? () => navigate("/dashboard/k-zones/add-zone") : () => navigate("/dashboard/k-zones/add-router")}>
              {activeTab === "Zones" ? (
                <MapPin size={16} className="mr-2" />
              ) : (
                <Wifi size={16} className="mr-2" />
              )}
              Add new {activeTab === "Zones" ? "zone" : "router"}
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
                    ? zones.map((zone) => {
                        const date = new Date(zone.created_at);
                        return (
                          <tr key={zone.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/dashboard/k-zones/zone/${zone.id}`)}>
                            <td className="py-4 px-4 font-medium">{zone.name}</td>
                            <td className="py-4 px-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-3">
                                {(() => {
                                  const coords = parseLocation(zone.location);
                                  if (coords) {
                                    return (
                                      <button
                                        type="button"
                                        className="w-12 h-12 rounded border border-border overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-primary/50 transition-all"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setMapZone({ name: zone.name, lat: coords.lat, lng: coords.lng });
                                        }}
                                        title="View on map"
                                      >
                                        <img
                                          src={`https://staticmap.openstreetmap.de/staticmap.php?center=${coords.lat},${coords.lng}&zoom=14&size=96x96&markers=${coords.lat},${coords.lng},red-pushpin`}
                                          alt="Map"
                                          className="w-full h-full object-cover"
                                          loading="lazy"
                                        />
                                      </button>
                                    );
                                  }
                                  return (
                                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                      <MapPin size={14} className="text-muted-foreground" />
                                    </div>
                                  );
                                })()}
                                <span>{zone.location}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-sm">{zone.radius}</td>
                            <td className="py-4 px-4 text-sm">{zone.bandwidth}</td>
                            <td className="py-4 px-4">
                              <div className="text-sm font-semibold">{date.toLocaleDateString()}</div>
                              <div className="text-xs text-muted-foreground">{date.toLocaleTimeString()}</div>
                            </td>
                            <td className="py-4 px-4">
                              <ChevronRight size={18} className="text-muted-foreground" />
                            </td>
                          </tr>
                        );
                      })
                    : routers.map((router) => (
                        <tr key={router.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/dashboard/k-zones/router/${router.id}`)}>
                          <td className="py-4 px-4 font-medium">{router.name}</td>
                          <td className="py-4 px-4 text-sm text-muted-foreground">{router.username}</td>
                          <td className="py-4 px-4">
                            <div className="text-sm font-semibold">{router.wifi_zones?.name || '—'}</div>
                            <div className="text-xs text-muted-foreground">{router.wifi_zones?.location || ''}</div>
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
              {((activeTab === "Zones" && zones.length === 0) || (activeTab === "Routers" && routers.length === 0)) && (
                <p className="text-center text-muted-foreground py-8">
                  No {activeTab === "Zones" ? "zones" : "routers"} yet. Add your first one!
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KZones;

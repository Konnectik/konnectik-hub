import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, ChevronRight, Plus } from "lucide-react";
import { useAccessPoints } from "@/hooks/use-access-points";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const statusColor: Record<string, string> = {
  online: "text-green-500",
  offline: "text-red-500",
  maintenance: "text-yellow-500",
};

const KZones = () => {
  const navigate = useNavigate();
  const { data: accessPoints = [], isLoading } = useAccessPoints();
  const [mapAp, setMapAp] = useState<{ name: string; lat: number; lng: number } | null>(null);

  return (
    <div>
      <div className="p-6">
        <div className="bg-card rounded-xl border p-6 animate-fade-in shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">Access Points</h2>
              <p className="text-sm text-muted-foreground">
                {accessPoints.length} access point{accessPoints.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Button onClick={() => navigate("/dashboard/k-zones/add")}>
              <Plus size={16} className="mr-2" />
              Add Access Point
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
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Zone Label</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Location</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Provider</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">SSID</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Router IP</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date Added</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {accessPoints.map((ap) => {
                    const date = new Date(ap.created_at);
                    const lat = ap.latitude;
                    const lng = ap.longitude;
                    return (
                      <tr
                        key={ap.id}
                        className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/dashboard/k-zones/${ap.id}`)}
                      >
                        <td className="py-4 px-4 font-medium">{ap.zone_label}</td>
                        <td className="py-4 px-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-3">
                            {lat != null && lng != null ? (
                              <button
                                type="button"
                                className="w-12 h-12 rounded border border-border overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-primary/50 transition-all"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMapAp({ name: ap.zone_label, lat, lng });
                                }}
                                title="View on map"
                              >
                                <img
                                  src={`https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=14&size=96x96&markers=${lat},${lng},red-pushpin`}
                                  alt="Map"
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              </button>
                            ) : (
                              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                <MapPin size={14} className="text-muted-foreground" />
                              </div>
                            )}
                            <span>{ap.location || `${lat?.toFixed(5)}, ${lng?.toFixed(5)}`}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm">
                          {ap.providers?.business_name || "—"}
                        </td>
                        <td className="py-4 px-4 text-sm">{ap.ssid || "—"}</td>
                        <td className="py-4 px-4 text-sm font-mono">{ap.router_ip || "—"}</td>
                        <td className="py-4 px-4">
                          <span className={`font-medium capitalize ${statusColor[ap.status] || ""}`}>
                            {ap.status}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm font-semibold">{date.toLocaleDateString()}</div>
                          <div className="text-xs text-muted-foreground">{date.toLocaleTimeString()}</div>
                        </td>
                        <td className="py-4 px-4">
                          <ChevronRight size={18} className="text-muted-foreground" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {accessPoints.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No access points yet. Add your first one!
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map Dialog */}
      <Dialog open={!!mapAp} onOpenChange={(open) => !open && setMapAp(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin size={18} className="text-primary" />
              {mapAp?.name}
            </DialogTitle>
          </DialogHeader>
          {mapAp && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Coordinates: {mapAp.lat.toFixed(5)}, {mapAp.lng.toFixed(5)}
              </p>
              <div className="rounded-lg overflow-hidden border border-border">
                <iframe
                  title="AP Location"
                  width="100%"
                  height="350"
                  style={{ border: 0 }}
                  loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapAp.lng - 0.01},${mapAp.lat - 0.006},${mapAp.lng + 0.01},${mapAp.lat + 0.006}&layer=mapnik&marker=${mapAp.lat},${mapAp.lng}`}
                />
              </div>
              <a
                href={`https://www.openstreetmap.org/?mlat=${mapAp.lat}&mlon=${mapAp.lng}#map=16/${mapAp.lat}/${mapAp.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Open in OpenStreetMap ↗
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KZones;

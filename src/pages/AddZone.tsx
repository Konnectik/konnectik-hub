import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAddWifiZone } from "@/hooks/use-wifi-zones";
import { useAuth } from "@/contexts/AuthContext";

const AddZone = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const addZone = useAddWifiZone();
  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("");
  const [bandwidth, setBandwidth] = useState("");

  const formatCoord = (value: string) => {
    // Allow negative sign, digits, and one decimal point only
    const cleaned = value.replace(/[^0-9.\-]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) return parts[0] + "." + parts.slice(1).join("");
    if (parts[1] && parts[1].length > 5) return parts[0] + "." + parts[1].slice(0, 5);
    return cleaned;
  };

  const isValidCoord = (val: string, type: "lat" | "lng") => {
    const num = parseFloat(val);
    if (isNaN(num)) return false;
    if (type === "lat") return num >= -90 && num <= 90;
    return num >= -180 && num <= 180;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !latitude || !longitude || !radius || !bandwidth) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    if (!isValidCoord(latitude, "lat")) {
      toast({ title: "Latitude must be between -90 and 90", variant: "destructive" });
      return;
    }
    if (!isValidCoord(longitude, "lng")) {
      toast({ title: "Longitude must be between -180 and 180", variant: "destructive" });
      return;
    }
    const lat = parseFloat(latitude).toFixed(5);
    const lng = parseFloat(longitude).toFixed(5);
    try {
      await addZone.mutateAsync({
        name: name.trim(),
        location: `${lat},${lng}`,
        radius: Number(radius),
        bandwidth: Number(bandwidth),
        owner_id: user?.id,
      });
      toast({ title: "Zone added successfully!" });
      navigate("/dashboard/k-zones");
    } catch (error: any) {
      toast({ title: error.message || "Failed to add zone", variant: "destructive" });
    }
  };

  return (
    <div>
      <div className="bg-muted/40 px-6 py-3 border-b border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => navigate("/dashboard/k-zones")} className="hover:text-foreground transition-colors">Zones</button>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">Add a new zone</span>
        </div>
      </div>

      <div className="p-6">
        <div className="bg-card rounded-xl border shadow-sm max-w-3xl mx-auto">
          <div className="px-8 pt-6">
            <div className="inline-flex">
              <span className="text-sm font-semibold text-primary border-b-[3px] border-primary pb-3 px-1">Zone Information</span>
            </div>
            <div className="border-b border-border -mx-8" />
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-8">
            <h3 className="text-lg font-bold mb-6">Basic information</h3>
            <div className="max-w-md mx-auto space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Name</Label>
                <Input id="name" placeholder="Zone Display Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Location (GIS Coordinates)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="latitude" className="text-xs text-muted-foreground">Latitude (-90 to 90)</Label>
                    <Input
                      id="latitude"
                      placeholder="e.g. 3.84803"
                      value={latitude}
                      onChange={(e) => setLatitude(formatCoord(e.target.value))}
                      inputMode="decimal"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="longitude" className="text-xs text-muted-foreground">Longitude (-180 to 180)</Label>
                    <Input
                      id="longitude"
                      placeholder="e.g. 11.50210"
                      value={longitude}
                      onChange={(e) => setLongitude(formatCoord(e.target.value))}
                      inputMode="decimal"
                    />
                  </div>
              </div>
              {/* Map Preview */}
              {latitude && longitude && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude)) && isValidCoord(latitude, "lat") && isValidCoord(longitude, "lng") && (
                <div className="rounded-lg overflow-hidden border border-border mt-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 text-xs text-muted-foreground">
                    <MapPin size={14} className="text-primary" />
                    <span>{parseFloat(latitude).toFixed(5)}, {parseFloat(longitude).toFixed(5)}</span>
                  </div>
                  <iframe
                    title="Zone Location Preview"
                    width="100%"
                    height="200"
                    style={{ border: 0 }}
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(longitude) - 0.005},${parseFloat(latitude) - 0.003},${parseFloat(longitude) + 0.005},${parseFloat(latitude) + 0.003}&layer=mapnik&marker=${latitude},${longitude}`}
                  />
                </div>
              )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="radius" className="text-sm font-medium">Radius of Action (In Meters)</Label>
                <Input id="radius" type="number" min={0} value={radius} onChange={(e) => setRadius(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bandwidth" className="text-sm font-medium">Bandwidth Limit (In MBps)</Label>
                <Input id="bandwidth" type="number" min={0} value={bandwidth} onChange={(e) => setBandwidth(e.target.value)} />
              </div>
              <div className="pt-4">
                <Button type="submit" className="w-full uppercase font-bold tracking-wide" disabled={addZone.isPending}>
                  {addZone.isPending ? "Adding..." : "Add Zone"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddZone;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAddAccessPoint } from "@/hooks/use-access-points";
import { useProviders } from "@/hooks/use-providers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AddAccessPoint = () => {
  const navigate = useNavigate();
  const addAp = useAddAccessPoint();
  const { data: providers = [] } = useProviders();

  const [form, setForm] = useState({
    zone_label: "",
    latitude: "",
    longitude: "",
    propagation_radius_m: "",
    ssid: "",
    router_ip: "",
    router_type: "",
    speed_profile_name: "",
    provider_id: "",
  });

  const formatCoord = (value: string) => {
    const cleaned = value.replace(/[^0-9.\-]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) return parts[0] + "." + parts.slice(1).join("");
    if (parts[1] && parts[1].length > 5) return parts[0] + "." + parts[1].slice(0, 5);
    return cleaned;
  };

  const isValidCoord = (val: string, type: "lat" | "lng") => {
    const num = parseFloat(val);
    if (isNaN(num)) return false;
    return type === "lat" ? num >= -90 && num <= 90 : num >= -180 && num <= 180;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.zone_label.trim() || !form.latitude || !form.longitude || !form.propagation_radius_m || !form.provider_id) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (!isValidCoord(form.latitude, "lat")) {
      toast({ title: "Latitude must be between -90 and 90", variant: "destructive" });
      return;
    }
    if (!isValidCoord(form.longitude, "lng")) {
      toast({ title: "Longitude must be between -180 and 180", variant: "destructive" });
      return;
    }
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    try {
      await addAp.mutateAsync({
        provider_id: form.provider_id,
        zone_label: form.zone_label.trim(),
        location: `${lat.toFixed(5)},${lng.toFixed(5)}`,
        latitude: lat,
        longitude: lng,
        propagation_radius_m: Number(form.propagation_radius_m),
        ssid: form.ssid.trim() || undefined,
        router_ip: form.router_ip.trim() || undefined,
        router_type: form.router_type.trim() || undefined,
        speed_profile_name: form.speed_profile_name.trim() || undefined,
      });
      toast({ title: "Access point added successfully!" });
      navigate("/dashboard/k-zones");
    } catch (error: any) {
      toast({ title: error.message || "Failed to add access point", variant: "destructive" });
    }
  };

  const showMap = form.latitude && form.longitude && isValidCoord(form.latitude, "lat") && isValidCoord(form.longitude, "lng");

  return (
    <div>
      <div className="bg-muted/40 px-6 py-3 border-b border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => navigate("/dashboard/k-zones")} className="hover:text-foreground transition-colors">Access Points</button>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">Add new access point</span>
        </div>
      </div>

      <div className="p-6">
        <div className="bg-card rounded-xl border shadow-sm max-w-3xl mx-auto">
          <div className="px-8 pt-6">
            <div className="inline-flex">
              <span className="text-sm font-semibold text-primary border-b-[3px] border-primary pb-3 px-1">Access Point Information</span>
            </div>
            <div className="border-b border-border -mx-8" />
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-8">
            <div className="max-w-md mx-auto space-y-5">
              {/* Zone Label */}
              <div className="space-y-2">
                <Label htmlFor="zone_label" className="text-sm font-medium">Zone Label *</Label>
                <Input id="zone_label" placeholder="e.g. Campus WiFi North" value={form.zone_label} onChange={(e) => setForm({ ...form, zone_label: e.target.value })} maxLength={100} />
              </div>

              {/* Provider */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Provider *</Label>
                <Select value={form.provider_id} onValueChange={(val) => setForm({ ...form, provider_id: val })}>
                  <SelectTrigger><SelectValue placeholder="Select a provider" /></SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.business_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Coordinates */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Location (GIS Coordinates) *</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Latitude (-90 to 90)</Label>
                    <Input placeholder="e.g. 3.84803" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: formatCoord(e.target.value) })} inputMode="decimal" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Longitude (-180 to 180)</Label>
                    <Input placeholder="e.g. 11.50210" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: formatCoord(e.target.value) })} inputMode="decimal" />
                  </div>
                </div>
                {showMap && (
                  <div className="rounded-lg overflow-hidden border border-border mt-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 text-xs text-muted-foreground">
                      <MapPin size={14} className="text-primary" />
                      <span>{parseFloat(form.latitude).toFixed(5)}, {parseFloat(form.longitude).toFixed(5)}</span>
                    </div>
                    <iframe
                      title="Location Preview"
                      width="100%"
                      height="200"
                      style={{ border: 0 }}
                      loading="lazy"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(form.longitude) - 0.005},${parseFloat(form.latitude) - 0.003},${parseFloat(form.longitude) + 0.005},${parseFloat(form.latitude) + 0.003}&layer=mapnik&marker=${form.latitude},${form.longitude}`}
                    />
                  </div>
                )}
              </div>

              {/* Radius */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Propagation Radius (meters) *</Label>
                <Input type="number" min={0} placeholder="e.g. 100" value={form.propagation_radius_m} onChange={(e) => setForm({ ...form, propagation_radius_m: e.target.value })} />
              </div>

              {/* SSID */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">SSID</Label>
                <Input placeholder="e.g. Konnectik-Free" value={form.ssid} onChange={(e) => setForm({ ...form, ssid: e.target.value })} />
              </div>

              {/* Router IP */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Router WireGuard IP</Label>
                <Input placeholder="e.g. 10.0.0.2" value={form.router_ip} onChange={(e) => setForm({ ...form, router_ip: e.target.value })} />
              </div>

              {/* Router Type */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Router Type</Label>
                <Input placeholder="e.g. Mikrotik hAP ac³" value={form.router_type} onChange={(e) => setForm({ ...form, router_type: e.target.value })} />
              </div>

              {/* Speed Profile */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Speed Profile</Label>
                <Input placeholder="e.g. 5M/5M" value={form.speed_profile_name} onChange={(e) => setForm({ ...form, speed_profile_name: e.target.value })} />
              </div>

              <div className="pt-4">
                <Button type="submit" className="w-full uppercase font-bold tracking-wide" disabled={addAp.isPending}>
                  {addAp.isPending ? "Adding..." : "Add Access Point"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddAccessPoint;

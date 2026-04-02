import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Save, Trash2, MapPin } from "lucide-react";
import { useAccessPoints, useUpdateAccessPoint, useDeleteAccessPoint } from "@/hooks/use-access-points";
import { useProviders } from "@/hooks/use-providers";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";

const EditAccessPoint = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: accessPoints = [], isLoading } = useAccessPoints();
  const { data: providers = [] } = useProviders();
  const updateAp = useUpdateAccessPoint();
  const deleteAp = useDeleteAccessPoint();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [step, setStep] = useState(1);

  const ap = accessPoints.find((a) => a.id === id);

  const [form, setForm] = useState({
    zone_label: "",
    latitude: "",
    longitude: "",
    propagation_radius_m: 0,
    ssid: "",
    router_ip: "",
    router_type: "",
    speed_profile_name: "",
    provider_id: "",
    status: "offline" as string,
  });

  useEffect(() => {
    if (ap) {
      setForm({
        zone_label: ap.zone_label,
        latitude: ap.latitude?.toString() || "",
        longitude: ap.longitude?.toString() || "",
        propagation_radius_m: ap.propagation_radius_m,
        ssid: ap.ssid || "",
        router_ip: ap.router_ip || "",
        router_type: ap.router_type || "",
        speed_profile_name: ap.speed_profile_name || "",
        provider_id: ap.provider_id,
        status: ap.status,
      });
    }
  }, [ap]);

  const formatCoord = (value: string) => {
    const cleaned = value.replace(/[^0-9.\-]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) return parts[0] + "." + parts.slice(1).join("");
    if (parts[1] && parts[1].length > 5) return parts[0] + "." + parts[1].slice(0, 5);
    return cleaned;
  };

  const validateStep1 = () => {
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (!form.zone_label.trim()) {
      toast({ title: "Zone label is required", variant: "destructive" });
      return false;
    }
    if (isNaN(lat) || lat < -90 || lat > 90) {
      toast({ title: "Latitude must be between -90 and 90", variant: "destructive" });
      return false;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      toast({ title: "Longitude must be between -180 and 180", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleSave = async () => {
    if (!id) return;
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    try {
      await updateAp.mutateAsync({
        id,
        updates: {
          zone_label: form.zone_label,
          location: `${lat.toFixed(5)},${lng.toFixed(5)}`,
          latitude: lat,
          longitude: lng,
          propagation_radius_m: form.propagation_radius_m,
          ssid: form.ssid || null,
          router_ip: form.router_ip || null,
          router_type: form.router_type || null,
          speed_profile_name: form.speed_profile_name || null,
          provider_id: form.provider_id,
          status: form.status as any,
        },
      });
      toast({ title: "Access point updated successfully" });
      navigate("/dashboard/k-zones");
    } catch {
      toast({ title: "Failed to update access point", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteAp.mutateAsync(id);
      toast({ title: "Access point deleted successfully" });
      navigate("/dashboard/k-zones");
    } catch {
      toast({ title: "Failed to delete access point", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (!ap) return <div className="p-6">Access point not found.</div>;

  const showMap = form.latitude && form.longitude && !isNaN(parseFloat(form.latitude)) && !isNaN(parseFloat(form.longitude));

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Button variant="ghost" onClick={() => navigate("/dashboard/k-zones")} className="mb-4">
        <ArrowLeft size={16} className="mr-2" /> Back to Access Points
      </Button>

      <div className="bg-card rounded-xl border shadow-sm">
        {/* Step tabs */}
        <div className="px-6 pt-6">
          <div className="flex gap-6">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`text-sm font-semibold pb-3 px-1 transition-colors ${step === 1 ? "text-primary border-b-[3px] border-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              1. Access Point Information
            </button>
            <button
              type="button"
              onClick={() => { if (validateStep1()) setStep(2); }}
              className={`text-sm font-semibold pb-3 px-1 transition-colors ${step === 2 ? "text-primary border-b-[3px] border-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              2. Router Information
            </button>
          </div>
          <div className="border-b border-border -mx-6" />
        </div>

        <div className="px-6 py-6">
          {step === 1 && (
            <div className="space-y-4 max-w-md mx-auto">
              <div className="space-y-2">
                <Label>Zone Label *</Label>
                <Input value={form.zone_label} onChange={(e) => setForm({ ...form, zone_label: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label>Provider *</Label>
                <Select value={form.provider_id} onValueChange={(val) => setForm({ ...form, provider_id: val })}>
                  <SelectTrigger><SelectValue placeholder="Select a provider" /></SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.business_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Location (GIS Coordinates) *</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Latitude (-90 to 90)</Label>
                    <Input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: formatCoord(e.target.value) })} placeholder="e.g. 3.84803" inputMode="decimal" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Longitude (-180 to 180)</Label>
                    <Input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: formatCoord(e.target.value) })} placeholder="e.g. 11.50210" inputMode="decimal" />
                  </div>
                </div>
                {showMap && (
                  <div className="rounded-lg overflow-hidden border border-border mt-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 text-xs text-muted-foreground">
                      <MapPin size={14} className="text-primary" />
                      <span>{parseFloat(form.latitude).toFixed(5)}, {parseFloat(form.longitude).toFixed(5)}</span>
                    </div>
                    <iframe title="AP Location" width="100%" height="220" style={{ border: 0 }} loading="lazy"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(form.longitude) - 0.005},${parseFloat(form.latitude) - 0.003},${parseFloat(form.longitude) + 0.005},${parseFloat(form.latitude) + 0.003}&layer=mapnik&marker=${form.latitude},${form.longitude}`}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Radius (m) *</Label>
                  <Input type="number" value={form.propagation_radius_m} onChange={(e) => setForm({ ...form, propagation_radius_m: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(val) => setForm({ ...form, status: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>SSID</Label>
                <Input value={form.ssid} onChange={(e) => setForm({ ...form, ssid: e.target.value })} placeholder="e.g. Konnectik-Free" />
              </div>

              <div className="pt-4">
                <Button type="button" onClick={handleNext} className="w-full uppercase font-bold tracking-wide">
                  Next <ArrowRight size={16} className="ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 max-w-md mx-auto">
              <div className="space-y-2">
                <Label>Router WireGuard IP</Label>
                <Input value={form.router_ip} onChange={(e) => setForm({ ...form, router_ip: e.target.value })} placeholder="e.g. 10.0.0.2" />
                <p className="text-xs text-muted-foreground">Assigned by an administrator after VPN tunnel configuration.</p>
              </div>

              <div className="space-y-2">
                <Label>Router Type</Label>
                <Input value={form.router_type} onChange={(e) => setForm({ ...form, router_type: e.target.value })} placeholder="e.g. Mikrotik hAP ac³" />
              </div>

              <div className="space-y-2">
                <Label>Speed Profile</Label>
                <Input value={form.speed_profile_name} onChange={(e) => setForm({ ...form, speed_profile_name: e.target.value })} placeholder="e.g. 5M/5M" />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 uppercase font-bold tracking-wide">
                  <ArrowLeft size={16} className="mr-2" /> Back
                </Button>
                <Button onClick={handleSave} disabled={updateAp.isPending} className="flex-1 uppercase font-bold tracking-wide">
                  <Save size={16} className="mr-2" /> Save Changes
                </Button>
              </div>

              <div className="pt-2">
                <Button variant="destructive" onClick={() => setConfirmOpen(true)} className="w-full">
                  <Trash2 size={16} className="mr-2" /> Delete Access Point
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Access Point</DialogTitle>
            <DialogDescription>This will permanently delete "{ap.zone_label}" and cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteAp.isPending}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditAccessPoint;

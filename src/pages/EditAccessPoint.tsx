import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Save, Trash2, MapPin } from "lucide-react";
import { useAccessPoints, useUpdateAccessPoint, useDeleteAccessPoint } from "@/hooks/use-access-points";
import { useProviders } from "@/hooks/use-providers";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
  const provisionedRef = useRef(false);

  const ap = accessPoints.find((a) => a.id === id);

  const [form, setForm] = useState({
    zone_label: "",
    latitude: "",
    longitude: "",
    propagation_radius_m: 0,
    ssid: "",
    router_type: "",
    speed_profile_name: "",
    provider_id: "",
    status: "offline" as string,
    tunnel_status: "pending" as "pending" | "connected" | "disconnected",
    tunnel_ip: "",
    wg_public_key: "",
    generated_command: "",
  });

  useEffect(() => {
    if (ap) {
      setForm({
        zone_label: ap.zone_label,
        latitude: ap.latitude?.toString() || "",
        longitude: ap.longitude?.toString() || "",
        propagation_radius_m: ap.propagation_radius_m,
        ssid: ap.ssid || "",
        router_type: ap.router_type || "",
        speed_profile_name: ap.speed_profile_name || "",
        provider_id: ap.provider_id,
        status: ap.status,
        tunnel_status: (ap.tunnel_status as any) || "pending",
        tunnel_ip: ap.tunnel_ip || "",
        wg_public_key: ap.wg_public_key || "",
        generated_command: "",
      });
    }
  }, [ap]);

  // Auto-provision tunnel when entering Step 2 for the first time
  useEffect(() => {
    if (step !== 2 || !id) return;
    if (form.tunnel_ip || provisionedRef.current) return;
    provisionedRef.current = true;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("provision-router", {
          body: { ap_id: id },
        });
        if (error) throw error;
        if (data?.command) {
          setForm((f) => ({
            ...f,
            generated_command: data.command,
            tunnel_ip: data.tunnel_ip || f.tunnel_ip,
          }));
        }
      } catch (e: any) {
        provisionedRef.current = false;
        toast({ title: "Failed to generate router commands", description: e?.message, variant: "destructive" });
      }
    })();
  }, [step, id, form.tunnel_ip, toast]);

  // If already provisioned, fetch the command lazily when entering Step 2
  useEffect(() => {
    if (step !== 2 || !id) return;
    if (!form.tunnel_ip || form.generated_command) return;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("provision-router", {
          body: { ap_id: id },
        });
        if (error) throw error;
        if (data?.command) {
          setForm((f) => ({ ...f, generated_command: data.command }));
        }
      } catch {
        /* silent */
      }
    })();
  }, [step, id, form.tunnel_ip, form.generated_command]);

  // Realtime: watch tunnel_status until connected
  useEffect(() => {
    if (step !== 2 || !id) return;
    if (form.tunnel_status === "connected") return;
    const channel = supabase
      .channel(`ap-tunnel-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "access_points", filter: `id=eq.${id}` },
        (payload) => {
          const row = payload.new as any;
          setForm((f) => ({
            ...f,
            tunnel_status: row.tunnel_status || f.tunnel_status,
            tunnel_ip: row.tunnel_ip || f.tunnel_ip,
          }));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [step, id, form.tunnel_status]);

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
          router_ip: form.tunnel_ip || null,
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
            <div className="space-y-5 max-w-md mx-auto">
              {/* Generated command block */}
              <div className="space-y-2">
                <Label>Paste this into your Mikrotik terminal</Label>
                <p className="text-xs text-muted-foreground">
                  Open Winbox → click your router → New Terminal, then paste the commands below.
                </p>
                <div className="bg-muted rounded-lg p-4 font-mono text-xs whitespace-pre-wrap border border-border leading-relaxed">
                  {form.generated_command || "Generating command..."}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (form.generated_command) {
                      navigator.clipboard.writeText(form.generated_command);
                      toast({ title: "Commands copied to clipboard" });
                    }
                  }}
                >
                  Copy all commands
                </Button>
              </div>

              {/* Tunnel status indicator */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  form.tunnel_status === "connected"
                    ? "bg-green-500"
                    : form.tunnel_status === "disconnected"
                    ? "bg-red-500"
                    : "bg-amber-400 animate-pulse"
                }`} />
                <div>
                  <p className="text-sm font-medium">
                    {form.tunnel_status === "connected"
                      ? "Router connected successfully"
                      : form.tunnel_status === "disconnected"
                      ? "Connection lost — re-paste the commands"
                      : "Waiting for router connection..."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {form.tunnel_status === "pending"
                      ? "This updates automatically. No need to refresh."
                      : form.tunnel_status === "connected"
                      ? `Tunnel IP: ${form.tunnel_ip}`
                      : ""}
                  </p>
                </div>
              </div>

              {/* Optional router model field */}
              <div className="space-y-2">
                <Label>
                  Router Model <span className="text-muted-foreground ml-1">(optional)</span>
                </Label>
                <Input
                  value={form.router_type}
                  onChange={(e) => setForm({ ...form, router_type: e.target.value })}
                  placeholder="e.g. Mikrotik hAP ac³"
                />
              </div>

              {/* Bandwidth profile */}
              <div className="space-y-2">
                <Label>Bandwidth Profile</Label>
                <Select
                  value={form.speed_profile_name}
                  onValueChange={(val) => setForm({ ...form, speed_profile_name: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bandwidth" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5M/5M">5 Mbps / 5 Mbps</SelectItem>
                    <SelectItem value="10M/10M">10 Mbps / 10 Mbps</SelectItem>
                    <SelectItem value="20M/20M">20 Mbps / 20 Mbps</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Navigation buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 uppercase font-bold tracking-wide"
                >
                  <ArrowLeft size={16} className="mr-2" /> Back
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateAp.isPending}
                  className="flex-1 uppercase font-bold tracking-wide"
                >
                  <Save size={16} className="mr-2" />
                  {form.tunnel_status === "connected" ? "Save & Go Live" : "Save (connect router later)"}
                </Button>
              </div>

              {/* Delete button */}
              <div className="pt-1">
                <Button
                  variant="destructive"
                  onClick={() => setConfirmOpen(true)}
                  className="w-full"
                >
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

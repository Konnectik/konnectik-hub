import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, ChevronRight, ArrowLeft, ArrowRight, Copy, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAddAccessPoint, useUpdateAccessPoint } from "@/hooks/use-access-points";
import { useProviders } from "@/hooks/use-providers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const AddAccessPoint = () => {
  const navigate = useNavigate();
  const addAp = useAddAccessPoint();
  const updateAp = useUpdateAccessPoint();
  const { data: providers = [] } = useProviders();
  const [step, setStep] = useState(1);
  const [apId, setApId] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [command, setCommand] = useState("");
  const [tunnelIp, setTunnelIp] = useState("");
  const [tunnelStatus, setTunnelStatus] = useState<"pending" | "connected" | "disconnected">("pending");
  const provisionedRef = useRef(false);

  const [form, setForm] = useState({
    zone_label: "",
    latitude: "",
    longitude: "",
    propagation_radius_m: "",
    ssid: "",
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

  const validateStep1 = () => {
    if (!form.zone_label.trim() || !form.latitude || !form.longitude || !form.propagation_radius_m || !form.provider_id) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return false;
    }
    if (!isValidCoord(form.latitude, "lat")) {
      toast({ title: "Latitude must be between -90 and 90", variant: "destructive" });
      return false;
    }
    if (!isValidCoord(form.longitude, "lng")) {
      toast({ title: "Longitude must be between -180 and 180", variant: "destructive" });
      return false;
    }
    return true;
  };

  const provision = async (id: string) => {
    setProvisioning(true);
    setProvisionError(null);
    try {
      const { data, error } = await supabase.functions.invoke("provision-router", {
        body: { ap_id: id },
      });
      if (error) throw error;
      if (data?.command) setCommand(data.command);
      if (data?.tunnel_ip) setTunnelIp(data.tunnel_ip);
    } catch (e: any) {
      setProvisionError(e?.message || "Failed to generate router configuration");
    } finally {
      setProvisioning(false);
    }
  };

  const handleNext = async () => {
    if (!validateStep1()) return;
    if (apId) {
      setStep(2);
      return;
    }
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    try {
      const created = await addAp.mutateAsync({
        provider_id: form.provider_id,
        zone_label: form.zone_label.trim(),
        location: `${lat.toFixed(5)},${lng.toFixed(5)}`,
        latitude: lat,
        longitude: lng,
        propagation_radius_m: Number(form.propagation_radius_m),
        ssid: form.ssid.trim() || undefined,
        router_type: form.router_type.trim() || undefined,
        speed_profile_name: form.speed_profile_name.trim() || undefined,
      });
      setApId(created.id);
      setStep(2);
    } catch (error: any) {
      toast({ title: error.message || "Failed to create access point", variant: "destructive" });
    }
  };

  // Auto-provision on entering step 2
  useEffect(() => {
    if (step !== 2 || !apId || provisionedRef.current) return;
    provisionedRef.current = true;
    provision(apId);
  }, [step, apId]);

  // Realtime: watch tunnel_status
  useEffect(() => {
    if (step !== 2 || !apId) return;
    if (tunnelStatus === "connected") return;
    const channel = supabase
      .channel(`ap-tunnel-add-${apId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "access_points", filter: `id=eq.${apId}` },
        (payload) => {
          const row = payload.new as any;
          if (row.tunnel_status) setTunnelStatus(row.tunnel_status);
          if (row.tunnel_ip) setTunnelIp(row.tunnel_ip);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [step, apId, tunnelStatus]);

  const handleDone = async () => {
    if (!apId) return;
    try {
      await updateAp.mutateAsync({
        id: apId,
        updates: {
          router_type: form.router_type.trim() || null,
          speed_profile_name: form.speed_profile_name.trim() || null,
          router_ip: tunnelIp || null,
        },
      });
      toast({ title: "Access point added successfully!" });
      navigate("/dashboard/k-zones");
    } catch (error: any) {
      toast({ title: error.message || "Failed to save access point", variant: "destructive" });
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
          {/* Step indicator */}
          <div className="px-8 pt-6">
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
                onClick={() => { if (apId) setStep(2); }}
                className={`text-sm font-semibold pb-3 px-1 transition-colors ${step === 2 ? "text-primary border-b-[3px] border-primary" : "text-muted-foreground hover:text-foreground"} ${!apId ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                2. Router Information
              </button>
            </div>
            <div className="border-b border-border -mx-8" />
          </div>

          <div className="px-8 py-8">
            <div className="max-w-md mx-auto space-y-5">
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="zone_label" className="text-sm font-medium">Zone Label *</Label>
                    <Input id="zone_label" placeholder="e.g. Campus WiFi North" value={form.zone_label} onChange={(e) => setForm({ ...form, zone_label: e.target.value })} maxLength={100} />
                  </div>

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
                        <iframe title="Location Preview" width="100%" height="200" style={{ border: 0 }} loading="lazy"
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(form.longitude) - 0.005},${parseFloat(form.latitude) - 0.003},${parseFloat(form.longitude) + 0.005},${parseFloat(form.latitude) + 0.003}&layer=mapnik&marker=${form.latitude},${form.longitude}`}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Propagation Radius (meters) *</Label>
                    <Input type="number" min={0} placeholder="e.g. 100" value={form.propagation_radius_m} onChange={(e) => setForm({ ...form, propagation_radius_m: e.target.value })} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">SSID</Label>
                    <Input placeholder="e.g. Konnectik-Free" value={form.ssid} onChange={(e) => setForm({ ...form, ssid: e.target.value })} />
                  </div>

                  <div className="pt-4">
                    <Button type="button" onClick={handleNext} disabled={addAp.isPending} className="w-full uppercase font-bold tracking-wide">
                      {addAp.isPending ? "Creating..." : <>Next <ArrowRight size={16} className="ml-2" /></>}
                    </Button>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Router Type</Label>
                    <Input placeholder="e.g. Mikrotik hAP ac³" value={form.router_type} onChange={(e) => setForm({ ...form, router_type: e.target.value })} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Speed Profile</Label>
                    <Select value={form.speed_profile_name} onValueChange={(val) => setForm({ ...form, speed_profile_name: val })}>
                      <SelectTrigger><SelectValue placeholder="Select bandwidth" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5M/5M">5 Mbps / 5 Mbps</SelectItem>
                        <SelectItem value="10M/10M">10 Mbps / 10 Mbps</SelectItem>
                        <SelectItem value="20M/20M">20 Mbps / 20 Mbps</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Generated command block */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Paste this into your Mikrotik terminal</Label>
                    <p className="text-xs text-muted-foreground">
                      Open Winbox → click your router → New Terminal, then paste the commands below.
                    </p>
                    <div className="relative">
                      <div className="bg-slate-900 text-slate-100 rounded-lg p-4 pr-12 font-mono text-xs whitespace-pre-wrap border border-border leading-relaxed min-h-[200px]">
                        {provisioning && !command
                          ? "Generating router configuration..."
                          : provisionError
                          ? `⚠ ${provisionError}`
                          : command || "Waiting..."}
                      </div>
                      {command && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(command);
                            toast({ title: "Commands copied to clipboard" });
                          }}
                          className="absolute top-2 right-2 p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 transition-colors"
                          aria-label="Copy commands"
                        >
                          <Copy size={14} />
                        </button>
                      )}
                    </div>
                    {provisionError && apId && (
                      <Button type="button" variant="outline" size="sm" onClick={() => provision(apId)}>
                        Retry
                      </Button>
                    )}
                  </div>

                  {/* Tunnel status indicator */}
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                      tunnelStatus === "connected"
                        ? "bg-green-500"
                        : tunnelStatus === "disconnected"
                        ? "bg-red-500"
                        : "bg-amber-400 animate-pulse"
                    }`} />
                    <div>
                      <p className="text-sm font-medium">
                        {tunnelStatus === "connected"
                          ? "Router connected successfully"
                          : tunnelStatus === "disconnected"
                          ? "Connection lost — re-paste the commands"
                          : "Waiting for router connection..."}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tunnelStatus === "connected" && tunnelIp
                          ? `Tunnel IP: ${tunnelIp}`
                          : "This updates automatically. No need to refresh."}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 uppercase font-bold tracking-wide">
                      <ArrowLeft size={16} className="mr-2" /> Back
                    </Button>
                    <Button type="button" onClick={handleDone} className="flex-1 uppercase font-bold tracking-wide" disabled={updateAp.isPending}>
                      <Save size={16} className="mr-2" />
                      {updateAp.isPending ? "Saving..." : "Done"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddAccessPoint;

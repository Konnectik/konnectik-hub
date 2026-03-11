import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronRight, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAddRouter } from "@/hooks/use-routers";
import { useWifiZones } from "@/hooks/use-wifi-zones";

const AddRouter = () => {
  const navigate = useNavigate();
  const addRouter = useAddRouter();
  const { data: zones = [] } = useWifiZones();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [zoneId, setZoneId] = useState("");

  const routerCode = `/interface ovpn-client
add cipher="aes256"
connect-to="server.konnectik-cm.site"
name="mp_ovpn_client"
user="konnectik"
password="konnectik@2026"
port="1200"
comment="mp_config_client"`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(routerCode);
    toast({ title: "Code copied to clipboard!" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !password.trim() || !zoneId) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    try {
      await addRouter.mutateAsync({
        name: name.trim(),
        username: username.trim(),
        password: password.trim(),
        zone_id: zoneId,
      });
      toast({ title: "Router added successfully!" });
      navigate("/dashboard/k-zones");
    } catch (error: any) {
      toast({ title: error.message || "Failed to add router", variant: "destructive" });
    }
  };

  return (
    <div>
      <div className="bg-muted/40 px-6 py-3 border-b border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => navigate("/dashboard/k-zones")} className="hover:text-foreground transition-colors">Zones</button>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">Add a new router</span>
        </div>
      </div>

      <div className="p-6">
        <div className="bg-card rounded-xl border shadow-sm max-w-3xl mx-auto">
          <div className="px-8 pt-6">
            <div className="inline-flex">
              <span className="text-sm font-semibold text-primary border-b-[3px] border-primary pb-3 px-1">Router Information</span>
            </div>
            <div className="border-b border-border -mx-8" />
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-8">
            <h3 className="text-lg font-bold mb-6">Basic information</h3>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Router Display Name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" placeholder="Router Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="Router Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zone">Zone</Label>
                  <select
                    id="zone"
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                    className="border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex h-10 w-full items-center justify-content rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select a zone</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>
                <div className="pt-4 flex justify-center">
                  <Button type="submit" className="uppercase font-bold tracking-wide" disabled={addRouter.isPending}>
                    {addRouter.isPending ? "Adding..." : "Add Router"}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Please paste this code into the router terminal:</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={copyToClipboard}>
                    <Copy size={16} />
                  </Button>
                </div>
                <pre className="bg-muted p-4 rounded-md text-sm font-mono overflow-x-auto border">
                  {routerCode}
                </pre>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddRouter;

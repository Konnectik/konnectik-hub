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
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState("");
  const [bandwidth, setBandwidth] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim() || !radius || !bandwidth) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    try {
      await addZone.mutateAsync({
        name: name.trim(),
        location: location.trim(),
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
                <Label htmlFor="location" className="text-sm font-medium">Location</Label>
                <div className="relative">
                  <Input id="location" placeholder="X.XXXXX N, X.XXXXX E" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={50} className="pr-10" />
                  <MapPin size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600" />
                </div>
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

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useWifiZones, useUpdateWifiZone, useDeleteWifiZone } from "@/hooks/use-wifi-zones";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";

const EditZone = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: zones = [], isLoading } = useWifiZones();
  const updateZone = useUpdateWifiZone();
  const deleteZone = useDeleteWifiZone();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const zone = zones.find((z) => z.id === id);

  const [form, setForm] = useState({ name: "", latitude: "", longitude: "", radius: 0, bandwidth: 0 });

  const formatCoord = (value: string) => {
    const cleaned = value.replace(/[^0-9.\-]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) return parts[0] + "." + parts.slice(1).join("");
    if (parts[1] && parts[1].length > 5) return parts[0] + "." + parts[1].slice(0, 5);
    return cleaned;
  };

  useEffect(() => {
    if (zone) {
      const [lat, lng] = (zone.location || ",").split(",");
      setForm({ name: zone.name, latitude: lat?.trim() || "", longitude: lng?.trim() || "", radius: zone.radius, bandwidth: zone.bandwidth });
    }
  }, [zone]);

  const handleSave = async () => {
    if (!id) return;
    try {
      await updateZone.mutateAsync({ id, updates: form });
      toast({ title: "Zone updated successfully" });
      navigate("/dashboard/k-zones");
    } catch {
      toast({ title: "Failed to update zone", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteZone.mutateAsync(id);
      toast({ title: "Zone deleted successfully" });
      navigate("/dashboard/k-zones");
    } catch {
      toast({ title: "Failed to delete zone", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (!zone) return <div className="p-6">Zone not found.</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Button variant="ghost" onClick={() => navigate("/dashboard/k-zones")} className="mb-4">
        <ArrowLeft size={16} className="mr-2" /> Back to Zones
      </Button>

      <div className="bg-card rounded-xl border p-6 shadow-sm space-y-6">
        <h2 className="text-xl font-bold">Edit Zone</h2>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Radius (m)</Label>
              <Input type="number" value={form.radius} onChange={(e) => setForm({ ...form, radius: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Bandwidth Limit (Mbps)</Label>
              <Input type="number" value={form.bandwidth} onChange={(e) => setForm({ ...form, bandwidth: Number(e.target.value) })} />
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            <Trash2 size={16} className="mr-2" /> Delete Zone
          </Button>
          <Button onClick={handleSave} disabled={updateZone.isPending}>
            <Save size={16} className="mr-2" /> Save Changes
          </Button>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Zone</DialogTitle>
            <DialogDescription>This will permanently delete "{zone.name}" and cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteZone.isPending}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditZone;

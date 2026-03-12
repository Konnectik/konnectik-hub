import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useRouters, useUpdateRouter, useDeleteRouter } from "@/hooks/use-routers";
import { useWifiZones } from "@/hooks/use-wifi-zones";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";

const EditRouter = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: routers = [], isLoading } = useRouters();
  const { data: zones = [] } = useWifiZones();
  const updateRouter = useUpdateRouter();
  const deleteRouter = useDeleteRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const router = routers.find((r) => r.id === id);

  const [form, setForm] = useState({ name: "", username: "", password: "", zone_id: "" });

  useEffect(() => {
    if (router) {
      setForm({ name: router.name, username: router.username, password: router.password, zone_id: router.zone_id });
    }
  }, [router]);

  const handleSave = async () => {
    if (!id) return;
    try {
      await updateRouter.mutateAsync({ id, updates: form });
      toast({ title: "Router updated successfully" });
      navigate("/dashboard/k-zones");
    } catch {
      toast({ title: "Failed to update router", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteRouter.mutateAsync(id);
      toast({ title: "Router deleted successfully" });
      navigate("/dashboard/k-zones");
    } catch {
      toast({ title: "Failed to delete router", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (!router) return <div className="p-6">Router not found.</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Button variant="ghost" onClick={() => navigate("/dashboard/k-zones")} className="mb-4">
        <ArrowLeft size={16} className="mr-2" /> Back to Routers
      </Button>

      <div className="bg-card rounded-xl border p-6 shadow-sm space-y-6">
        <h2 className="text-xl font-bold">Edit Router</h2>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Attached Zone</Label>
            <Select value={form.zone_id} onValueChange={(val) => setForm({ ...form, zone_id: val })}>
              <SelectTrigger><SelectValue placeholder="Select a zone" /></SelectTrigger>
              <SelectContent>
                {zones.map((z) => (
                  <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            <Trash2 size={16} className="mr-2" /> Delete Router
          </Button>
          <Button onClick={handleSave} disabled={updateRouter.isPending}>
            <Save size={16} className="mr-2" /> Save Changes
          </Button>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Router</DialogTitle>
            <DialogDescription>This will permanently delete "{router.name}" and cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteRouter.isPending}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditRouter;

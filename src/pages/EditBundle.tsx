import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useBundles, useUpdateBundle, useDeleteBundle } from "@/hooks/use-bundles";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";

const EditBundle = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: bundles = [], isLoading } = useBundles();
  const updateBundle = useUpdateBundle();
  const deleteBundle = useDeleteBundle();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const bundle = bundles.find((b) => b.id === id);

  const [form, setForm] = useState<{ name: string; duration: number; duration_unit: 'Hours' | 'Days' | 'Weeks'; price: number; currency: string }>({ name: "", duration: 0, duration_unit: "Hours", price: 0, currency: "CDF" });

  useEffect(() => {
    if (bundle) {
      setForm({ name: bundle.name, duration: bundle.duration, duration_unit: bundle.duration_unit, price: bundle.price, currency: bundle.currency });
    }
  }, [bundle]);

  const handleSave = async () => {
    if (!id) return;
    try {
      await updateBundle.mutateAsync({ id, updates: form });
      toast({ title: "Bundle updated successfully" });
      navigate("/dashboard/k-plans");
    } catch {
      toast({ title: "Failed to update bundle", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteBundle.mutateAsync(id);
      toast({ title: "Bundle deleted successfully" });
      navigate("/dashboard/k-plans");
    } catch {
      toast({ title: "Failed to delete bundle", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (!bundle) return <div className="p-6">Bundle not found.</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Button variant="ghost" onClick={() => navigate("/dashboard/k-plans")} className="mb-4">
        <ArrowLeft size={16} className="mr-2" /> Back to Bundles
      </Button>

      <div className="bg-card rounded-xl border p-6 shadow-sm space-y-6">
        <h2 className="text-xl font-bold">Edit Bundle</h2>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duration</Label>
              <Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Duration Unit</Label>
              <Select value={form.duration_unit} onValueChange={(val) => setForm({ ...form, duration_unit: val as 'Hours' | 'Days' | 'Weeks' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hours">Hours</SelectItem>
                  <SelectItem value="Days">Days</SelectItem>
                  <SelectItem value="Weeks">Weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Price</Label>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(val) => setForm({ ...form, currency: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CDF">CDF</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            <Trash2 size={16} className="mr-2" /> Delete Bundle
          </Button>
          <Button onClick={handleSave} disabled={updateBundle.isPending}>
            <Save size={16} className="mr-2" /> Save Changes
          </Button>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Bundle</DialogTitle>
            <DialogDescription>This will permanently delete "{bundle.name}" and cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteBundle.isPending}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditBundle;

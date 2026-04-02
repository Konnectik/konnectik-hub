import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProviders, useUnlinkedOwners, useCreateProvider, useUpdateProvider, useDeleteProvider, ProviderRow } from "@/hooks/use-providers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const kycBadgeVariant = (status: string) => {
  if (status === "approved") return "default";
  if (status === "rejected") return "destructive";
  return "secondary";
};

const ProviderManagement = () => {
  const { data: providers, isLoading } = useProviders();
  const { data: unlinkedOwners } = useUnlinkedOwners();
  const createProvider = useCreateProvider();
  const updateProvider = useUpdateProvider();
  const deleteProvider = useDeleteProvider();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [createOpen, setCreateOpen] = useState(false);
  const [editProvider, setEditProvider] = useState<ProviderRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProviderRow | null>(null);

  // Create form state
  const [selectedUserId, setSelectedUserId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");

  // Edit form state
  const [editBusinessName, setEditBusinessName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editKyc, setEditKyc] = useState("");

  const handleCreate = async () => {
    if (!selectedUserId || !businessName.trim()) return;
    try {
      await createProvider.mutateAsync({ userId: selectedUserId, businessName: businessName.trim(), phone: phone.trim() || undefined });
      toast({ title: "Provider created", description: "Provider profile and wallet created successfully." });
      setCreateOpen(false);
      setSelectedUserId("");
      setBusinessName("");
      setPhone("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleEdit = async () => {
    if (!editProvider) return;
    try {
      await updateProvider.mutateAsync({
        id: editProvider.id,
        updates: { business_name: editBusinessName.trim(), phone: editPhone.trim() || null, kyc_status: editKyc },
      });
      toast({ title: "Provider updated" });
      setEditProvider(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProvider.mutateAsync(deleteTarget.id);
      toast({ title: "Provider deleted" });
      setDeleteTarget(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const openEdit = (p: ProviderRow) => {
    setEditProvider(p);
    setEditBusinessName(p.business_name);
    setEditPhone(p.phone || "");
    setEditKyc(p.kyc_status);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Provider Management</h1>
          <p className="text-muted-foreground">Create and manage K-Owner provider profiles</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} disabled={!unlinkedOwners?.length}>
          <Plus className="mr-2 h-4 w-4" />
          Create Provider
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Providers ({providers?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground py-8 text-center">Loading providers…</p>
          ) : !providers?.length ? (
            <p className="text-muted-foreground py-8 text-center">No providers found. Create one to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business Name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>KYC</TableHead>
                  <TableHead className="text-right">Wallet (XAF)</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.business_name}</TableCell>
                    <TableCell>
                      <div>{p.profile_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{p.profile_email}</div>
                    </TableCell>
                    <TableCell>{p.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={kycBadgeVariant(p.kyc_status)}>{p.kyc_status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{p.wallet_balance.toLocaleString()}</TableCell>
                    <TableCell>{format(new Date(p.created_at), "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(p)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Provider Profile</DialogTitle>
            <DialogDescription>Link an existing K-Owner account to a new provider profile.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Owner Account</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an unlinked owner" />
                </SelectTrigger>
                <SelectContent>
                  {unlinkedOwners?.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email} — {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Business Name</Label>
              <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. KonnectCafé" />
            </div>
            <div className="space-y-2">
              <Label>Phone (optional)</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+237..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!selectedUserId || !businessName.trim() || createProvider.isPending}>
              {createProvider.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editProvider} onOpenChange={(open) => !open && setEditProvider(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Provider</DialogTitle>
            <DialogDescription>Update provider details and KYC status.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Business Name</Label>
              <Input value={editBusinessName} onChange={(e) => setEditBusinessName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>KYC Status</Label>
              <Select value={editKyc} onValueChange={setEditKyc}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProvider(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={updateProvider.isPending}>
              {updateProvider.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Provider</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.business_name}</strong> and its wallet. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProviderManagement;

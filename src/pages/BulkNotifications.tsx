import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Bell, Send, Users } from 'lucide-react';
import { useAccessPoints } from '@/hooks/use-access-points';
import { useNotificationRecipients, useSendBulkNotifications, type FilterMode, type NotificationFilter } from '@/hooks/use-bulk-notifications';
import type { NotificationCategory } from '@/types/database';

const categories: { value: NotificationCategory; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'promo', label: 'Promo' },
  { value: 'session', label: 'Session' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'bundle', label: 'Bundle' },
];

const BulkNotifications = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<NotificationCategory>('system');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [minBalance, setMinBalance] = useState('');
  const [maxBalance, setMaxBalance] = useState('');
  const [previewRequested, setPreviewRequested] = useState(false);

  const { data: zones } = useAccessPoints();
  const filter: NotificationFilter = {
    mode: filterMode,
    zoneIds: selectedZones,
    minBalance: minBalance ? Number(minBalance) : undefined,
    maxBalance: maxBalance ? Number(maxBalance) : undefined,
  };

  const { data: recipientIds, isLoading: loadingRecipients, refetch } = useNotificationRecipients(filter, previewRequested);
  const { mutateAsync: sendNotifications, sending } = useSendBulkNotifications();

  const handlePreview = () => {
    setPreviewRequested(true);
    refetch();
  };

  const handleSend = async () => {
    if (!recipientIds?.length) return;
    await sendNotifications({ userIds: recipientIds, title: title.trim(), body: body.trim(), category });
    setTitle('');
    setBody('');
    setPreviewRequested(false);
  };

  const toggleZone = (zoneId: string) => {
    setSelectedZones((prev) =>
      prev.includes(zoneId) ? prev.filter((z) => z !== zoneId) : [...prev, zoneId]
    );
    setPreviewRequested(false);
  };

  const canSend = title.trim() && body.trim() && recipientIds && recipientIds.length > 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Bulk Notifications</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Compose</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notif-title">Title</Label>
              <Input id="notif-title" placeholder="Notification title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notif-body">Body</Label>
              <Textarea id="notif-body" placeholder="Notification body..." value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={5} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as NotificationCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Filter & Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Target Audience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <RadioGroup value={filterMode} onValueChange={(v) => { setFilterMode(v as FilterMode); setPreviewRequested(false); }}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="filter-all" />
                <Label htmlFor="filter-all">All Users</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="zone" id="filter-zone" />
                <Label htmlFor="filter-zone">By Zone</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="balance" id="filter-balance" />
                <Label htmlFor="filter-balance">By Balance Range</Label>
              </div>
            </RadioGroup>

            {filterMode === 'zone' && (
              <div className="space-y-2 pl-6">
                <Label>Select Zones</Label>
                <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-3">
                  {zones?.map((z) => (
                    <div key={z.id} className="flex items-center space-x-2">
                      <Checkbox id={`zone-${z.id}`} checked={selectedZones.includes(z.id)} onCheckedChange={() => toggleZone(z.id)} />
                      <Label htmlFor={`zone-${z.id}`} className="font-normal">{z.name}</Label>
                    </div>
                  ))}
                  {!zones?.length && <p className="text-sm text-muted-foreground">No zones found.</p>}
                </div>
              </div>
            )}

            {filterMode === 'balance' && (
              <div className="grid grid-cols-2 gap-3 pl-6">
                <div className="space-y-1">
                  <Label>Min (XAF)</Label>
                  <Input type="number" min={0} placeholder="0" value={minBalance} onChange={(e) => { setMinBalance(e.target.value); setPreviewRequested(false); }} />
                </div>
                <div className="space-y-1">
                  <Label>Max (XAF)</Label>
                  <Input type="number" min={0} placeholder="100000" value={maxBalance} onChange={(e) => { setMaxBalance(e.target.value); setPreviewRequested(false); }} />
                </div>
              </div>
            )}

            <Button variant="outline" onClick={handlePreview} disabled={loadingRecipients}>
              <Users className="mr-2 h-4 w-4" />
              {loadingRecipients ? 'Counting...' : 'Preview Recipients'}
            </Button>

            {previewRequested && recipientIds != null && (
              <div className="rounded-md bg-muted p-4 text-center">
                <p className="text-3xl font-bold">{recipientIds.length}</p>
                <p className="text-sm text-muted-foreground">recipient(s) matched</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Send */}
      <div className="flex justify-end">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={!canSend || sending} size="lg">
              <Send className="mr-2 h-4 w-4" />
              {sending ? 'Sending...' : 'Send Notifications'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Send</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to send <strong>{recipientIds?.length ?? 0}</strong> notification(s) with category <strong>{category}</strong>. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSend}>Send</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default BulkNotifications;

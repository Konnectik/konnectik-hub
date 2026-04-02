import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Wifi, WifiOff, AlertTriangle, Clock } from 'lucide-react';
import { useAccessPointsWithHealth, useApHealthHistory } from '@/hooks/use-ap-health';
import type { ApHealthStatus, ApStatus } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';

const healthBadge = (status?: ApHealthStatus) => {
  switch (status) {
    case 'ok':
      return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">Online</Badge>;
    case 'degraded':
      return <Badge className="bg-amber-500/15 text-amber-700 border-amber-200">Degraded</Badge>;
    case 'down':
      return <Badge variant="destructive">Down</Badge>;
    default:
      return <Badge variant="outline">No data</Badge>;
  }
};

const statusIcon = (status?: ApHealthStatus) => {
  switch (status) {
    case 'ok':
      return <Wifi className="h-4 w-4 text-emerald-600" />;
    case 'degraded':
      return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    case 'down':
      return <WifiOff className="h-4 w-4 text-destructive" />;
    default:
      return <Wifi className="h-4 w-4 text-muted-foreground" />;
  }
};

const ApHealth = () => {
  const { data: aps, isLoading } = useAccessPointsWithHealth();
  const [selectedApId, setSelectedApId] = useState<string | null>(null);
  const { data: history, isLoading: loadingHistory } = useApHealthHistory(selectedApId);

  const selectedAp = aps?.find((ap) => ap.id === selectedApId);

  const counts = {
    total: aps?.length ?? 0,
    online: aps?.filter((ap) => ap.latest_health?.status === 'ok').length ?? 0,
    degraded: aps?.filter((ap) => ap.latest_health?.status === 'degraded').length ?? 0,
    down: aps?.filter((ap) => ap.latest_health?.status === 'down').length ?? 0,
    noData: aps?.filter((ap) => !ap.latest_health).length ?? 0,
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Activity className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">AP Health Monitor</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{counts.total}</p>
            <p className="text-sm text-muted-foreground">Total APs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-emerald-600">{counts.online}</p>
            <p className="text-sm text-muted-foreground">Online</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-amber-600">{counts.degraded}</p>
            <p className="text-sm text-muted-foreground">Degraded</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-destructive">{counts.down}</p>
            <p className="text-sm text-muted-foreground">Down</p>
          </CardContent>
        </Card>
      </div>

      {/* AP Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Access Points</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !aps?.length ? (
            <p className="text-center text-muted-foreground py-8">No access points found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Zone Label</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>SSID</TableHead>
                  <TableHead>Latency</TableHead>
                  <TableHead>Last Check</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aps.map((ap) => (
                  <TableRow key={ap.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {statusIcon(ap.latest_health?.status)}
                        {healthBadge(ap.latest_health?.status)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{ap.zone_label}</TableCell>
                    <TableCell>{ap.location}</TableCell>
                    <TableCell>{ap.ssid ?? '—'}</TableCell>
                    <TableCell>
                      {ap.latest_health?.latency_ms != null
                        ? `${ap.latest_health.latency_ms}ms`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {ap.latest_health?.checked_at ? (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(ap.latest_health.checked_at), { addSuffix: true })}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setSelectedApId(ap.id)}>
                        History
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Health History Dialog */}
      <Dialog open={!!selectedApId} onOpenChange={(open) => !open && setSelectedApId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Health History — {selectedAp?.zone_label ?? 'AP'}</DialogTitle>
          </DialogHeader>
          {loadingHistory ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !history?.length ? (
            <p className="text-center text-muted-foreground py-6">No health checks recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Latency</TableHead>
                  <TableHead>Checked At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{healthBadge(log.status)}</TableCell>
                    <TableCell>{log.latency_ms != null ? `${log.latency_ms}ms` : '—'}</TableCell>
                    <TableCell>
                      {new Date(log.checked_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApHealth;

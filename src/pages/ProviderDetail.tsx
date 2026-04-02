import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Building2, MapPin, Wallet, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
import PageTabs from '@/components/PageTabs';
import { useProviderDetail, useProviderZones, useProviderEarningsBreakdown, useProviderPayouts } from '@/hooks/use-provider-detail';
import { format } from 'date-fns';

const tabs = ['Overview', 'Zone Assignments', 'Earnings Breakdown', 'Payout History'];

const kycBadgeVariant = (status: string) => {
  if (status === 'approved') return 'default' as const;
  if (status === 'rejected') return 'destructive' as const;
  return 'secondary' as const;
};

const statusBadgeVariant = (status: string) => {
  if (status === 'online') return 'default' as const;
  if (status === 'maintenance') return 'secondary' as const;
  return 'destructive' as const;
};

const ProviderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');

  const { data: provider, isLoading } = useProviderDetail(id);
  const { data: zones = [], isLoading: zonesLoading } = useProviderZones(id);
  const { data: earningsData, isLoading: earningsLoading } = useProviderEarningsBreakdown(id);
  const { data: payouts = [], isLoading: payoutsLoading } = useProviderPayouts(id);

  const earnings = earningsData?.earnings ?? [];
  const totals = earningsData?.totals ?? { gross: 0, fees: 0, net: 0, segments: 0 };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">Provider Not Found</h2>
            <p className="text-muted-foreground">This provider does not exist or has been removed.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/dashboard/providers')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Providers
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/providers')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{provider.business_name}</h1>
              <p className="text-sm text-muted-foreground">
                {provider.profile_name || 'No name'} • {provider.profile_email || 'No email'}
              </p>
            </div>
          </div>
          <Badge variant={kycBadgeVariant(provider.kyc_status)} className="text-sm px-3 py-1">
            KYC: {provider.kyc_status}
          </Badge>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Wallet Balance</CardTitle>
              <Wallet size={18} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{provider.wallet_balance.toLocaleString()} XAF</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Gross</CardTitle>
              <TrendingUp size={18} className="text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">+{totals.gross.toLocaleString()} XAF</div>
              <p className="text-xs text-muted-foreground mt-1">{totals.segments} sessions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Platform Fees</CardTitle>
              <DollarSign size={18} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-{totals.fees.toLocaleString()} XAF</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Earnings</CardTitle>
              <BarChart3 size={18} className="text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.net.toLocaleString()} XAF</div>
            </CardContent>
          </Card>
        </div>

        {/* Overview Tab */}
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Provider Details</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between"><span className="text-muted-foreground">Business Name</span><span className="font-medium">{provider.business_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Owner</span><span className="font-medium">{provider.profile_name || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{provider.profile_email || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="font-medium">{provider.phone || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">KYC Status</span><Badge variant={kycBadgeVariant(provider.kyc_status)}>{provider.kyc_status}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span className="font-medium">{format(new Date(provider.created_at), 'dd MMM yyyy')}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MapPin size={18} /> Zone Summary</CardTitle></CardHeader>
              <CardContent>
                {zonesLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : zones.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No zones assigned to this provider.</p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Zones</span><span className="font-bold">{zones.length}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Online</span><span className="font-bold text-emerald-600">{zones.filter(z => z.status === 'online').length}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Offline</span><span className="font-bold text-destructive">{zones.filter(z => z.status === 'offline').length}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Maintenance</span><span className="font-bold">{zones.filter(z => z.status === 'maintenance').length}</span></div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Zone Assignments Tab */}
        {activeTab === 'Zone Assignments' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><MapPin size={18} /> Access Points ({zones.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {zonesLoading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : zones.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No access points assigned to this provider.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zone Label</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>SSID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zones.map((z) => (
                      <TableRow key={z.id}>
                        <TableCell className="font-medium">{z.zone_label}</TableCell>
                        <TableCell>{z.location}</TableCell>
                        <TableCell>{z.ssid || '—'}</TableCell>
                        <TableCell><Badge variant={statusBadgeVariant(z.status)}>{z.status}</Badge></TableCell>
                        <TableCell>{z.avg_rating > 0 ? z.avg_rating.toFixed(1) : '—'}</TableCell>
                        <TableCell>{format(new Date(z.created_at), 'dd MMM yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Earnings Breakdown Tab */}
        {activeTab === 'Earnings Breakdown' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Earnings Breakdown ({earnings.length} records)</CardTitle>
            </CardHeader>
            <CardContent>
              {earningsLoading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : earnings.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No earnings recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Minutes</TableHead>
                        <TableHead>Plan Price</TableHead>
                        <TableHead>Gross</TableHead>
                        <TableHead>Fee (20%)</TableHead>
                        <TableHead>Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {earnings.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell>{format(new Date(e.allocated_at), 'dd MMM yyyy HH:mm')}</TableCell>
                          <TableCell>{e.time_used_minutes} min</TableCell>
                          <TableCell>{e.plan_price_xaf.toLocaleString()} XAF</TableCell>
                          <TableCell className="font-medium">{e.gross_xaf.toLocaleString()} XAF</TableCell>
                          <TableCell className="text-muted-foreground">-{e.platform_fee_xaf.toLocaleString()}</TableCell>
                          <TableCell className="font-bold text-emerald-600">+{e.net_xaf.toLocaleString()} XAF</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payout History Tab */}
        {activeTab === 'Payout History' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payout History ({payouts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {payoutsLoading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : payouts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No payouts recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Net</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell>{format(new Date(p.created_at), 'dd MMM yyyy HH:mm')}</TableCell>
                        <TableCell className="font-medium">{p.amount_xaf.toLocaleString()} XAF</TableCell>
                        <TableCell className="text-muted-foreground">{p.fee_xaf.toLocaleString()}</TableCell>
                        <TableCell>{p.net_xaf.toLocaleString()} XAF</TableCell>
                        <TableCell className="font-mono text-xs">{p.reference}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === 'confirmed' ? 'default' : p.status === 'failed' ? 'destructive' : 'secondary'}>
                            {p.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProviderDetailPage;

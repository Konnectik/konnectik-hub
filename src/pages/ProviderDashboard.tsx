import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  ArrowUpRight, Wallet, TrendingUp, DollarSign, BarChart3, AlertCircle, Building2,
} from 'lucide-react';
import PageTabs from '@/components/PageTabs';
import { useProviderProfile, useProviderEarningsSummary, useProviderEarningsHistory } from '@/hooks/use-provider-earnings';
import { usePayoutRequests, type PayoutStatus } from '@/hooks/use-payout-requests';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

const tabs = ['Earnings Overview', 'Earnings History', 'Payout Requests'];

const MIN_PAYOUT = 5000;

const ProviderDashboard = () => {
  const [activeTab, setActiveTab] = useState('Earnings Overview');
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('');
  const [payoutPhone, setPayoutPhone] = useState('');
  const [requesting, setRequesting] = useState(false);

  const { profile } = useAuth();
  const { data: provider, isLoading: providerLoading } = useProviderProfile();
  const { data: summary, isLoading: summaryLoading } = useProviderEarningsSummary(provider?.id);
  const { data: history = [], isLoading: historyLoading } = useProviderEarningsHistory(provider?.id);
  const { data: payouts = [], isLoading: payoutsLoading } = usePayoutRequests(provider?.id);

  const payoutStatusStyles: Record<PayoutStatus, string> = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    processing: 'bg-blue-50 text-blue-700 border-blue-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    cancelled: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  const isLoading = providerLoading || summaryLoading;
  const balance = summary?.current_balance_xaf ?? 0;

  const handleRequestPayout = async () => {
    const amount = Number(payoutAmount);
    if (amount < MIN_PAYOUT) {
      toast({ title: 'Minimum not met', description: `Minimum payout is ${MIN_PAYOUT.toLocaleString()} XAF.`, variant: 'destructive' });
      return;
    }
    if (amount > balance) {
      toast({ title: 'Insufficient balance', description: `Your available balance is ${balance.toLocaleString()} XAF.`, variant: 'destructive' });
      return;
    }
    if (!payoutMethod) {
      toast({ title: 'Select a method', description: 'Please choose a payout method.', variant: 'destructive' });
      return;
    }
    if ((payoutMethod === 'momo' || payoutMethod === 'om') && !payoutPhone) {
      toast({ title: 'Phone required', description: 'Enter the recipient phone number for mobile money payouts.', variant: 'destructive' });
      return;
    }

    setRequesting(true);
    try {
      const { error } = await supabase.functions.invoke('process-payout', {
        body: { amount_xaf: amount, method: payoutMethod, phone_number: payoutPhone || undefined },
      });
      if (error) throw error;
      toast({ title: 'Payout requested', description: `${amount.toLocaleString()} XAF via ${payoutMethod}. Processing will begin shortly.` });
      setPayoutOpen(false);
      setPayoutAmount('');
      setPayoutMethod('');
      setPayoutPhone('');
    } catch (e: any) {
      toast({ title: 'Payout failed', description: e.message, variant: 'destructive' });
    } finally {
      setRequesting(false);
    }
  };

  if (!providerLoading && !provider) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">No Provider Profile</h2>
            <p className="text-muted-foreground">Your account is not linked to a provider. Please contact an administrator.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  return (
    <div>
      <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{summary?.business_name ?? 'Provider'} Dashboard</h2>
            <p className="text-sm text-muted-foreground">View your earnings and request payouts</p>
          </div>
          <Badge variant="outline" className="text-tab-active border-tab-active bg-tab-active-bg font-semibold px-3 py-1">
            Provider
          </Badge>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Available Balance</CardTitle>
              <Wallet size={18} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{balance.toLocaleString()} XAF</div>
            </CardContent>
          </Card>
          <Card className="animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Gross Earnings</CardTitle>
              <TrendingUp size={18} className="text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">+{(summary?.total_gross_xaf ?? 0).toLocaleString()} XAF</div>
              <p className="text-xs text-muted-foreground mt-1">{summary?.total_segments ?? 0} sessions served</p>
            </CardContent>
          </Card>
          <Card className="animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Platform Fees</CardTitle>
              <DollarSign size={18} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-{(summary?.total_fees_xaf ?? 0).toLocaleString()} XAF</div>
            </CardContent>
          </Card>
          <Card className="animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Earnings</CardTitle>
              <BarChart3 size={18} className="text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(summary?.total_net_xaf ?? 0).toLocaleString()} XAF</div>
            </CardContent>
          </Card>
        </div>

        {activeTab === 'Earnings Overview' && (
          <>
            {/* Payout CTA */}
            <Card className="animate-fade-in">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Request Payout</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Minimum payout: {MIN_PAYOUT.toLocaleString()} XAF</p>
                </div>
                <Button onClick={() => setPayoutOpen(true)} disabled={balance < MIN_PAYOUT}>
                  <ArrowUpRight size={16} className="mr-2" />Request Payout
                </Button>
              </CardHeader>
              {balance < MIN_PAYOUT && (
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <AlertCircle size={14} />
                    Insufficient balance for payout (min {MIN_PAYOUT.toLocaleString()} XAF).
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Recent Earnings */}
            <Card className="animate-fade-in">
              <CardHeader><CardTitle className="text-lg">Recent Earnings</CardTitle></CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No earnings recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {history.slice(0, 8).map((e) => (
                      <div key={e.id} className="flex items-center justify-between py-3 px-4 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div>
                          <div className="text-sm font-medium">Session segment</div>
                          <div className="text-xs text-muted-foreground">
                            {e.time_used_minutes} min • {formatDistanceToNow(new Date(e.allocated_at), { addSuffix: true })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-emerald-600">+{e.net_xaf.toLocaleString()} XAF</div>
                          <div className="text-xs text-muted-foreground">Gross: {e.gross_xaf.toLocaleString()} • Fee: {e.platform_fee_xaf.toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'Earnings History' && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">Full Earnings History</CardTitle>
              <p className="text-sm text-muted-foreground">{history.length} earning{history.length !== 1 ? 's' : ''} recorded</p>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : history.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No earnings yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Minutes</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Plan Price</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Gross</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Fee</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((e) => (
                        <tr key={e.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-4 text-sm">{new Date(e.allocated_at).toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-sm">{e.time_used_minutes} min</td>
                          <td className="py-3 px-4 text-sm">{e.plan_price_xaf.toLocaleString()} XAF</td>
                          <td className="py-3 px-4 text-sm font-medium">{e.gross_xaf.toLocaleString()} XAF</td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">-{e.platform_fee_xaf.toLocaleString()}</td>
                          <td className="py-3 px-4 text-sm font-bold text-emerald-600">+{e.net_xaf.toLocaleString()} XAF</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'Payout Requests' && (
          <Card className="animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Payout Requests</CardTitle>
                <p className="text-sm text-muted-foreground">{payouts.length} request{payouts.length !== 1 ? 's' : ''}</p>
              </div>
              <Button onClick={() => setPayoutOpen(true)} disabled={balance < MIN_PAYOUT}>
                <ArrowUpRight size={16} className="mr-2" />New Payout
              </Button>
            </CardHeader>
            <CardContent>
              {payoutsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : payouts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No payout requests yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Method</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Amount</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Fee</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Net</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.map((p) => (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-4 text-sm">{new Date(p.requested_at).toLocaleString()}</td>
                          <td className="py-3 px-4 text-sm uppercase">{p.method}</td>
                          <td className="py-3 px-4 text-sm font-medium">{p.amount_xaf.toLocaleString()} XAF</td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">-{p.fee_xaf.toLocaleString()}</td>
                          <td className="py-3 px-4 text-sm font-bold">{p.net_xaf.toLocaleString()} XAF</td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className={payoutStatusStyles[p.status]}>{p.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Payout Request Dialog */}
      <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Payout</DialogTitle>
            <DialogDescription>
              Minimum payout: {MIN_PAYOUT.toLocaleString()} XAF. Available: {balance.toLocaleString()} XAF.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Amount (XAF)</Label>
              <Input type="number" placeholder={`Min ${MIN_PAYOUT.toLocaleString()}`} value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} min={MIN_PAYOUT} max={balance} />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="momo">Mobile Money (MTN)</SelectItem>
                  <SelectItem value="om">Orange Money</SelectItem>
                  <SelectItem value="bank">Bank Transfer (processed manually within 24h)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(payoutMethod === 'momo' || payoutMethod === 'om') && (
              <div className="space-y-2">
                <Label>Recipient Phone</Label>
                <Input
                  type="tel"
                  placeholder="237 6XX XXX XXX"
                  value={payoutPhone}
                  onChange={(e) => setPayoutPhone(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Format: 237XXXXXXXXX or 6XXXXXXXX</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleRequestPayout} disabled={!payoutAmount || !payoutMethod || requesting}>
              {requesting ? 'Requesting...' : 'Confirm Payout'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProviderDashboard;

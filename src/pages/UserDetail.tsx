import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Wallet, Package, Wifi, Gift, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUserDetail } from "@/hooks/use-user-detail";
import type { BundleStatus, SegmentStatus, WalletTxStatus, WalletTxType } from "@/types/database";

const statusColor = (s: BundleStatus | SegmentStatus | WalletTxStatus | string) => {
  switch (s) {
    case "active": case "confirmed": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "exhausted": case "ended": return "bg-muted text-muted-foreground";
    case "expired": case "error": case "failed": return "bg-destructive/10 text-destructive";
    case "pending": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    default: return "bg-muted text-muted-foreground";
  }
};

const txTypeLabel: Record<WalletTxType, string> = {
  recharge: "Recharge", debit: "Debit", refund: "Refund", reward: "Reward", gift: "Gift",
};

const UserDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useUserDetail(id);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">User not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const { profile, bundles, segments, walletTransactions, giftCredits } = data;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{profile.full_name}</h1>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
        <Badge variant="outline" className="gap-1 text-sm">
          <Shield size={14} /> {profile.role || "user"}
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Wallet</p>
              <p className="text-lg font-bold">{(profile.wallet_balance_xaf ?? 0).toLocaleString()} XAF</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Package size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bundles</p>
              <p className="text-lg font-bold">{bundles.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Wifi size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sessions</p>
              <p className="text-lg font-bold">{segments.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Gift size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gift Credits</p>
              <p className="text-lg font-bold">{giftCredits.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><User size={16} /> Profile Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{profile.phone || "—"}</span></div>
            <div><span className="text-muted-foreground">Gender:</span> <span className="font-medium capitalize">{profile.gender || "—"}</span></div>
            <div><span className="text-muted-foreground">DOB:</span> <span className="font-medium">{profile.date_of_birth || "—"}</span></div>
            <div><span className="text-muted-foreground">Referral Code:</span> <span className="font-medium">{profile.referral_code || "—"}</span></div>
            <div><span className="text-muted-foreground">Terms Agreed:</span> <span className="font-medium">{profile.terms_agreed_at ? new Date(profile.terms_agreed_at).toLocaleDateString() : "—"}</span></div>
            <div><span className="text-muted-foreground">Joined:</span> <span className="font-medium">{new Date(profile.created_at).toLocaleDateString()}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="bundles">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="bundles">Bundles ({bundles.length})</TabsTrigger>
          <TabsTrigger value="sessions">Sessions ({segments.length})</TabsTrigger>
          <TabsTrigger value="wallet">Wallet ({walletTransactions.length})</TabsTrigger>
          <TabsTrigger value="gifts">Gifts ({giftCredits.length})</TabsTrigger>
        </TabsList>

        {/* Bundles Tab */}
        <TabsContent value="bundles">
          <Card>
            <CardContent className="pt-4">
              {bundles.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No bundles purchased yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Minutes</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Purchased</TableHead>
                      <TableHead>Expires</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bundles.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.bundles?.name || "—"}</TableCell>
                        <TableCell className="capitalize">{b.session_type}</TableCell>
                        <TableCell>{b.total_minutes}</TableCell>
                        <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(b.status)}`}>{b.status}</span></TableCell>
                        <TableCell>{new Date(b.purchased_at).toLocaleDateString()}</TableCell>
                        <TableCell>{b.expires_at ? new Date(b.expires_at).toLocaleDateString() : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <Card>
            <CardContent className="pt-4">
              {segments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No sessions recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Access Point</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time Used</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Ended</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {segments.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{(s.access_points as any)?.zone_label || "—"}</TableCell>
                        <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(s.status)}`}>{s.status}</span></TableCell>
                        <TableCell>{s.time_used_minutes} min</TableCell>
                        <TableCell>{new Date(s.started_at).toLocaleString()}</TableCell>
                        <TableCell>{s.ended_at ? new Date(s.ended_at).toLocaleString() : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wallet Tab */}
        <TabsContent value="wallet">
          <Card>
            <CardContent className="pt-4">
              {walletTransactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No wallet transactions yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Net</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {walletTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium">{txTypeLabel[tx.type]}</TableCell>
                        <TableCell>{tx.amount_xaf.toLocaleString()} XAF</TableCell>
                        <TableCell>{tx.fee_xaf.toLocaleString()} XAF</TableCell>
                        <TableCell className="font-semibold">{tx.net_xaf.toLocaleString()} XAF</TableCell>
                        <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(tx.status)}`}>{tx.status}</span></TableCell>
                        <TableCell className="font-mono text-xs max-w-[120px] truncate">{tx.reference}</TableCell>
                        <TableCell>{new Date(tx.created_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gifts Tab */}
        <TabsContent value="gifts">
          <Card>
            <CardContent className="pt-4">
              {giftCredits.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No gift credits yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Total Minutes</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Granted</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Exhausted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {giftCredits.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium capitalize">{g.type.replace("_", " ")}</TableCell>
                        <TableCell>{g.minutes_total}</TableCell>
                        <TableCell className="font-semibold">{g.minutes_remaining}</TableCell>
                        <TableCell>{new Date(g.granted_at).toLocaleDateString()}</TableCell>
                        <TableCell>{g.expires_at ? new Date(g.expires_at).toLocaleDateString() : "—"}</TableCell>
                        <TableCell>{g.exhausted_at ? new Date(g.exhausted_at).toLocaleDateString() : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserDetail;

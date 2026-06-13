# Mise à jour Sprint Post-Demo Day

> Ce document résume les changements appliqués lors du sprint post-démo. Il vit dans les deux dépôts `Konnectik/konnectik-hub` (dashboard + backend) et `Konnectik/appweb` (PWA). Tenir à jour pour chaque sprint.

## Vue d'ensemble

12 items du backlog ont été traités, dont les **4 priorités critiques** (bloquants pour les tests publics) :

| Priorité | # | Item | Statut |
|---|---|---|---|
| 🔴 Critique | #1 | Sécurisation achat forfait (proximité géographique) | ✅ Réglé |
| 🔴 Critique | #2 | Dysfonctionnement paiements (recharge MoMo/OM) | ✅ Réglé (instrumenté + Orange Money documenté côté Netwallet) |
| 🔴 Critique | #3 | Portabilité forfait (temps restant pas conservé) | ✅ Réglé |
| 🔴 Critique | #4 | end-segment instable | ✅ Réglé |
| 🟠 Haute | #5 | Chargement des points Wi-Fi au premier lancement | ✅ Réglé |
| 🟠 Haute | #6 | Position de départ de la carte | ✅ Réglé |
| 🟠 Haute | #7 | Système de notifications | ✅ Réglé |
| 🟡 Moyenne | #8 | Rewards & Gifts | ✅ Implémenté (DB) |
| 🟡 Moyenne | #9 | Referral Program | ✅ Implémenté (DB) |
| Dashboard | #10 | Séparation données financières provider/admin | ✅ Réglé |
| Dashboard | #11 | Refonte tableaux financiers | ✅ Réglé |
| Dashboard | #12 | Module Payout | ✅ Réglé |
| Bonus | — | Documentation API consolidée | ✅ `docs/API.md` |

---

## Détail des problèmes résolus

### #1 — Sécurisation de l'achat des forfaits

**Avant** : un utilisateur pouvait acheter un forfait et démarrer une session sur n'importe quel AP, même à des kilomètres de l'AP. Aucune vérification.

**Après** :
- `start-segment` exige désormais `user_lat`, `user_lng` (+ `gps_accuracy_m` optionnelle) et calcule la distance Haversine entre l'user et l'AP. Refuse `403 OUT_OF_RANGE` si l'user est au-delà de `propagation_radius_m × 1.3 + 50m + précision GPS`.
- `purchase-bundle` fait un check précoce (échec rapide) si l'app a déjà l'AP visé.
- Côté PWA, `startSession` et `purchaseBundle` demandent la géoloc fraîche (`enableHighAccuracy`) avant d'appeler le backend.
- **Limite** : le scan SSID n'est pas exposé par les navigateurs (ni iOS ni Android Chrome). Sera ajouté quand l'app native sortira.

### #2 — Dysfonctionnement des paiements

**Avant** : pas de visibilité sur les échecs, recharges qui ne créaient parfois aucune transaction, callbacks Netwallet qui parfois ne reconfirmaient rien.

**Après** :
- `initiate-recharge` instrumenté : log de chaque étape avec timing (`token 200 in 511ms`, `request-payment 400 in 7589ms`), avec hash input, méthode, etc.
- Timeout explicite (10s sur token, 20s sur paiement) → plus de `EarlyDrop` silencieux.
- `recharge-webhook` durci contre les doubles crédits : `UPDATE WHERE status='pending'` atomique. Si la même tx est appelée deux fois (Netwallet retry), seule la première crédite, la seconde retourne `{idempotent: true}`.
- Modal de progression dans la PWA : `initiating → awaiting_ussd → confirmed / failed / timeout` lié à la realtime sub `wallet_transactions` + 4 refresh de profile (5/15/30/60s) en filet de sécurité.
- `recharge-webhook` est maintenant correctement `verify_jwt = false` (Netwallet n'envoie pas de JWT).
- **Spécificité Orange Money** : Netwallet renvoie systématiquement `errorCode 5000` après ~7s pour `orange_cm`. Confirmé côté agrégateur — à reporter à Netwallet support avec un orderId d'exemple. MoMo (MTN) fonctionne.

### #3 — Portabilité forfait

**Avant** : quand un user disconnect, l'UI montrait son forfait toujours intact, comme si rien n'avait été utilisé. Le serveur calculait pourtant correctement.

**Après** : bug d'affichage dans `computeBundleRemainingMinutes` — la fonction filtrait sur des statuts `"completed"` et `"terminated"` qui n'existent pas (l'enum DB est `active | ended | expired | error`). Maintenant elle filtre sur `!= "active"` et inclut le temps écoulé live du segment actif.

### #4 — end-segment instable

**Avant** : double tap, retry réseau, ou expiration causaient soit des 400 soit des doubles crédits du provider ledger.

**Après** :
- Retour 200 idempotent si segment déjà ended (avant : 400).
- UPDATE atomique avec `WHERE status='active'` contre les race conditions.
- `provider_earnings_ledger` (UNIQUE sur `segment_id`) : violation 23505 catchée sans crash et sans double crédit du wallet provider.
- Force-disconnect renforcé : `remove-user` + `kick-active` côté Mikrotik (le second soft-fail si pas encore implémenté sur le VPS).

### #5 — Chargement des points Wi-Fi au premier lancement

**Avant** : les APs n'apparaissaient qu'après fermeture/réouverture complète de l'app.

**Causes** :
- `useAccessPoints` partait avant que l'auth soit prête → RLS bloque → cache `[]` pendant 60s.
- Wrapper `<div>` autour de Circle/Marker dans Leaflet (react-leaflet n'accepte pas de div enfants directs).

**Après** : query gated sur `!!user` + `<Fragment>` wrapper.

### #6 — Position de départ de la carte

**Avant** : la carte démarrait à Yaoundé (3.848, 11.502) et n'allait JAMAIS sur la position user — `flyTo` ne se déclenchait que sur clic du bouton recenter.

**Après** : `FlyToOnChange` se ré-exécute à chaque changement de `userLocation` (donc premier fix GPS) ET sur trigger button.

### #7 — Système de notifications

**Backend (DB)** :
- `create_notification(user_id, title, body, category, data)` — helper centralisé.
- Triggers automatiques sur `wallet_transactions` (confirmed/failed), `user_bundles` (insert + exhausted), `payout_requests` (completed/failed).
- Trigger AFTER INSERT sur `notifications` qui POST vers `send-push` via `pg_net` → push Web envoyé à tous les `device_tokens` de l'user.

**Frontend (PWA)** :
- Service Worker enrichi avec `push` et `notificationclick` handlers.
- `PushSubscribe` component auto-souscrit à VAPID à l'init (silencieux, no-op si VAPID non configuré).

**Setup opérateur** :
1. `npx web-push generate-vapid-keys` → 2 clés.
2. `npx supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:ops@konnectik.cm`.
3. `NEXT_PUBLIC_VAPID_PUBLIC_KEY=...` côté Netlify.
4. **Dans SQL Editor une seule fois** : `SELECT vault.create_secret('<service_role_jwt>', 'service_role_key');` (la clé `service_role` se trouve dans Settings → API).

### #8 — Rewards & Gifts

- **`first_time` gift** : 30 minutes accordées automatiquement à chaque signup (trigger `profiles_first_time_gift`).
- **`monthly` gift** : RPC admin `grant_monthly_gifts(_minutes := 15)` — idempotent par mois calendaire.
- **Cadeau user-to-user** : RPC `transfer_gift_minutes(_to_user, _minutes)`. Consomme les minutes du sender FIFO + crédite le receiver + crée une notif.

### #9 — Referral Program

- Chaque profil reçoit un `referral_code` 8-char unique auto-généré (trigger).
- Au signup, si le nouveau user a fourni un `referral_code` valide, son `referred_by` est rempli + un événement `signup` est loggé.
- Au premier achat confirmé du référé, un événement `first_purchase` est créé + **60 minutes de cadeau** sont accordées au parrain.

### #10 — Séparation données financières provider/admin

**Bug** : `get_dashboard_stats()` était `SECURITY DEFINER` sans check de rôle. Un provider qui appelait l'RPC recevait `total_gmv_xaf`, `platform_revenue_xaf`, `total_users` — données admin-only.

**Fix** : RPC branche maintenant sur le rôle. Trois scopes :
- `admin` → tout
- `provider` → uniquement les métriques liées à ses propres APs et earnings
- `user` / `anonymous` → tous les champs financiers retournés à 0

UI hardening : revenue chart double-gated (`isAdmin && scope==='admin'`).

### #11 — Refonte tableaux financiers

- Nouvelle table `payout_requests` (provider_id, requested_by, amount, fee, net, method, status, reference, aggregator_ref, error_message, requested_at, completed_at).
- Hook `usePayoutRequests` avec realtime sur changement de statut.
- Table dans `ProviderDashboard.tsx` qui affiche tous les payouts avec badges colorés selon `status`.
- Phone number requis dans le formulaire pour MoMo/OM (avant : juste amount + method).

### #12 — Module Payout

**Bugs critiques fixés** :
1. **Mauvais wallet débité** : avant `process-payout` débitait `profiles.wallet_balance_xaf` (wallet user) au lieu de `provider_wallets.balance_xaf`. Aucun provider ne pouvait retirer ses gains.
2. **OrderID avec tirets** rejeté par Netwallet (errorCode 4007).
3. **Callback pointait vers `recharge-webhook`** → confusion des flux.
4. **Pas de KYC gate** : n'importe quel user pouvait tenter un payout.
5. **Pas d'historique** : impossible d'auditer.

**Après** :
- Débit du bon wallet (`provider_wallets`) avec UPDATE atomique conditionné sur la valeur précédente (évite race condition).
- OrderID alphanumérique sans tirets.
- Nouveau webhook dédié `payout-webhook` (idempotent, refund automatique sur échec).
- Refus 403 si KYC non `approved`.
- Tous les payouts loggés en DB.
- Branch `bank` → laisse le payout en `pending` pour traitement admin manuel (24h).

---

## Fichiers ajoutés / modifiés

### Backend (`Konnectik/konnectik-hub`)

**Nouveaux** :
- `src/sql/phase11-financial-isolation.sql`
- `src/sql/phase12-payout-requests.sql`
- `src/sql/phase13-notifications-helper.sql`
- `src/sql/phase14-referral-automation.sql`
- `src/sql/phase15-rewards-gifts.sql`
- `src/sql/phase16-enable-pgnet-pushtrigger.sql`
- `src/hooks/use-payout-requests.ts`
- `supabase/functions/payout-webhook/index.ts`
- `supabase/functions/send-push/index.ts`
- `docs/API.md`

**Modifiés** :
- `supabase/config.toml` (verify_jwt = false pour les 2 webhooks publics)
- `supabase/functions/start-segment/index.ts`
- `supabase/functions/purchase-bundle/index.ts`
- `supabase/functions/end-segment/index.ts`
- `supabase/functions/process-payout/index.ts`
- `supabase/functions/initiate-recharge/index.ts`
- `supabase/functions/recharge-webhook/index.ts`
- `src/hooks/use-dashboard-stats.ts`
- `src/pages/Dashboard.tsx`
- `src/pages/ProviderDashboard.tsx`

### PWA (`Konnectik/appweb`)

**Nouveaux** :
- `components/install-prompt.tsx`
- `components/push-subscribe.tsx`
- `components/recharge-progress-modal.tsx`

**Modifiés** :
- `app/layout.tsx` (mount InstallPrompt + PushSubscribe)
- `components/recharge-sheet.tsx` (z-index 1100)
- `components/purchase-confirm-sheet.tsx` (z-index 1100)
- `components/map/leaflet-map.tsx` (Fragment + FlyTo)
- `components/screens/login-screen.tsx` (responsive)
- `components/screens/register-screen.tsx` (safe-area top)
- `components/screens/bundles-screen.tsx`, `gift-cards-screen.tsx`, `complete-profile-screen.tsx`, `usage-screen.tsx` (safe-area top)
- `contexts/auth-context.tsx` (realtime sub sur profiles)
- `hooks/use-app-state.ts` (pendingRecharge state, geoloc, GPS coords sent to server)
- `lib/mock-data.ts` (fix `computeBundleRemainingMinutes`)
- `lib/supabase/queries.ts` (`useAccessPoints` auth-gated)
- `lib/supabase/edge-functions.ts` (nouvelles signatures avec coords)
- `public/sw.js` (push + notificationclick handlers)

---

## Migrations DB appliquées en prod

Toutes appliquées via `npx supabase db query --linked` sur `Konnectik-Pilot` (`ufdzcxycgprgvigyotnk`) :

```
phase11-financial-isolation.sql      ✅
phase12-payout-requests.sql          ✅
phase13-notifications-helper.sql     ✅
phase14-referral-automation.sql      ✅
phase15-rewards-gifts.sql            ✅
phase16-enable-pgnet-pushtrigger.sql ✅
```

## Edge functions déployées en prod

```
start-segment      ✅
purchase-bundle    ✅
end-segment        ✅
process-payout     ✅
payout-webhook     ✅ (--no-verify-jwt)
send-push          ✅
```

`initiate-recharge` et `recharge-webhook` avaient déjà été déployés lors des sessions précédentes.

---

## Reste à faire (opérationnel)

1. **Activer Web Push** (1 minute) : SQL Editor →
   ```sql
   SELECT vault.create_secret('<service_role_jwt>', 'service_role_key');
   ```
2. **VAPID keys** : générer + push secrets Supabase + Netlify env.
3. **Orange Money** : ouvrir un ticket Netwallet avec un orderId d'exemple (`errorCode 5000` constant après 7-9s sur `orange_cm`).
4. **Mikrotik VPS Relay** : implémenter l'endpoint `/hotspot/kick-active` (currently soft-fails — la session se ferme via timeout WG).
5. **Smoke test** complet (signup → recharge → bundle → session → payout) selon `docs/API.md` section 9.

---

## Hors scope de ce sprint

- **Environnement staging** : à créer (nouveau projet Supabase staging + branche Netlify dédiée).
- **Monitoring 3rd party** : intégration Logflare / Datadog / Sentry à planifier.
- **App native iOS / Android** : prérequis pour le scan SSID complet.
- **Refonte UI dashboard** plus large (les tableaux fonctionnels sont en place mais peuvent être enrichis avec charts / filtres).

---

_Dernière mise à jour : sprint post-demo day._



## Bulk Notifications Page

### Summary
Create an admin-only page at `/dashboard/notifications` where admins can compose notifications, filter target users by zone, wallet balance range, or select all users, preview the recipient count, and send. Notifications are inserted into the existing `notifications` table.

### New Files

**1. `src/pages/BulkNotifications.tsx`**
- Form with fields: title (required), body (required, textarea), category (select from NotificationCategory enum)
- Filter section with three modes via radio/toggle:
  - "All Users" — targets every profile
  - "By Zone" — multi-select dropdown of wifi_zones, targets users who have session_segments linked to access_points in selected zones
  - "By Balance Range" — min/max XAF inputs, filters profiles by `wallet_balance_xaf`
- "Preview Recipients" button that queries Supabase to show count of matching users
- "Send Notifications" button with confirmation dialog
- On send: batch-insert rows into `notifications` table (one per recipient user_id)
- Success/error toast feedback
- Loading states during send

**2. `src/hooks/use-bulk-notifications.ts`**
- `useNotificationRecipients(filter)` — query hook that returns user IDs + count based on filter criteria:
  - All: select all profile IDs
  - By zone: join session_segments → access_points → wifi_zones to get distinct user_ids
  - By balance: filter profiles on wallet_balance_xaf between min and max
- `useSendBulkNotifications()` — mutation that accepts `{ userIds, title, body, category }` and batch-inserts into `notifications` table

### Modified Files

**3. `src/components/DashboardNav.tsx`**
- Add nav item: `{ label: "Notifications", path: "/dashboard/notifications", adminOnly: true }`

**4. `src/App.tsx`**
- Add route: `<Route path="notifications" element={<AdminRoute><BulkNotifications /></AdminRoute>} />`
- Import BulkNotifications page

### UI Layout
- Card-based layout matching existing pages (same pattern as AddBundle/AddZone)
- Left section: compose form (title, body, category)
- Right section: filter controls + recipient preview count
- Bottom: send button with confirmation dialog

### Data Flow
```text
Admin selects filter → Preview shows count
Admin clicks Send → Confirmation dialog
Confirmed → Insert N rows into notifications table
→ Toast success with count sent
```

### Batch Insert Strategy
- Supabase client supports array inserts: `.insert(rows[])` 
- For large user bases, chunk into batches of 500 to avoid payload limits


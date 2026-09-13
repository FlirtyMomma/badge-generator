# True Offline Sync Implementation Plan

This plan details how we will make the OB Hub truly bulletproof in Wi-Fi dead zones by queuing database operations and seamlessly syncing them when the connection returns.

## User Review Required
No breaking changes. This relies on modern browser `localStorage` and `navigator.onLine` events to safely cache and push data.

## Proposed Changes

### [Core App]
- Add a new visual indicator in the top navbar: "3 Items Waiting to Sync" (when offline or pending).
- Hook into the browser's `online` and `offline` heartbeat to trigger automatic background syncing.

#### [NEW] src/lib/offlineSync.js
- Create a lightweight background queue manager.
- Features: `enqueueSyncTask`, `processSyncQueue`, and `getQueueCount`.
- Uses `localStorage` so queued scans survive accidental app closures.

#### [MODIFY] src/App.jsx
- Import `offlineSync.js`.
- Add a `pendingSyncs` state to track the queue size.
- Add event listeners that run `processSyncQueue` automatically when the device regains Wi-Fi.
- Display a small yellow badge next to the offline indicator showing the queue size if > 0.

### [Scanning Modules]
- Update our scanning components to use a fail-safe approach. If Supabase fails due to network loss, it immediately drops the scan into the offline queue instead of throwing an error.

#### [MODIFY] src/components/BayFinder.jsx
- Wrap the `store_season_scans` insert logic in an offline-safe wrapper.
- Update local `scannedBarcodes` state immediately so the UI responds instantly, even if the save is queued for later.

#### [MODIFY] src/components/LegacyStoreCount.jsx
- Wrap the `legacy_stock_counts` insert/update logic in the offline-safe wrapper.
- Allow staff to keep scanning boxes rapidly while completely offline without the app freezing or rejecting scans.

## Verification Plan
1. Start the app and turn off Wi-Fi (or simulate offline mode in Chrome DevTools).
2. Scan several items in Bay Finder. Verify the UI updates instantly and the top bar says "3 Items Waiting to Sync".
3. Turn Wi-Fi back on. Verify the queue automatically drains to 0 and the items appear in the Supabase database.

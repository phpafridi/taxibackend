Backend - Apple fixes + "open the app" reminder (21 Nov)
========================================================
Replaces rs-backend-delete-account.zip (this one includes it).

Files (copy over the same paths):
  src/app/api/m/profile/route.ts                 every account can be deleted in the app
  src/app/api/m/driver-location/track/route.ts   push text when admin switches tracking on
  ws-server/index.ts                             "open the app" reminder
  src/app/api/m/agreements/[id]/pdf/route.ts     agreement PDF never prints a deleted login email
  src/app/privacy/page.tsx                       website: location only while app open; deletion text
  src/app/delete-account/page.tsx                website: Me -> Privacy & data path; active hire no longer blocks
  src/app/terms/page.tsx                         website: delete any time
  src/components/legal/LegalPage.tsx             website: "Last updated 21 November 2026"

Driver deletes account after signing an agreement:
 - Login closed for good (email freed, password scrambled, signed out everywhere,
   push tokens, live location and uploaded licence/ID photos removed).
 - The signed agreement stays, and so do the details printed on it (name, phone,
   address, licence, date of birth, NI, emergency contact) - it's a legal contract.
 - Payments/ledger and the car record stay. Unsigned agreements are cancelled.
 - The driver disappears from the Drivers list; all managers get a notification.
 - A driver who never signed anything is fully erased ("Deleted user").

How tracking works now (location only while the driver's app is open):
 1. Admin turns Track ON  -> driver gets a push:
      "Open RS Private Hire - Your fleet manager wants to see where your car is.
       Open the app to share your location."
 2. Driver opens the app (tap the push or open it normally) -> location is shared live.
 3. Driver leaves the app while still tracked -> about 1-2 minutes later he gets the
    same push again (only if the app is still closed and tracking is still ON;
    at most once every 15 minutes, never after he signs out).
 4. Admin turns Track OFF -> no more reminders.

No database changes. Deploy:
  cd /home/afridi/web/rsphire.co.uk/public_html/app
  (copy the files in, or git pull)
  sudo -u afridi npm run build
  sudo supervisorctl restart nextjs ws-server

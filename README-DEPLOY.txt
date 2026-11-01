Run on the server (as afridi) in /home/afridi/web/rsphire.co.uk/public_html/app :
1. unzip over the app folder (keep folder structure)
2. sudo -u afridi npx prisma db push        # adds 2 new tables: admintag, admindoc (nothing existing is changed or deleted)
3. sudo -u afridi npx prisma generate
4. sudo -u afridi npm run build
5. sudo supervisorctl restart nextjs ws-server
If uploads fail with "413" add  client_max_body_size 16m;  to the nginx/HestiaCP site config for rsphire.co.uk and reload nginx.

# Production Reference

Use these commands on the Hostinger server for the OMS backend. Keep this file local for reference; do not push it unless you decide to share it later.

## Backend path

```bash
cd /home/u902868468/app/backend
```

## Clear Laravel cache

Use the PHP 8.3 binary on this server when running Artisan:

```bash
/opt/alt/php83/usr/bin/php artisan optimize:clear
/opt/alt/php83/usr/bin/php artisan cache:clear
/opt/alt/php83/usr/bin/php artisan config:clear
/opt/alt/php83/usr/bin/php artisan route:clear
/opt/alt/php83/usr/bin/php artisan view:clear
```

## Rebuild cache after changes

```bash
/opt/alt/php83/usr/bin/php artisan config:cache
/opt/alt/php83/usr/bin/php artisan route:cache
/opt/alt/php83/usr/bin/php artisan view:cache
/opt/alt/php83/usr/bin/php artisan optimize
```

## Refresh runtime after deploying code

```bash
/opt/alt/php83/usr/bin/php artisan migrate --force
/opt/alt/php83/usr/bin/php artisan queue:restart
```

## Make sure logs and cache folders are writable

```bash
mkdir -p storage/logs bootstrap/cache
touch storage/logs/laravel.log
chmod -R ug+rwX storage bootstrap/cache
```

## If the app is stuck after .env changes

```bash
/opt/alt/php83/usr/bin/php artisan config:clear
/opt/alt/php83/usr/bin/php artisan optimize:clear
/opt/alt/php83/usr/bin/php artisan config:cache
```

## PHP restart note

On shared hosting like Hostinger, there is usually no SSH command to restart the PHP service directly.

Use one of these instead:

```bash
# Rebuild Laravel caches after editing .env or config files
/opt/alt/php83/usr/bin/php artisan optimize:clear
/opt/alt/php83/usr/bin/php artisan config:cache

# If you have panel access, switch PHP version or use the hosting control panel's PHP reset/restart option
```

## Quick health check

```bash
/opt/alt/php83/usr/bin/php artisan --version
/opt/alt/php83/usr/bin/php artisan route:list
curl -sS -X POST 'https://app.apnistationery.com/api/index.php/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"ops@ops.com","password":"password"}'
```

## Notes

- Keep `APP_ENV=production`.
- Keep `APP_DEBUG=false` on the live site.
- If you change database credentials, rerun `config:clear` and `config:cache`.
- If you change queue settings, run `queue:restart` after caching.
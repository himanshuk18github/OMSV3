# OMS v3 Deployment Notes

## 1) Frontend API URL (fixes login 404 on deploy)
Set this in frontend environment before build:

```
VITE_API_BASE_URL=https://app.apnistationery.com/api/index.php
```

Why this is safer on shared hosting:
- `/api/index.php/...` bypasses dependency on web-server rewrite rules.
- If rewrites are configured correctly, `/api/...` also works. But `index.php` path avoids route 404 caused by rewrite misconfiguration.

If backend is on a different domain, set that domain instead:

```
VITE_API_BASE_URL=https://api.apnistationery.com/api/index.php
```

## 2) Backend process auto-start

### Option A: Procfile-based platforms (Render, Railway, etc.)
Use the included `Procfile`:

- `web`: `php artisan serve --host=0.0.0.0 --port=${PORT:-8000}`
- `worker`: `php artisan queue:work --tries=3 --timeout=120 --sleep=3`
- `scheduler`: `php artisan schedule:work`

### Option B: VPS with Supervisor
Use examples in `deploy/supervisor/`:

- `oms-worker.conf.example`
- `oms-scheduler.conf.example`

After copying and adjusting paths:

```
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start oms-worker
sudo supervisorctl start oms-scheduler
```

## 3) One-time backend setup
Run from `backend`:

```
composer install --no-dev --optimize-autoloader
php artisan key:generate --force
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## 4) Quick health check
Confirm API is reachable:

```
curl -i https://app.apnistationery.com/api/auth/login
curl -i https://app.apnistationery.com/api/index.php/auth/login
```

Expected result: no 404 route miss. You should get a validation response (`422`) for missing body or `405` for method mismatch when endpoint is reachable.

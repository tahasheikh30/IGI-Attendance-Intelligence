# Running the frontend on your own server (nginx)

`vercel.json` only works on Vercel. On a server of your own, nginx serves the built frontend, sends the security headers, and forwards `/api` to the backend.

Files:
- `attendance.conf`: the server blocks (HTTPS, the single page app rule, caching, `/api` proxy). Copy to `/etc/nginx/conf.d/`.
- `attendance-security-headers.conf`: the security headers (the same set as in pull request "Add security headers in vercel.json", with `connect-src 'self'`). Copy next to it.

Steps:
1. Build **without** `VITE_API_URL`, so the app calls `/api` on its own address: `VITE_API_URL= npm run build`. Copy `dist/` to `/var/www/attendance`.
2. Replace `attendance.example.org` and the certificate paths in `attendance.conf`.
3. `sudo nginx -t && sudo systemctl reload nginx`.
4. Start the backend on `127.0.0.1:8000` only (see `deploy/` in the backend repository), with `TRUSTED_PROXIES=1`.

Things to know:
- Only `/api` is forwarded, so the backend's `/docs`, `/redoc` and `/openapi.json` are never reachable.
- `X-Forwarded-For` is set with `$proxy_add_x_forwarded_for`, which adds the address nginx saw last. With `TRUSTED_PROXIES=1` the backend believes only that last entry. Never replace it with `$http_x_forwarded_for`.
- `add_header` in a location replaces the headers of the server block, so each location that sets its own `add_header` includes the headers file. The `/api` location sets none, because the backend sends its own.
- If the backend has a different address instead, add that exact address to `connect-src` and set `CORS_ORIGINS` on the backend.

Tested with nginx 1.24 over HTTPS in front of the merged backend: all 25 browser checks passed, the 7 headers arrive on pages and built files, and wrong logins with forged `X-Forwarded-For` values were still locked out by the real address. See Section 12 of the documentation.

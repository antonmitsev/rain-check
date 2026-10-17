# Deployment: Apache shared hosting / cPanel

## Option A — recommended: upload the build manually

No Node.js is required on the host.

1. On your computer install Node.js (compatible modern LTS), then:
   ```sh
   npm install
   npm run build
   ```
2. In **cPanel → Domains**, create a domain/subdomain such as `rain.example.com` and set its **Document Root** to e.g. `/home/USER/public_html/rain-check`. If DNS is hosted elsewhere, add an A/AAAA record pointing the name to the hosting IP. Allow DNS to propagate. Enable HTTPS via AutoSSL / SSL/TLS Status (availability depends on host).
3. Open **File Manager**. Navigate to that exact Document Root. Upload **the contents of** `dist/` (not the folder itself): `index.html`, `assets/`, `manifest.webmanifest`, `sw.js`, `icons/`, `precache-manifest.json`, `version.json`, and the hidden `.htaccess` file.
4. Verify `https://rain.example.com/version.json` returns JSON with the expected version and UTC build timestamp. Then open `https://rain.example.com/`. Accept browser geolocation permission or type a city. Click **Check weather**.

For an existing domain, you can instead upload the files into a subdirectory, e.g. `public_html/rain-check/`, and open `https://example.com/rain-check/`. Vite uses relative asset paths (`base: './'`) so this works without rewriting asset URLs.

**iOS icons:** Always run the full `npm run build` (which generates the Apple PNG before Vite and precache preparation). Upload the whole `icons/` directory, including `apple-touch-icon.png` (**180×180**) and `favicon-32.png`; confirm `https://raincheck.tonymitsev.com/icons/apple-touch-icon.png` loads as an image. Existing iOS Home Screen shortcuts may keep the old monogram icon until the shortcut is removed and added again in Safari. Do not clear browser data for this.

**PWA:** HTTPS is mandatory for service workers and installability (except localhost). Make sure `manifest.webmanifest`, `sw.js`, `precache-manifest.json`, `icons/apple-touch-icon.png`, the other PNG icons, and every file in `assets/` are served without 404 errors. Run the full `npm run build` command (which includes PWA postbuild preparation). The service worker is registered with a relative URL and supports either a dedicated subdomain or a subdirectory. After deployment, reload online once to cache the app shell. For updates, upload the **complete new build**, including hidden `.htaccess`. Modern app versions check for a changed worker on startup/focus/visibility/online and automatically reload once its complete new cache activates. A legacy installed version without this handler may require one manual online reload. See [PWA guide](pwa.md).

**Apache HTTPS redirect:** `public/.htaccess` is copied into `dist/.htaccess` by the Vite build and must be uploaded to the site's Document Root along with the other build files. It uses Apache `mod_rewrite` to redirect HTTP requests to the same URL over HTTPS with a permanent `301` response, preserving the hostname, path, and query string. If the site is deployed in `/rain-check/`, the redirect preserves that subdirectory. The informational screens use hash routes, so no SPA fallback rewrite is needed. PHP and databases are unnecessary.

cPanel File Manager may hide dotfiles. Enable **Settings → Show Hidden Files (dotfiles)** to confirm `.htaccess` is present; some file-upload or archive workflows may skip it. Apache must allow `.htaccess` overrides and enable `mod_rewrite`. The domain needs a valid TLS certificate first (e.g. AutoSSL). If cPanel's **Force HTTPS Redirect** is already enabled, consider using only one HTTPS redirect mechanism to simplify troubleshooting. Behind a reverse proxy or CDN, use end-to-end HTTPS (such as Cloudflare Full/Strict) rather than HTTP-only origin connections that can cause redirect loops.

**Verify with:**

```sh
curl -I 'http://rain.example.com/rain-check/?from=test'
```

Expected: `HTTP/1.1 301 Moved Permanently` (or `HTTP/2 301`) and a `Location: https://rain.example.com/rain-check/?from=test` header. A direct HTTPS request must **not** redirect again. During development of the rule, consider temporarily using `R=302` instead of `R=301` because browsers aggressively cache permanent redirects.

## Preventing stale deployments

The included `public/.htaccess` sets `Cache-Control: no-store, max-age=0` (if Apache `mod_headers` is available) on `index.html`, `sw.js`, `version.json`, `precache-manifest.json`, and `manifest.webmanifest`. The service worker also bypasses the browser HTTP cache for navigation and installing its precached resources. Content-hashed files under `assets/` remain safe to cache.

Upload **all files from the same build** to the correct Document Root. For `index.html`, `sw.js`, `version.json`, and the PWA manifest, check that a direct HTTP response is fresh, for example:

```sh
curl -I 'https://rain.example.com/index.html'
curl -I 'https://rain.example.com/sw.js'
curl -I 'https://rain.example.com/version.json'
```

These should include `Cache-Control: no-store` when `mod_headers` and `.htaccess` overrides are enabled. Compare `version.json` to your latest local `dist/version.json`. If the CDN caches these files regardless of origin headers, invalidate its cache.

Existing older PWA installations might need a **single online page reload** to load the new automatic-update listener. After that, the app updates when focused or reopened, and preserves browser-local weather snapshots/history; clearing site data is not part of normal deployment.

## Verify the deployed build

Every `npm run build` emits `dist/version.json` automatically, with:

- `version`: the version declared in `package.json`.
- `builtAt`: the build time in ISO 8601 UTC.
- `commit`: the Git revision when available, or `null` without Git metadata.

For a dedicated domain: `https://rain.example.com/version.json`.
For a subdirectory: `https://example.com/rain-check/version.json`.

The file is a static public endpoint, so it works on shared Apache without PHP or rewrite rules. Upload it with every new build. To verify deployment freshness, compare `builtAt` or `commit` with your local build. This is **not** the server deployment timestamp. Browser/service-worker caches can lag for the app itself, but the service worker does not cache `version.json`. For manual checks you can append `?check=1` to bypass intermediate URL-specific caches.

## Option B — optional cPanel Git Version Control

The file `.cpanel.yml.example` is a template only. cPanel recognizes **`.cpanel.yml`** in the root of a *cPanel-managed Git repository*.

Important limitations:
- Deployment tasks run on the hosting account; they do **not** automatically build Vite assets.
- `dist/` is ignored by Git in the normal source repository. A plain clone of GitHub has no `dist/`, so blindly enabling the example YAML will fail.
- If you want Git deployment, produce the build locally/CI and place the resulting `dist/` in the cPanel-managed deployment repository or use a deployment branch containing the build artifacts.
- Set `DEPLOYPATH` to the actual Document Root and ensure it exists/is writable.
- Rename and commit the template as `.cpanel.yml` in that deployable repository.
- In **cPanel → Git Version Control → Manage → Pull or Deploy** select **Update from Remote**, then **Deploy HEAD Commit**. Availability depends on your host's Git feature.
- Avoid deploying source files, `node_modules`, `.git`, or secrets into the public document root.

[Official cPanel Git deployment documentation](https://docs.cpanel.net/knowledge-base/web-services/guide-to-git-deployment/)

## Common issues

- **Geolocation not working:** use HTTPS (or localhost in development) and grant permission; or enter a city.
- **404 on JS/CSS:** verify contents of `dist/` are placed directly in Document Root, and do not omit `assets/`.
- **Wrong subdomain:** check cPanel Document Root and DNS.
- **HTTP is not redirected:** confirm `.htaccess` is uploaded and visible in Document Root, Apache `mod_rewrite` is enabled, and `.htaccess` overrides are allowed.
- **Redirect loop:** verify the origin server sees HTTPS correctly; check existing cPanel redirects and reverse-proxy/CDN TLS configuration.
- **API failed:** verify the host/client network can reach `api.open-meteo.com` and `geocoding-api.open-meteo.com` over HTTPS. Requests run from the visitor's browser.
- **Update:** run the full `npm run build`, upload **all** `dist/` files including dotfiles, confirm fresh `version.json`, and allow the PWA worker to activate; legacy PWA pages may need one online reload.

## Privacy and cost

Location is requested only with permission; coordinates are sent directly from the browser to Open-Meteo for forecasts. The app has no backend or user accounts. Optional Google Analytics 4 loads only after explicit analytics consent; the one-year choice cookie is shared with tonymitsev.com, and rejection blocks both sites' tags and clears the GA cookies. Because RainCheck sends its SPA page views manually, disable “Page changes based on browser history events” in the GA4 web stream's Enhanced Measurement settings to avoid duplicates. Check Open-Meteo licensing and limits before commercial use. ChatGPT Free is not a programmable API and is not used in this MVP.

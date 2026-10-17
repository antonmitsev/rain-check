# Google Analytics 4 tracking

RainCheck and tonymitsev.com use the same GA4 web stream (`G-21R1C34RPH`). RainCheck is a single-page app and sends `page_view` events manually when its hash route changes. Prevent GA4 Enhanced Measurement from also sending page views for browser-history changes:

1. In Google Analytics, open **Admin** (the gear icon).
2. Go to **Data collection and modification → Data streams**.
3. Select the web stream whose Measurement ID is `G-21R1C34RPH` (the tonymitsev.com stream).
4. In **Enhanced measurement**, click the gear icon.
5. Under **Page views**, open **Show advanced settings**.
6. Turn off **Page changes based on browser history events** and save. Leave **Page loads** enabled.

This disables only the automatic history-based page views; it does not turn off other Enhanced Measurement events. See Google's [GA4 single-page application setup](https://developers.google.com/analytics/devguides/collection/ga4/measure-spa-gtm) for the setting.

## Consent behavior

Analytics must follow the visitor's saved choice. The Google tag is not loaded before explicit acceptance. If the visitor rejects analytics, do not load or send analytics; RainCheck and tonymitsev.com share that rejection through the one-year `tm_analytics_consent` cookie. RainCheck also clears this property's `_ga` cookies. If a visitor changes an existing accepted choice to rejected while the tag is already loaded, the app sends an analytics-storage denial and reloads so subsequent activity is not tracked. The visitor can later change the choice from the site's or app's cookie controls.

The consent cookie is shared across `tonymitsev.com` and its subdomains so a choice on either site applies to both. Do not treat the presence of GA cookies as permission to track; the saved consent choice is authoritative.

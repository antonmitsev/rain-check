# Google Analytics 4 tracking

RainCheck and tonymitsev.com use the same GA4 web stream (`G-21R1C34RPH`). RainCheck is a single-page app and sends `page_view` events manually when its hash route changes. Prevent GA4 Enhanced Measurement from also sending page views for browser-history changes:

1. In Google Analytics, open **Admin** (the gear icon).
2. Go to **Data collection and modification → Data streams**.
3. Select the web stream whose Measurement ID is `G-21R1C34RPH` (the tonymitsev.com stream).
4. In **Enhanced measurement**, click the gear icon.
5. Under **Page views**, open **Show advanced settings**.
6. Turn off **Page changes based on browser history events** and save. Leave **Page loads** enabled.

This disables only the automatic history-based page views; it does not turn off other Enhanced Measurement events. See Google's [GA4 single-page application setup](https://developers.google.com/analytics/devguides/collection/ga4/measure-spa-gtm) for the setting.

## RainCheck implementation and troubleshooting

`src/services/analytics-controller.ts` loads the Google tag only after acceptance, initializes `dataLayer` with Google's standard queue pattern (`dataLayer.push(arguments)`), and configures the stream with `send_page_view: false`. RainCheck then sends the current page view and subsequent hash-route page views itself. Preserve the `arguments` queue shape: buffering gtag commands as a regular rest-parameter array can leave the tag downloaded without processing events.

A `200` response for `gtag/js?id=G-21R1C34RPH` confirms only that the tag library downloaded. Verify actual event delivery separately by checking Network for a `g/collect` request for this Measurement ID. `window.gtag` can exist as RainCheck's local queue even if the Google library has not processed its commands. GA4 can send events without setting its optional `_ga` cookies, so cookie presence alone is not a delivery check.

## Consent behavior

Analytics must follow the visitor's saved choice. The Google tag is not loaded before explicit acceptance. If the visitor rejects analytics, do not load or send analytics; RainCheck and tonymitsev.com share that rejection through the one-year `tm_analytics_consent` cookie. RainCheck also clears this property's `_ga` cookies. If a visitor changes an existing accepted choice to rejected while the tag is already loaded, the app sends an analytics-storage denial and reloads so subsequent activity is not tracked. The visitor can later change the choice from the site's or app's cookie controls.

The consent cookie is shared across `tonymitsev.com` and its subdomains so a choice on either site applies to both. Do not treat the presence of GA cookies as permission to track; the saved consent choice is authoritative.

In the **Cookies & Storage** page, Accept and Reject buttons are visible only while no valid `tm_analytics_consent` cookie exists. A recorded choice hides both buttons while retaining the `Current choice: ...` label. The buttons reappear when the cookie expires, is deleted, or becomes unavailable and the page is revisited or regains focus. The old localStorage compatibility entry never restores an expired shared cookie. A disappeared/expired consent also stops future tracking, including a page reload if GA4 was already loaded in this document.

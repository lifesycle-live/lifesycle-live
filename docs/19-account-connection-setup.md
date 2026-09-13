# Account connection setup

The agent app must run with `EXPO_PUBLIC_LIFESYCLE_API_URL` pointing to the API. An empty value is demo mode and cannot connect real accounts. Restart Expo after changing it. The current real-server preview runs at `http://localhost:8094`; port 8093 is a separate demo process.

## Developer applications

Keep secrets only in the ignored `server/.env`. Never put a client secret in an `EXPO_PUBLIC_*` variable.

- Facebook: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, optional Business Login `FACEBOOK_LOGIN_CONFIG_ID`, and `FACEBOOK_OAUTH_REDIRECT_URI`. Authorize the intended managed Page and the permissions used by the Facebook adapter. The existing provider currently selects the first returned Page; limit consent to the intended Page until account selection is implemented.
- Instagram: the existing Facebook Login flow uses the Meta app above, `INSTAGRAM_LOGIN_CONFIG_ID`, and `INSTAGRAM_OAUTH_REDIRECT_URI`. It requires an eligible professional account linked to a Page. This implementation connects the account only; it does not implement live-comment webhooks.
- Zoom: a user-managed OAuth application with `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, and `ZOOM_OAUTH_REDIRECT_URI`. Enable the user profile scope required for `/users/me`. Meeting publishing and chat retrieval remain unimplemented.
- LinkedIn: enable “Sign In with LinkedIn using OpenID Connect”; configure `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, and `LINKEDIN_OAUTH_REDIRECT_URI`. The provider requests `openid profile` for account connection.
- TikTok: enable Login Kit, `user.info.basic`, and applicable test-user/app-review access. Configure `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, and `TIKTOK_OAUTH_REDIRECT_URI`. Retain the existing domain verification variables if required by the developer console.
- X: enable OAuth 2.0 for a confidential Web App. Set `X_CLIENT_ID`, `X_CLIENT_SECRET`, and `X_OAUTH_REDIRECT_URI`. The provider uses S256 PKCE and `tweet.read users.read offline.access`, with `/2/users/me` for the account profile. It does not request broadcast, posting, messaging or email permissions.

Each redirect URI must exactly match the developer console entry: `https://YOUR_API_HOST/auth/PLATFORM/callback`. An accessible API host and credentials are necessary but do not prove that permissions, app review or account eligibility have been approved.

## Completing a connection

1. Sign into the real-server agent app using an existing account. Account registration is separate and requires the configured team invitation code.
2. Open Accounts. “Setup required” means app credentials are absent; “Ready to connect” only means those values are present.
3. Choose Connect account and complete the platform's login and consent screen.
4. Only a completed token exchange and saved account produces “Connected” with the returned account name.

Web opens a popup synchronously from the click and polls an authenticated, agent-scoped status endpoint. The callback page asks the user to return to Lifesycle; the app closes the popup when it sees the result. Mobile uses the `lifesyclelive://connect-callback` scheme registered in `app.json`; validate with a development build rather than assuming Expo Go supports the custom scheme.

OAuth states are opaque, bound to agent/platform, expire after ten minutes, and are consumed before token exchange. PKCE verifiers remain on the server. The pending-session store is in memory: a server restart invalidates pending connections, and multi-instance deployments require a shared expiring store. Persisted account tokens are unaffected by pending-session cleanup. Disconnect removes the local connection; users can additionally revoke consent in the platform settings.

## Verification

Run `npm run build` then `node --test tests/oauth.test.mjs` from `server/`, and `npx tsc --noEmit` from `app/`. Tests replace repositories and network calls; they do not authorize actual social accounts. Real consent, refresh and device behavior still require testing with the intended platform accounts.

Official references:

- [X authorization code and PKCE](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code)
- [LinkedIn OpenID Connect](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2)
- [Zoom authentication](https://developers.zoom.us/docs/api/authentication/)
- [TikTok Login Kit for Web](https://developers.tiktok.com/docs/en/login-kit-web)
- [Expo WebBrowser SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/webbrowser/)

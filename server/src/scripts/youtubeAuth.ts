import "dotenv/config";
import http from "node:http";
import { env } from "../env.js";
import { buildYoutubeAuthUrl, exchangeCodeForTokens } from "../services/youtubeOAuth.js";

/**
 * One-time helper: authorises the YouTube channel that Lifesycle broadcasts
 * are created on and prints a refresh token to paste into server/.env as
 * YOUTUBE_REFRESH_TOKEN.
 *
 *   1. Create an OAuth client (type: Web application) in Google Cloud Console
 *      -> APIs & Services -> Credentials. Enable the "YouTube Data API v3".
 *   2. Add the redirect URI below to that client's "Authorized redirect URIs".
 *   3. Put the client id/secret in server/.env, then: npm run youtube:auth
 *   4. Open the printed URL, pick the channel, approve. The token prints here.
 *
 * Stop the dev server first if it is using the same port.
 */
async function main() {
  if (!env.youtube.clientId || !env.youtube.clientSecret) {
    throw new Error("Set YOUTUBE_OAUTH_CLIENT_ID and YOUTUBE_OAUTH_CLIENT_SECRET in server/.env first.");
  }

  const redirect = new URL(env.youtube.oauthRedirectUri);
  const port = Number(redirect.port || 80);

  const code: string = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!req.url || !req.url.startsWith(redirect.pathname)) {
        res.writeHead(404).end();
        return;
      }
      const params = new URL(req.url, `http://${redirect.host}`).searchParams;
      const err = params.get("error");
      const authCode = params.get("code");
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        `<h2>${err ? `Authorisation failed: ${err}` : "Done — you can close this tab."}</h2>`,
      );
      server.close();
      if (err) reject(new Error(err));
      else if (authCode) resolve(authCode);
      else reject(new Error("No code in callback"));
    });
    server.listen(port, () => {
      console.log("\nOpen this URL in your browser, choose the channel, and approve:\n");
      console.log(buildYoutubeAuthUrl());
      console.log(`\nWaiting for the redirect to ${env.youtube.oauthRedirectUri} ...\n`);
    });
  });

  const tokens = await exchangeCodeForTokens(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "Google did not return a refresh_token. Revoke the app's access at " +
        "https://myaccount.google.com/permissions and run this again (prompt=consent is set).",
    );
  }

  console.log("\n✅ Add this line to server/.env:\n");
  console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

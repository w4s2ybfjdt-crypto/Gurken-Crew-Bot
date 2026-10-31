# GurkenCrew Bot

A Discord application running on **Cloudflare Workers**. It uses signed HTTP Interactions instead of a permanent Discord Gateway connection.

## Included

- Discord Ed25519 signature validation and timestamp checks
- `/ping` and `/info` slash commands
- Authenticated website notifications for order and support inquiries
- Health endpoint at `GET /`

## Important limitation

This is an event-driven Discord app, **not** a permanently connected Gateway bot. It can respond to slash commands and website HTTP requests, but it cannot receive Gateway-only events such as member joins, presence updates, or ordinary message-create events.

## 1. Discord Developer Portal

1. Open the GurkenCrew application in the Discord Developer Portal.
2. Under **General Information**, copy the **Application ID** and **Public Key**.
3. Under **Bot**, create or reset the bot token if required. Never commit or share this token.
4. Add the application to your server with the `applications.commands` scope. The bot needs permission to view and send messages in the channel used for website notifications.

## 2. Configure Cloudflare secrets

In Cloudflare Dashboard → **Workers & Pages** → `gurken-crew-bot` → **Settings** → **Variables and Secrets**, add:

| Name | Value |
|---|---|
| `DISCORD_PUBLIC_KEY` | Public Key from Discord General Information |
| `DISCORD_BOT_TOKEN` | Bot token (Secret) |
| `DISCORD_CHANNEL_ID` | ID of the channel for website notifications |
| `WEBSITE_WEBHOOK_SECRET` | A long, random shared secret (Secret) |

Use the **Secret** type for the bot token and webhook secret. The public key and channel ID are not passwords, but can also be stored as Worker variables.

Alternatively, use Wrangler from this repository:

```bash
npx wrangler secret put DISCORD_PUBLIC_KEY
npx wrangler secret put DISCORD_BOT_TOKEN
npx wrangler secret put DISCORD_CHANNEL_ID
npx wrangler secret put WEBSITE_WEBHOOK_SECRET
```

## 3. Deploy the Worker

```bash
npm install
npx wrangler login
npm run deploy
```

The Worker URL will look like:

`https://gurken-crew-bot.<your-subdomain>.workers.dev`

In Discord Developer Portal → **General Information**, set **Interactions Endpoint URL** to:

`https://gurken-crew-bot.<your-subdomain>.workers.dev/interactions`

Save it. Discord verifies the endpoint with a signed PING request.

## 4. Register slash commands

The repository includes `commands.json` and `scripts/register-commands.mjs`.

In PowerShell, from the project directory:

```powershell
$env:DISCORD_BOT_TOKEN="your-new-bot-token"
$env:DISCORD_APPLICATION_ID="your-application-id"
$env:DISCORD_GUILD_ID="your-server-id"
npm run register-commands
```

This registers the commands in one server for quick testing. Do not save these values in a committed file. Omit `DISCORD_GUILD_ID` if you want to register commands globally.

## 5. Website notifications

The website backend can send a POST request to:

`https://gurken-crew-bot.<your-subdomain>.workers.dev/api/website/notify`

Headers:

```
Authorization: Bearer <WEBSITE_WEBHOOK_SECRET>
Content-Type: application/json
```

Example order notification:

```json
{
  "type": "order",
  "reference": "GC-1001",
  "name": "Customer",
  "items": "CapCut Template Pack",
  "contact": "Discord: customer",
  "message": "Please contact me about this order."
}
```

Example support notification:

```json
{
  "type": "support",
  "reference": "SUP-1001",
  "name": "Customer",
  "subject": "Download help",
  "contact": "Discord: customer",
  "message": "I need help with my download."
}
```

The website must call this endpoint from its **server-side Worker/function**. Do not expose the shared secret in browser JavaScript or public HTML. The GurkenCrew website still needs a server-side integration before notifications will be delivered.

## Routes

- `GET /` — health response
- `POST /interactions` — signed Discord interactions
- `POST /api/website/notify` — authenticated website notification endpoint

## Security

- Never commit real tokens, keys, or shared secrets.
- If a token was ever pasted into a chat or committed, reset it in the Developer Portal.
- Use a long random webhook secret and keep it only in server-side settings.
- This starter does not process payments or confirm that an order has been paid.

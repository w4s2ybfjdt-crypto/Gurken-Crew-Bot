# GurkenCrew Bot

Cloudflare Worker-based Discord application using signed HTTP Interactions instead of a permanent Gateway connection.

## Features
- Discord Ed25519 request-signature verification
- `/ping` and `/info` slash commands
- Authenticated website notifications for order and support inquiries

## Limitation
This is event-driven and does not keep a permanent Discord Gateway connection. It cannot receive Gateway-only events such as member joins or presence updates.

## Setup overview
1. Create a Discord application in the Developer Portal.
2. Configure the Worker secrets: `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`, `DISCORD_CHANNEL_ID`, and `WEBSITE_WEBHOOK_SECRET`.
3. Deploy the Worker with Wrangler.
4. Set the Discord Interactions Endpoint URL to `https://YOUR-WORKER-DOMAIN/interactions`.
5. Register slash commands and configure the website backend to call `/api/website/notify` with the shared secret.

Never commit bot tokens or shared secrets. If a token was exposed, reset it in the Developer Portal.

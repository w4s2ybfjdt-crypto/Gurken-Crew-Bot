const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return json({ ok: true, service: "GurkenCrew Bot API", mode: "discord-interactions" });
    }

    if (request.method === "POST" && url.pathname === "/interactions") {
      return handleDiscordInteraction(request, env);
    }

    if (request.method === "POST" && url.pathname === "/api/website/notify") {
      return handleWebsiteNotification(request, env);
    }

    return json({ error: "Not found" }, 404);
  },
};

async function handleDiscordInteraction(request, env) {
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  const publicKey = env.DISCORD_PUBLIC_KEY;

  if (!signature || !timestamp || !publicKey) {
    return json({ error: "Missing Discord signature configuration" }, 401);
  }

  const numericTimestamp = Number(timestamp);
  if (!Number.isFinite(numericTimestamp) || Math.abs(Date.now() / 1000 - numericTimestamp) > 300) {
    return json({ error: "Expired request" }, 401);
  }

  const body = await request.text();
  const valid = await verifyDiscordRequest(publicKey, signature, timestamp, body);
  if (!valid) return json({ error: "Invalid request signature" }, 401);

  let interaction;
  try {
    interaction = JSON.parse(body);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  // Discord sends type 1 as a PING during endpoint verification.
  if (interaction.type === 1) return json({ type: 1 });

  if (interaction.type === 2) {
    const command = interaction.data?.name;

    if (command === "ping") {
      return json({
        type: 4,
        data: { content: "🥒 GurkenCrew Bot ist erreichbar!", flags: 64 },
      });
    }

    if (command === "info") {
      return json({
        type: 4,
        data: {
          content: "🥒 **GurkenCrew Bot**\nIch unterstütze die GurkenCrew-Website mit Bestell- und Support-Benachrichtigungen.",
          flags: 64,
        },
      });
    }

    return json({
      type: 4,
      data: { content: "Diesen Befehl kenne ich noch nicht.", flags: 64 },
    });
  }

  return json({ error: "Unsupported interaction type" }, 400);
}

async function handleWebsiteNotification(request, env) {
  if (!env.WEBSITE_WEBHOOK_SECRET || !env.DISCORD_BOT_TOKEN || !env.DISCORD_CHANNEL_ID) {
    return json({ error: "Notification secrets are not configured" }, 503);
  }

  const authorization = request.headers.get("authorization") || "";
  const suppliedSecret = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!constantTimeEqual(suppliedSecret, env.WEBSITE_WEBHOOK_SECRET)) {
    return json({ error: "Unauthorized" }, 401);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const type = payload.type;
  if (type !== "order" && type !== "support") {
    return json({ error: "type must be order or support" }, 400);
  }

  const title = type === "order" ? "🛒 Neue Website-Anfrage" : "💬 Neue Support-Anfrage";
  const fields = [];

  addField(fields, "Referenz", payload.reference);
  addField(fields, "Name", payload.name);
  addField(fields, type === "order" ? "Produkte" : "Thema", payload.subject || payload.items);
  addField(fields, "Kontakt", payload.contact);
  addField(fields, "Nachricht", payload.message);

  const discordResponse = await fetch(
    `https://discord.com/api/v10/channels/${encodeURIComponent(env.DISCORD_CHANNEL_ID)}/messages`,
    {
      method: "POST",
      headers: {
        authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        embeds: [{
          title,
          color: type === "order" ? 0x57b65f : 0x3498db,
          fields,
          footer: { text: "GurkenCrew • Website" },
          timestamp: new Date().toISOString(),
        }],
        allowed_mentions: { parse: [] },
      }),
    },
  );

  if (!discordResponse.ok) {
    return json({ error: "Discord API request failed", status: discordResponse.status }, 502);
  }

  return json({ ok: true });
}

function addField(fields, name, value) {
  if (value === undefined || value === null || value === "") return;
  const text = String(value).slice(0, 1000);
  fields.push({ name, value: text, inline: false });
}

async function verifyDiscordRequest(publicKeyHex, signatureHex, timestamp, body) {
  try {
    const keyBytes = hexToBytes(publicKeyHex);
    const signatureBytes = hexToBytes(signatureHex);
    const key = await crypto.subtle.importKey("raw", keyBytes, { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify(
      { name: "Ed25519" },
      key,
      signatureBytes,
      new TextEncoder().encode(timestamp + body),
    );
  } catch {
    return false;
  }
}

function hexToBytes(hex) {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) throw new Error("Invalid hex");
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

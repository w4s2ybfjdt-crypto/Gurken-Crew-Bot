import { readFile } from "node:fs/promises";

const token = process.env.DISCORD_BOT_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !applicationId) {
  console.error("Set DISCORD_BOT_TOKEN and DISCORD_APPLICATION_ID first.");
  process.exit(1);
}

const commands = JSON.parse(await readFile(new URL("../commands.json", import.meta.url), "utf8"));
const endpoint = guildId
  ? `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`
  : `https://discord.com/api/v10/applications/${applicationId}/commands`;

const response = await fetch(endpoint, {
  method: "PUT",
  headers: {
    authorization: `Bot ${token}`,
    "content-type": "application/json",
  },
  body: JSON.stringify(commands),
});

const result = await response.json();
if (!response.ok) {
  console.error("Discord command registration failed:", result);
  process.exit(1);
}

console.log(`Registered ${result.length} slash commands.`);

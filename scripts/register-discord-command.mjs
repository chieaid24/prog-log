#!/usr/bin/env node
// One-shot registration of the /log slash command (PRD 4.1). Run once per
// Discord application; re-running overwrites in place (PUT is idempotent).
//
//   node --env-file=.env.local scripts/register-discord-command.mjs
//
// Needs DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN (the token is used only
// here, never at runtime). After registering, paste the deployed
// https://<site>/api/discord URL into the Discord Developer Portal's
// "Interactions Endpoint URL" — Discord will PING it and expects PONG.

const STRING = 3; // option type

const commands = [
  {
    name: "log",
    description: "log a work entry",
    type: 1, // CHAT_INPUT
    options: [
      {
        name: "project",
        type: STRING,
        description: "project",
        required: true,
        autocomplete: true,
      },
      {
        name: "time",
        type: STRING,
        description: "time commitment",
        required: true,
        choices: [
          { name: "small", value: "small" },
          { name: "medium", value: "medium" },
          { name: "large", value: "large" },
        ],
      },
      {
        name: "milestone",
        type: STRING,
        description: "milestone (optional)",
        required: false,
      },
      {
        name: "description",
        type: STRING,
        description: "detail (optional)",
        required: false,
      },
    ],
  },
];

const appId = process.env.DISCORD_APPLICATION_ID;
const botToken = process.env.DISCORD_BOT_TOKEN;

const missing = [
  ...(appId ? [] : ["DISCORD_APPLICATION_ID"]),
  ...(botToken ? [] : ["DISCORD_BOT_TOKEN"]),
];
if (missing.length > 0) {
  console.error(`missing env vars: ${missing.join(", ")}`);
  console.error("hint: node --env-file=.env.local scripts/register-discord-command.mjs");
  process.exit(1);
}

const url = `https://discord.com/api/v10/applications/${appId}/commands`;
console.log(`PUT ${url}`);

const res = await fetch(url, {
  method: "PUT",
  headers: {
    authorization: `Bot ${botToken}`,
    "content-type": "application/json",
  },
  body: JSON.stringify(commands),
});

if (!res.ok) {
  console.error(`registration failed: ${res.status} ${res.statusText}`);
  console.error(await res.text());
  process.exit(1);
}

const registered = await res.json();
for (const command of registered) {
  console.log(`registered /${command.name} (id ${command.id})`);
}
console.log("done - set the Interactions Endpoint URL to <site>/api/discord in the developer portal.");

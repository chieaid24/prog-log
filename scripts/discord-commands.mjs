const CHAT_INPUT = 1;
const STRING = 3;
const GUILD_INSTALL = 0;
const USER_INSTALL = 1;
const GUILD = 0;
const BOT_DM = 1;
const PRIVATE_CHANNEL = 2;

const integrationTypes = [GUILD_INSTALL, USER_INSTALL];
const contexts = [GUILD, BOT_DM, PRIVATE_CHANNEL];

export const commands = [
  {
    name: "log",
    description: "log a work entry",
    type: CHAT_INPUT,
    integration_types: integrationTypes,
    contexts,
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
  {
    name: "reflect",
    description: "set the day's reflection",
    type: CHAT_INPUT,
    integration_types: integrationTypes,
    contexts,
    options: [
      {
        name: "reflection",
        type: STRING,
        description: "one line about the day",
        required: true,
      },
      {
        name: "date",
        type: STRING,
        description: "YYYY-MM-DD (optional, defaults to today)",
        required: false,
      },
    ],
  },
];

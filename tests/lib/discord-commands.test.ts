import { describe, expect, it } from "vitest";
import { commands } from "@/scripts/discord-commands.mjs";

describe("Discord command contexts", () => {
  it.each(commands)("registers /$name for user and guild installs", (command) => {
    expect(command.integration_types).toEqual([0, 1]);
  });

  it.each(commands)("registers /$name in guilds and every DM surface", (command) => {
    expect(command.contexts).toEqual([0, 1, 2]);
  });
});

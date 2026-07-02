// Ed25519 verification hardening (PRD 4.1): only a well-formed, valid
// signature over `timestamp + rawBody` passes; every malformed input fails
// closed. Uses a real tweetnacl keypair — no mocked crypto.
import nacl from "tweetnacl";
import { describe, expect, it } from "vitest";
import { hexToBytes, verifyDiscordSignature } from "@/lib/discord/verify";
import { noMatchMessage } from "@/lib/discord/owner";
import type { Project } from "@/lib/types";

const keyPair = nacl.sign.keyPair();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function sign(timestamp: string, body: string): string {
  return toHex(
    nacl.sign.detached(new TextEncoder().encode(timestamp + body), keyPair.secretKey),
  );
}

const PUBLIC_KEY = toHex(keyPair.publicKey);
const TS = "1720000000";
const BODY = JSON.stringify({ type: 1 });

describe("hexToBytes", () => {
  it("decodes well-formed hex", () => {
    expect(hexToBytes("00ff7a")).toEqual(new Uint8Array([0, 255, 122]));
  });

  it("rejects odd-length hex", () => {
    expect(hexToBytes("abc")).toBeNull();
  });

  it("rejects non-hex characters", () => {
    expect(hexToBytes("zz00")).toBeNull();
    expect(hexToBytes("12 4")).toBeNull();
  });
});

describe("verifyDiscordSignature", () => {
  it("accepts a valid signature over timestamp + body", () => {
    expect(verifyDiscordSignature(PUBLIC_KEY, sign(TS, BODY), TS, BODY)).toBe(true);
  });

  it("rejects a signature over a different body", () => {
    expect(verifyDiscordSignature(PUBLIC_KEY, sign(TS, BODY), TS, `${BODY} `)).toBe(false);
  });

  it("rejects a signature over a different timestamp", () => {
    expect(verifyDiscordSignature(PUBLIC_KEY, sign(TS, BODY), "1720000001", BODY)).toBe(false);
  });

  it("rejects malformed signature hex (odd length, non-hex, wrong size)", () => {
    expect(verifyDiscordSignature(PUBLIC_KEY, "abc", TS, BODY)).toBe(false);
    expect(verifyDiscordSignature(PUBLIC_KEY, "zz".repeat(64), TS, BODY)).toBe(false);
    expect(verifyDiscordSignature(PUBLIC_KEY, "ab".repeat(63), TS, BODY)).toBe(false);
  });

  it("rejects a malformed or wrong-size public key", () => {
    const sig = sign(TS, BODY);
    expect(verifyDiscordSignature("abc", sig, TS, BODY)).toBe(false);
    expect(verifyDiscordSignature("ab".repeat(31), sig, TS, BODY)).toBe(false);
  });
});

function project(name: string): Project {
  return {
    id: name.toLowerCase(),
    user_id: "u1",
    name,
    category: null,
    status: "active",
    color: "#7c8cf8",
    started: null,
    description: null,
    created_at: "2026-01-01T00:00:00Z",
  };
}

describe("noMatchMessage", () => {
  it("includes a did-you-mean hint when near matches exist", () => {
    expect(noMatchMessage("aim", [project("AI-M")])).toBe(
      'no single active project matches "aim". did you mean: AI-M?',
    );
  });

  it("omits the hint when nothing is close", () => {
    expect(noMatchMessage("xyz", [])).toBe('no single active project matches "xyz".');
  });
});

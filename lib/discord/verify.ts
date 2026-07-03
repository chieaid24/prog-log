// Ed25519 verification for Discord interaction webhooks (PRD 4.1). Discord
// signs `timestamp + rawBody` with the app's key; we verify against the
// app's public key before trusting a single byte of the payload.
import nacl from "tweetnacl";

/** Strict hex → bytes; null on odd length or non-hex characters. */
export function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * True only for a well-formed, valid Ed25519 signature over
 * `timestamp + rawBody`. Malformed hex, wrong key/signature sizes and
 * verification failures all return false — callers 401 on false.
 */
export function verifyDiscordSignature(
  publicKeyHex: string,
  signatureHex: string,
  timestamp: string,
  rawBody: string,
): boolean {
  const publicKey = hexToBytes(publicKeyHex);
  const signature = hexToBytes(signatureHex);
  if (!publicKey || publicKey.length !== 32 || !signature || signature.length !== 64) {
    return false;
  }
  try {
    return nacl.sign.detached.verify(
      new TextEncoder().encode(timestamp + rawBody),
      signature,
      publicKey,
    );
  } catch {
    return false;
  }
}

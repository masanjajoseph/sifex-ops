import { createSign, createVerify } from "crypto";

let privateKey: string | undefined;
let publicKey: string | undefined;

export function initTcraKeys(pvt: string, pub: string) {
  privateKey = pvt;
  publicKey = pub;
}

export function getPrivateKey(): string {
  if (!privateKey) throw new Error("TCRA private key not configured");
  return privateKey;
}

export function getPublicKey(): string {
  if (!publicKey) throw new Error("TCRA public key not configured");
  return publicKey;
}

export function signPayload(payload: string): string {
  const sign = createSign("SHA256");
  sign.update(payload);
  sign.end();
  return sign.sign(getPrivateKey(), "base64");
}

export function verifySignature(
  payload: string,
  signature: string,
  key?: string
): boolean {
  const verify = createVerify("SHA256");
  verify.update(payload);
  verify.end();
  return verify.verify(key ?? getPublicKey(), signature, "base64");
}

export function createAuthHeader(payload: string): string {
  return `Signature ${signPayload(payload)}`;
}

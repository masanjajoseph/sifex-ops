let privateKey: string | undefined;
let publicKey: string | undefined;

let _createSign: typeof import("crypto").createSign | null = null;
let _createVerify: typeof import("crypto").createVerify | null = null;

async function ensureCrypto() {
  if (!_createSign) {
    const mod = await import("crypto");
    _createSign = mod.createSign;
    _createVerify = mod.createVerify;
  }
}

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

export async function signPayload(payload: string): Promise<string> {
  await ensureCrypto();
  const sign = _createSign!("SHA256");
  sign.update(payload);
  sign.end();
  return sign.sign(getPrivateKey(), "base64");
}

export async function verifySignature(
  payload: string,
  signature: string,
  key?: string
): Promise<boolean> {
  await ensureCrypto();
  const verify = _createVerify!("SHA256");
  verify.update(payload);
  verify.end();
  return verify.verify(key ?? getPublicKey(), signature, "base64");
}

export async function createAuthHeader(payload: string): Promise<string> {
  const sig = await signPayload(payload);
  return `Signature ${sig}`;
}

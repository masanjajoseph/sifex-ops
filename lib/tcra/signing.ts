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
  // Support PEM pasted into .env with literal \n escapes.
  privateKey = pvt.includes("BEGIN") ? pvt.replace(/\\n/g, "\n") : pvt;
  publicKey = pub.includes("BEGIN") ? pub.replace(/\\n/g, "\n") : pub;
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

let _keyLoad: Promise<string> | null = null;

/** Resolve the private key from memory or from TCRA_KEY_PATH (PEM file). */
async function resolvePrivateKey(): Promise<string> {
  if (privateKey) return privateKey;
  const keyPath = process.env.TCRA_KEY_PATH;
  if (!keyPath) throw new Error("TCRA private key not configured");
  if (!_keyLoad) {
    _keyLoad = import("fs/promises").then((fs) => fs.readFile(keyPath, "utf8"));
  }
  privateKey = (await _keyLoad).trim();
  return privateKey;
}

/**
 * TCRA request signature: SHA1withRSA over the exact JSON body,
 * Base64-encoded (equivalent to Java Signature.getInstance("SHA1withRSA")).
 */
export async function signPayloadSha1(payload: string): Promise<string> {
  await ensureCrypto();
  const key = await resolvePrivateKey();
  const sign = _createSign!("RSA-SHA1");
  sign.update(payload);
  sign.end();
  return sign.sign(key, "base64");
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

/**
 * Local self-test: sign a fixed string with the configured key and verify it
 * with the public key from TCRA_CERT_PATH. Confirms key loading and RSA-SHA1.
 */
export async function selfTestSignature(): Promise<boolean> {
  try {
    await ensureCrypto();
    const data = "sifex-tcra-self-test";
    const sig = await signPayloadSha1(data);
    const certPath = process.env.TCRA_CERT_PATH;
    if (!certPath) return false;
    const fs = await import("fs/promises");
    const pem = await fs.readFile(certPath, "utf8");
    const { X509Certificate } = await import("crypto");
    const publicKey = new X509Certificate(pem).publicKey;
    const verify = _createVerify!("RSA-SHA1");
    verify.update(data);
    verify.end();
    return verify.verify(publicKey, sig, "base64");
  } catch {
    return false;
  }
}

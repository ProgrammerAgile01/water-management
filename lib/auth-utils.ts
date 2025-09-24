import crypto from "node:crypto";

export function randomToken(bytes = 48) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function getAppOrigin(req: Request) {
  // urutan fallback
  return (
    req.headers.get("origin") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    ""
  );
}

/**
 * Hash password pakai scrypt (aman & bawaan Node).
 * Format simpan: "scrypt:<N>:<r>:<p>:<salt-b64>:<hash-b64>"
 * Default N=16384, r=8, p=1, keylen=64
 */
export async function hashPassword(
  password: string,
  opts?: { N?: number; r?: number; p?: number; keylen?: number }
): Promise<string> {
  if (!password) throw new Error("Password kosong");
  const N = opts?.N ?? 16384;
  const r = opts?.r ?? 8;
  const p = opts?.p ?? 1;
  const keylen = opts?.keylen ?? 64;

  const salt = crypto.randomBytes(16);
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, { N, r, p }, (err, dk) =>
      err ? reject(err) : resolve(dk as Buffer)
    );
  });

  return `scrypt:${N}:${r}:${p}:${salt.toString(
    "base64"
  )}:${derivedKey.toString("base64")}`;
}

/**
 * Verifikasi password dengan record hash dari DB
 */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  try {
    const parts = stored.split(":");
    if (parts[0] !== "scrypt" || parts.length !== 6) return false;

    const N = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    const salt = Buffer.from(parts[4], "base64");
    const hash = Buffer.from(parts[5], "base64");
    const keylen = hash.length;

    const test = await new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt(password, salt, keylen, { N, r, p }, (err, dk) =>
        err ? reject(err) : resolve(dk as Buffer)
      );
    });

    // bandingkan secara constant-time
    return test.length === hash.length && crypto.timingSafeEqual(test, hash);
  } catch {
    return false;
  }
}

/** Deteksi bcrypt */
function isBcryptHash(s: string) {
  return /^\$2[aby]\$/.test(s);
}

/** Verifikasi password untuk hash apa pun (scrypt/bcrypt) */
export async function verifyPasswordAny(password: string, stored: string) {
  if (!stored) return false;

  // Hash baru: scrypt:<...>
  if (stored.startsWith("scrypt:")) {
    return verifyPassword(password, stored);
  }

  // Legacy: bcrypt
  if (isBcryptHash(stored)) {
    // gunakan bcryptjs (tanpa native deps)
    const { default: bcrypt } = await import("bcryptjs");
    try {
      return await bcrypt.compare(password, stored);
    } catch {
      return false;
    }
  }

  // format tak dikenal
  return false;
}

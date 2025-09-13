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

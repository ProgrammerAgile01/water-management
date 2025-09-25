import { callWaSender } from "../_utils";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = url.searchParams.get("limit") || "200";
  return callWaSender(`/logs?limit=${encodeURIComponent(limit)}`, { method: "GET" });
}

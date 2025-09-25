import { callWaSender } from "../_utils";
export const runtime = "nodejs";
export async function GET() {
  return callWaSender("/status", { method: "GET" });
}

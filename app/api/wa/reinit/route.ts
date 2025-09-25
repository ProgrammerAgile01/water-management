import { callWaSender } from "../_utils";
export const runtime = "nodejs";

export async function POST() {
  return callWaSender("/reinit", { method: "POST" });
}

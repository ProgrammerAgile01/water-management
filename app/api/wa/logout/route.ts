import { callWaSender } from "../_utils";
export const runtime = "nodejs";
export async function POST() {
  return callWaSender("/logout", { method: "POST" });
}

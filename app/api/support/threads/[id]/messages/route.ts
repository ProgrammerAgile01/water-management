// import { NextResponse } from "next/server";
// import { z } from "zod";
// import { prisma } from "@/lib/prisma";
// import { botAutoReplyFor, waLinkForAdminForward } from "../../../_bot";

// const PostMsg = z.object({
//   body: z.string().min(1).max(5000),
//   authorType: z.enum(["ME", "CS"]).default("ME"),
//   attachmentUrl: z.string().url().optional(),
// });

// export async function POST(
//   req: Request,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const data = PostMsg.parse(await req.json());

//     const item = await prisma.supportMessage.create({
//       data: {
//         threadId: params.id,
//         authorType: data.authorType,
//         body: data.body,
//         attachmentUrl: data.attachmentUrl,
//       },
//     });

//     await prisma.supportThread.update({
//       where: { id: params.id },
//       data: { updatedAt: new Date() },
//     });

//     // Auto reply
//     const autoText = await botAutoReplyFor(data.body, prisma);
//     let autoReply = null as any;
//     if (autoText) {
//       autoReply = await prisma.supportMessage.create({
//         data: { threadId: params.id, authorType: "CS", body: autoText },
//       });
//     }

//     const waLink = waLinkForAdminForward(
//       `[THREAD ${params.id}] ${data.authorType}: ${data.body}`
//     );
//     return NextResponse.json({ ok: true, item, autoReply, waLink });
//   } catch (err: any) {
//     console.error("[POST /api/support/threads/:id/messages]", err);
//     return NextResponse.json(
//       { ok: false, message: err?.message ?? "Internal error" },
//       { status: 500 }
//     );
//   }
// }

// app/api/support/threads/[id]/messages/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { botAutoReplyFor } from "@/app/api/support/_bot";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { body, authorType } = await req.json();

  const saved = await prisma.supportMessage.create({
    data: {
      threadId: params.id,
      authorType: authorType === "CS" ? "CS" : "ME",
      body: String(body || ""),
    },
  });
  await prisma.supportThread.update({
    where: { id: params.id },
    data: { updatedAt: new Date() },
  });

  // Auto-reply bot hanya jika pengirimnya ME (user)
  let autoReply = null;
  if (authorType !== "CS") {
    const bot = await botAutoReplyFor(String(body || ""), prisma);
    if (bot) {
      autoReply = await prisma.supportMessage.create({
        data: { threadId: params.id, authorType: "CS", body: bot },
      });
    }
  }

  return NextResponse.json({ ok: true, item: saved, autoReply });
}

// import { NextResponse } from "next/server";
// import { z } from "zod";
// import { prisma } from "@/lib/prisma";
// import { botAutoReplyFor, waLinkForAdminForward } from "../_bot";

// export async function GET(req: Request) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const q = (searchParams.get("q") || "").trim();
//     const status = searchParams.get("status") || undefined;

//     const items = await prisma.supportThread.findMany({
//       where: {
//         ...(status ? { status: status as any } : {}),
//         ...(q
//           ? {
//               OR: [
//                 { topic: { contains: q, mode: "insensitive" } },
//                 { createdByName: { contains: q, mode: "insensitive" } },
//               ],
//             }
//           : {}),
//       },
//       orderBy: { updatedAt: "desc" },
//       take: 100,
//       include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
//     });

//     return NextResponse.json({ ok: true, items });
//   } catch (err: any) {
//     console.error("[GET /api/support/threads] ", err);
//     return NextResponse.json(
//       { ok: false, items: [], message: err?.message ?? "Internal error" },
//       { status: 500 }
//     );
//   }
// }

// const CreateThread = z.object({
//   topic: z.string().max(200).optional(),
//   message: z.string().min(1).max(5000),
// });

// export async function POST(req: Request) {
//   try {
//     const { topic, message } = CreateThread.parse(await req.json());

//     const thread = await prisma.supportThread.create({
//       data: { topic, status: "OPEN" },
//     });

//     const first = await prisma.supportMessage.create({
//       data: { threadId: thread.id, authorType: "ME", body: message },
//     });

//     // Auto-reply dinamis
//     const autoText = await botAutoReplyFor(message, prisma);
//     let autoReply = null as any;
//     if (autoText) {
//       autoReply = await prisma.supportMessage.create({
//         data: { threadId: thread.id, authorType: "CS", body: autoText },
//       });
//     }

//     const waLink = waLinkForAdminForward(
//       `[THREAD BARU]\n${topic ?? "(Tanpa judul)"}\n\n${message}`
//     );
//     return NextResponse.json({
//       ok: true,
//       item: thread,
//       firstMessage: first,
//       autoReply,
//       waLink,
//     });
//   } catch (err: any) {
//     console.error("[POST /api/support/threads] ", err);
//     return NextResponse.json(
//       { ok: false, message: err?.message ?? "Internal error" },
//       { status: 500 }
//     );
//   }
// }

// app/api/support/threads/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { botAutoReplyFor } from "@/app/api/support/_bot";

export async function GET() {
  const items = await prisma.supportThread.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      topic: true,
      status: true,
      updatedAt: true,
      messages: {
        select: { id: true },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const { topic, message } = await req.json();

  const thread = await prisma.supportThread.create({
    data: {
      topic: topic || null,
      status: "OPEN",
      messages: {
        create: { body: String(message || ""), authorType: "ME" },
      },
    },
    include: { messages: true },
  });

  // auto-reply bot (opsional)
  const bot = await botAutoReplyFor(String(message || ""), prisma);
  let autoReply = null;
  if (bot) {
    const msg = await prisma.supportMessage.create({
      data: { threadId: thread.id, body: bot, authorType: "CS" },
    });
    autoReply = msg;
  }

  return NextResponse.json({ ok: true, item: thread, autoReply });
}

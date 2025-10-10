// app/admin/support/[id]/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AppHeader } from "@/components/app-header";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  CheckCircle2,
  PauseCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";

type Msg = {
  id: string;
  authorType: "ME" | "CS";
  body: string;
  createdAt: string;
};
type Thread = {
  id: string;
  topic: string | null;
  status: "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";
  messages: Msg[];
};

const ADMIN_WA = "6281234982153";

/** aman panggil .json() hanya bila content-type JSON */
async function safeJson(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  const text = await res.text();
  console.error(
    "[admin-support] non-json response:",
    res.status,
    text.slice(0, 300)
  );
  return null;
}

export default function AdminSupportDetail() {
  const params = useParams<{ id: string }>();
  const id = (params?.id as string) ?? "";

  const [data, setData] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const scRef = useRef<HTMLDivElement>(null);

  const scrollBottom = () =>
    setTimeout(() => scRef.current?.scrollIntoView({ behavior: "smooth" }), 10);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/support/threads/${id}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const json = await safeJson(res);
      setData(json?.item ?? null);
    } catch (e) {
      console.error("[admin-support] load error:", e);
      setData(null);
    } finally {
      setLoading(false);
      scrollBottom();
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function replyCS() {
    if (!body.trim() || !id) return;
    setSending(true);
    try {
      const res = await fetch(`/api/support/threads/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, authorType: "CS" }),
      });
      const json = await safeJson(res);
      if (json?.ok) {
        setData((p) =>
          p
            ? {
                ...p,
                messages: [
                  ...p.messages,
                  json.item as Msg,
                  ...(json.autoReply ? [json.autoReply as Msg] : []),
                ],
              }
            : p
        );
        // forward ke WA kalau disediakan dari API
        // if (json.waLink) window.open(json.waLink, "_blank");
        setBody("");
        scrollBottom();
      }
    } finally {
      setSending(false);
    }
  }

  async function setStatus(status: Thread["status"]) {
    if (!id) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/support/threads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await safeJson(res);
      if (json?.ok) setData((p) => (p ? { ...p, status } : p));
    } finally {
      setUpdating(false);
    }
  }

  const statusBadge = (s?: Thread["status"]) => {
    switch (s) {
      case "OPEN":
        return <Badge variant="secondary">OPEN</Badge>;
      case "PENDING":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
            PENDING
          </Badge>
        );
      case "RESOLVED":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            RESOLVED
          </Badge>
        );
      case "CLOSED":
        return (
          <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200">
            CLOSED
          </Badge>
        );
      default:
        return <Badge variant="secondary">-</Badge>;
    }
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-4">
        <AppHeader title={data?.topic ?? "Detail Obrolan"} />

        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              {statusBadge(data?.status)}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatus("OPEN")}
                disabled={updating}
              >
                <RefreshCw className="w-4 h-4 mr-1" /> Open
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatus("PENDING")}
                disabled={updating}
              >
                <PauseCircle className="w-4 h-4 mr-1" /> Pending
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatus("RESOLVED")}
                disabled={updating}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" /> Resolved
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatus("CLOSED")}
                disabled={updating}
              >
                <XCircle className="w-4 h-4 mr-1" /> Closed
              </Button>
            </div>
          </div>

          <div className="h-[60vh] overflow-y-auto bg-muted/10 rounded-md p-3">
            {loading ? (
              <div className="text-sm text-muted-foreground">Memuat…</div>
            ) : !data || data.messages.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Belum ada pesan.
              </div>
            ) : (
              data.messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[80%] p-3 rounded-2xl mb-3 ${
                    m.authorType === "ME"
                      ? "ml-auto bg-primary/15"
                      : "mr-auto bg-card/70"
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm">{m.body}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {new Date(m.createdAt).toLocaleString()}
                  </div>
                </div>
              ))
            )}
            <div ref={scRef} />
          </div>

          <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-start">
            <Textarea
              placeholder='Balas sebagai CS… (boleh gunakan "help", "piutang", "jadwal")'
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[80px] sm:flex-1"
            />
            <div className="flex gap-2">
              <Button
                asChild
                variant="outline"
                title="Hubungi Admin via WhatsApp"
              >
                <a
                  href={`https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(
                    `Halo Admin, tindak lanjuti tiket: ${data?.topic ?? id}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WA Admin
                </a>
              </Button>
              <Button onClick={replyCS} disabled={sending} className="gap-2">
                <Send className="w-4 h-4" /> {sending ? "Mengirim…" : "Kirim"}
              </Button>
            </div>
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}

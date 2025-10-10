"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AppHeader } from "@/components/app-header";
import { GlassCard } from "@/components/glass-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

type Message = {
  id: string;
  authorType: "ME" | "CS";
  body: string;
  createdAt: string;
};

type ThreadDetail = {
  id: string;
  topic: string | null;
  messages: Message[];
};

export default function SupportThreadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [topic, setTopic] = useState("(Tanpa judul)");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const scrollBottom = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  };

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/support/threads/${id}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const ct = r.headers.get("content-type") || "";
      if (!r.ok) {
        const txt = ct.includes("application/json")
          ? JSON.stringify(await r.json()).slice(0, 400)
          : (await r.text()).slice(0, 400);
        console.error("[thread detail] HTTP", r.status, txt);
        setTopic("(Tanpa judul)");
        setMessages([]);
        return;
      }
      if (ct.includes("application/json")) {
        const j = (await r.json()) as {
          ok: boolean;
          item: ThreadDetail | null;
        };
        if (j?.item) {
          setTopic(j.item.topic ?? "(Tanpa judul)");
          setMessages(j.item.messages ?? []);
        } else {
          setMessages([]);
        }
      } else {
        console.warn("[thread detail] unexpected content-type:", ct);
        setMessages([]);
      }
    } catch (e) {
      console.error("[thread detail] load error:", e);
      setMessages([]);
    } finally {
      setLoading(false);
      scrollBottom();
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  async function send() {
    if (!body.trim()) return;
    setSending(true);
    try {
      const r = await fetch(`/api/support/threads/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, authorType: "ME" }),
      });
      const ct = r.headers.get("content-type") || "";
      if (!r.ok) {
        console.error("[post msg] HTTP", r.status, await r.text());
        return;
      }
      const j = ct.includes("application/json") ? await r.json() : null;
      if (j?.item) {
        setMessages((p) => [...p, j.item]);
      }
      if (j?.autoReply) {
        setMessages((p) => [...p, j.autoReply]);
      }
      setBody("");
      scrollBottom();
    } finally {
      setSending(false);
    }
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6">
        <AppHeader title="Pusat Bantuan" showBreadcrumb />
        <GlassCard className="p-4">
          <div className="text-sm text-muted-foreground mb-2">
            Topik: <b className="text-foreground">{topic}</b>
          </div>

          <div
            ref={listRef}
            className="min-h-[50vh] max-h-[65vh] overflow-y-auto rounded-lg p-2 bg-muted/10"
          >
            {loading ? (
              <div className="p-4 text-sm text-muted-foreground">Memuat…</div>
            ) : messages.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                Belum ada pesan.
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${
                      m.authorType === "ME" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-xl text-sm shadow-sm ${
                        m.authorType === "ME"
                          ? "bg-primary text-primary-foreground rounded-br-none"
                          : "bg-card text-foreground border rounded-bl-none"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{m.body}</div>
                      <div className="text-[10px] opacity-70 mt-1">
                        {new Date(m.createdAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Input
              placeholder="Tulis pesan…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <Button onClick={send} disabled={sending} className="gap-2">
              <Send className="w-4 h-4" /> Kirim
            </Button>
          </div>
        </GlassCard>

        <div>
          <Button variant="outline" onClick={() => router.back()}>
            Kembali
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

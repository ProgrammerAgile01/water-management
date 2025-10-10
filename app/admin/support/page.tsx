// app/admin/support/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AppHeader } from "@/components/app-header";
import { GlassCard } from "@/components/glass-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { LifeBuoy, MessageSquare, RefreshCw } from "lucide-react";
import { useParams } from "next/navigation";

type Thread = {
  id: string;
  topic: string | null;
  status: "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";
  updatedAt: string;
  messages?: { body: string }[];
};

export default function AdminSupportIndex() {
  const [items, setItems] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  // ✅ gunakan "ALL" alih-alih string kosong
  const [status, setStatus] = useState<string>("ALL");

  const load = async () => {
    setLoading(true);
    const url = new URL("/api/support/threads", window.location.origin);
    if (q.trim()) url.searchParams.set("q", q.trim());
    // ✅ hanya kirim param kalau bukan ALL
    if (status !== "ALL") url.searchParams.set("status", status);
    const res = await fetch(url.toString());
    const json = await res.json();
    setItems(json?.items ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6">
        <AppHeader
          title="Pusat Bantuan - CS"
          icon={<LifeBuoy className="w-5 h-5" />}
        />

        <GlassCard className="p-6">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex gap-2">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari topik / nama..."
                className="bg-card/50 w-64"
              />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-44 bg-card/50">
                  <SelectValue placeholder="Semua status" />
                </SelectTrigger>
                <SelectContent>
                  {/* ✅ value harus non-empty */}
                  <SelectItem value="ALL">Semua status</SelectItem>
                  <SelectItem value="OPEN">OPEN</SelectItem>
                  <SelectItem value="PENDING">PENDING</SelectItem>
                  <SelectItem value="RESOLVED">RESOLVED</SelectItem>
                  <SelectItem value="CLOSED">CLOSED</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={load}
                variant="outline"
                className="gap-2 bg-card/50"
              >
                <RefreshCw className="w-4 h-4" /> Muat
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              Total: <b>{items.length}</b> thread
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/20">
                  <th className="text-left py-2 px-2">Topik</th>
                  <th className="text-left py-2 px-2 w-32">Status</th>
                  <th className="text-left py-2 px-2 w-56">Update Terakhir</th>
                  <th className="text-left py-2 px-2 w-24">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-muted-foreground">
                      Memuat…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-muted-foreground">
                      Tidak ada data
                    </td>
                  </tr>
                ) : (
                  items.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-border/10 hover:bg-muted/10"
                    >
                      <td className="py-2 px-2">
                        <div className="font-medium">
                          {t.topic ?? "(Tanpa judul)"}
                        </div>
                        {t.messages?.[0]?.body && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {t.messages[0].body}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        <Badge variant="secondary">{t.status}</Badge>
                      </td>
                      <td className="py-2 px-2">
                        {new Date(t.updatedAt).toLocaleString()}
                      </td>
                      <td className="py-2 px-2">
                        <Link href={`/admin/support/${t.id}`}>
                          <span className="inline-flex items-center gap-2 text-primary hover:underline">
                            <MessageSquare className="w-4 h-4" /> Buka
                          </span>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}

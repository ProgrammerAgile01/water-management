"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AppHeader } from "@/components/app-header";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { LifeBuoy, Send, MessageSquare, BookOpen, Video } from "lucide-react";

type Thread = {
  id: string;
  topic: string | null;
  status: "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";
  updatedAt: string;
  messages?: { body: string }[];
};

// ==== Ganti ID ini dengan YouTube video-mu
const YT_ID = "YOUTUBE_ID_LOGIN";

export default function SupportIndexPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/support/threads", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const ct = r.headers.get("content-type") || "";
      if (!r.ok) {
        const body = ct.includes("application/json")
          ? JSON.stringify(await r.json()).slice(0, 400)
          : (await r.text()).slice(0, 400);
        console.error("[threads] HTTP", r.status, body);
        setThreads([]);
        return;
      }
      if (ct.includes("application/json")) {
        const j = await r.json();
        setThreads(j?.items ?? []);
      } else {
        console.warn("[threads] unexpected content-type:", ct);
        setThreads([]);
      }
    } catch (e) {
      console.error("[threads] load error:", e);
      setThreads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // import useRouter from "next/navigation"
  const router = useRouter();

  async function submitTicket() {
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/support/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, message }),
      });
      const json = await res.json();
      if (json?.ok && json.item?.id) {
        // langsung buka halaman chat thread
        router.push(`/support/${json.item.id}`);
      }
      setMessage("");
      setTopic("");
    } finally {
      setSending(false);
    }
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-4">
        <AppHeader
          title="Pusat Bantuan"
          icon={<LifeBuoy className="w-5 h-5" />}
        />

        <GlassCard className="p-0">
          <Tabs defaultValue="guide" className="w-full">
            <div className="flex items-center justify-between px-4 pt-4">
              <TabsList className="bg-transparent">
                <TabsTrigger
                  value="guide"
                  className="data-[state=active]:bg-primary data-[state=active]:text-white"
                >
                  <BookOpen className="w-4 h-4 mr-2" /> Panduan
                </TabsTrigger>
                <TabsTrigger
                  value="chat"
                  className="data-[state=active]:bg-primary data-[state=active]:text-white"
                >
                  <MessageSquare className="w-4 h-4 mr-2" /> Obrolan
                </TabsTrigger>
              </TabsList>
            </div>

            {/* === TAB PANDUAN === */}
            <TabsContent value="guide" className="p-4 pt-2 space-y-6">
              {/* 1) Langkah Penggunaan (di atas seperti permintaan) */}
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Langkah Penggunaan Tirta Bening
                </h3>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="step1">
                    <AccordionTrigger>
                      1) Masuk Aplikasi (2 tahap login)
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed">
                      <ul className="list-decimal pl-5 space-y-1">
                        <li>
                          Login pertama menggunakan <b>akun_id</b> dan{" "}
                          <b>password</b>.
                        </li>
                        <li>
                          Setelah berhasil, login kedua sebagai <b>User</b>{" "}
                          (username & password).
                        </li>
                        <li>
                          Login <i>akun_id</i> hanya dilakukan sekali;
                          selanjutnya aplikasi otomatis masuk sebagai User.
                        </li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="step2">
                    <AccordionTrigger>2) Pengaturan Awal</AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed">
                      Atur di menu <b>Pengaturan</b>:
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>
                          <b>Tarif per m³</b> dan <b>Abonemen</b>
                        </li>
                        <li>
                          <b>Tanggal jadwal pencatatan</b> default
                        </li>
                        <li>
                          <b>Info Perusahaan</b> & <b>Info Pembayaran</b>
                        </li>
                        <li>
                          Tambahkan <b>User Petugas</b> (role PETUGAS)
                        </li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="step3">
                    <AccordionTrigger>
                      3) Aktifkan WhatsApp Admin
                    </AccordionTrigger>
                    <AccordionContent className="text-sm">
                      Buka <b>WhatsApp Setting</b> lalu lakukan <b>scan QR</b>.
                      Setelah tersambung, sistem akan dapat mengirim tagihan &
                      pengingat otomatis.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="step4">
                    <AccordionTrigger>
                      4) Isi Master Data (Tandon → Blok → Pelanggan)
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed">
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>
                          Masukkan <b>Tandon</b> terlebih dahulu.
                        </li>
                        <li>
                          Isi <b>Blok/Gang</b>, pilih <b>Petugas</b> penanggung
                          jawabnya.
                        </li>
                        <li>
                          Input <b>Pelanggan</b>: identitas, alamat, nomor WA,
                          dan <b>meter awal</b>. (Catatan: meter awal tidak bisa
                          diubah setelah masuk ke Catat Meter.)
                        </li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="step5">
                    <AccordionTrigger>
                      5) Generate Jadwal Pencatatan
                    </AccordionTrigger>
                    <AccordionContent className="text-sm">
                      Pilih <b>Periode</b> (mis. 2025-09), lalu klik{" "}
                      <b>Generate Jadwal</b>. Sistem otomatis membuat jadwal
                      catat meter per petugas.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="step6">
                    <AccordionTrigger>
                      6) Catat Meter, Finalisasi & Kirim Tagihan
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed">
                      Di menu <b>Catat Meter</b>:
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>
                          Klik <b>Catat Sekarang</b> dari jadwal, isi{" "}
                          <b>meter akhir</b>, lalu <b>Simpan</b>.
                        </li>
                        <li>
                          Jika sudah fix, klik <b>Finalisasi</b> (ikon kunci).
                          Sistem langsung membuat <b>Tagihan</b> dan mengirim{" "}
                          <b>WA</b> ke pelanggan.
                        </li>
                        <li>
                          Setelah finalisasi, data catat meter <b>terkunci</b>{" "}
                          dan tidak bisa diubah.
                        </li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="step7">
                    <AccordionTrigger>
                      7) Pembayaran & Kwitansi
                    </AccordionTrigger>
                    <AccordionContent className="text-sm">
                      Masuk ke <b>Tagihan</b> → <b>Input Pembayaran</b>. Setelah
                      bukti terverifikasi, sistem otomatis mengirim{" "}
                      <b>Kwitansi</b> via WA. Tersedia tombol <b>Kirim WA</b>{" "}
                      sebagai reminder.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </GlassCard>
              {/* 2) Video Tutorial (ditaruh bawah panduan lengkap) */}
              <GlassCard className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Video className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">
                    Panduan Lengkap (Video)
                  </h3>
                </div>
                <div className="w-full aspect-video rounded-xl overflow-hidden bg-black/50">
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${YT_ID}`}
                    title="Tutorial Penggunaan Tirta Bening"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  Video ringkas dari login hingga finalisasi & pembayaran.
                </p>
              </GlassCard>
            </TabsContent>

            {/* === TAB OBROLAN === */}
            <TabsContent value="chat" className="p-4 pt-2 space-y-6">
              <GlassCard className="p-6">
                {/* TABEL PERINTAH CEPAT (di atas form) */}
                <h3 className="text-lg font-semibold mb-3">Perintah Cepat</h3>
                <div className="overflow-x-auto mb-6">
                  <Table className="min-w-[520px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-36">Perintah</TableHead>
                        <TableHead>Keterangan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <code>help</code>
                        </TableCell>
                        <TableCell>Daftar perintah</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <code>piutang</code>
                        </TableCell>
                        <TableCell>Ringkasan piutang bulan berjalan</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <code>jadwal</code>
                        </TableCell>
                        <TableCell>Jadwal catat hari ini</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <code>tagihan &lt;kode&gt;</code>
                        </TableCell>
                        <TableCell>Link tagihan pelanggan</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <code>kwitansi &lt;kode&gt;</code>
                        </TableCell>
                        <TableCell>Link kwitansi terakhir</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <code>statuswa</code>
                        </TableCell>
                        <TableCell>Status koneksi WhatsApp</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* FORM OBROLAN BARU */}
                <h3 className="text-lg font-semibold mb-3">Obrolan Baru</h3>
                <div className="grid gap-3">
                  <Input
                    placeholder="Judul/topik (opsional)"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                  <Textarea
                    placeholder='Tulis pesan… (coba "help" atau "piutang")'
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[120px]"
                  />
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <Button
                      asChild
                      variant="outline"
                      className="sm:mr-auto"
                      title="Hubungi Admin via WhatsApp"
                    >
                      <a
                        href="https://wa.me/6281234982153?text=Halo%20Admin%20Tirta%20Bening"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Hubungi Admin (WA)
                      </a>
                    </Button>
                    <Button
                      onClick={submitTicket}
                      disabled={sending}
                      className="gap-2"
                    >
                      <Send className="w-4 h-4" />{" "}
                      {sending ? "Mengirim..." : "Kirim"}
                    </Button>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Obrolan Terbaru</h3>
                  <Button onClick={load} variant="outline" size="sm">
                    Muat Ulang
                  </Button>
                </div>

                {loading ? (
                  <div className="text-sm text-muted-foreground">Memuat...</div>
                ) : threads.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Belum ada obrolan.
                  </div>
                ) : (
                  <div className="divide-y divide-border/20">
                    {threads.map((t) => (
                      <Link
                        key={t.id}
                        href={`/support/${t.id}`}
                        className="flex items-center justify-between py-3 hover:bg-muted/10 rounded-md px-2"
                      >
                        <div className="flex items-center gap-3">
                          <MessageSquare className="w-4 h-4" />
                          <div>
                            <p className="font-medium">
                              {t.topic ?? "(Tanpa judul)"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(t.updatedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-muted/40">
                          {t.status}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </GlassCard>
            </TabsContent>
          </Tabs>
        </GlassCard>
      </div>
    </AppShell>
  );
}

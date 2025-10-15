// // app/admin/support/page.tsx
// "use client";

// import { useEffect, useState } from "react";
// import Link from "next/link";
// import { AppShell } from "@/components/app-shell";
// import { AppHeader } from "@/components/app-header";
// import { GlassCard } from "@/components/glass-card";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import {
//   Select,
//   SelectTrigger,
//   SelectContent,
//   SelectItem,
//   SelectValue,
// } from "@/components/ui/select";
// import { LifeBuoy, MessageSquare, RefreshCw } from "lucide-react";
// import { useParams } from "next/navigation";

// type Thread = {
//   id: string;
//   topic: string | null;
//   status: "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";
//   updatedAt: string;
//   messages?: { body: string }[];
// };

// export default function AdminSupportIndex() {
//   const [items, setItems] = useState<Thread[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [q, setQ] = useState("");
//   // ✅ gunakan "ALL" alih-alih string kosong
//   const [status, setStatus] = useState<string>("ALL");

//   const load = async () => {
//     setLoading(true);
//     const url = new URL("/api/support/threads", window.location.origin);
//     if (q.trim()) url.searchParams.set("q", q.trim());
//     // ✅ hanya kirim param kalau bukan ALL
//     if (status !== "ALL") url.searchParams.set("status", status);
//     const res = await fetch(url.toString());
//     const json = await res.json();
//     setItems(json?.items ?? []);
//     setLoading(false);
//   };

//   useEffect(() => {
//     load();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   return (
//     <AppShell>
//       <div className="max-w-7xl mx-auto space-y-6">
//         <AppHeader
//           title="Pusat Bantuan - CS"
//           icon={<LifeBuoy className="w-5 h-5" />}
//         />

//         <GlassCard className="p-6">
//           <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
//             <div className="flex gap-2">
//               <Input
//                 value={q}
//                 onChange={(e) => setQ(e.target.value)}
//                 placeholder="Cari topik / nama..."
//                 className="bg-card/50 w-64"
//               />
//               <Select value={status} onValueChange={setStatus}>
//                 <SelectTrigger className="w-44 bg-card/50">
//                   <SelectValue placeholder="Semua status" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {/* ✅ value harus non-empty */}
//                   <SelectItem value="ALL">Semua status</SelectItem>
//                   <SelectItem value="OPEN">OPEN</SelectItem>
//                   <SelectItem value="PENDING">PENDING</SelectItem>
//                   <SelectItem value="RESOLVED">RESOLVED</SelectItem>
//                   <SelectItem value="CLOSED">CLOSED</SelectItem>
//                 </SelectContent>
//               </Select>
//               <Button
//                 onClick={load}
//                 variant="outline"
//                 className="gap-2 bg-card/50"
//               >
//                 <RefreshCw className="w-4 h-4" /> Muat
//               </Button>
//             </div>

//             <div className="text-sm text-muted-foreground">
//               Total: <b>{items.length}</b> thread
//             </div>
//           </div>

//           <div className="mt-4 overflow-x-auto">
//             <table className="w-full text-sm">
//               <thead>
//                 <tr className="border-b border-border/20">
//                   <th className="text-left py-2 px-2">Topik</th>
//                   <th className="text-left py-2 px-2 w-32">Status</th>
//                   <th className="text-left py-2 px-2 w-56">Update Terakhir</th>
//                   <th className="text-left py-2 px-2 w-24">Aksi</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {loading ? (
//                   <tr>
//                     <td colSpan={4} className="py-4 text-muted-foreground">
//                       Memuat…
//                     </td>
//                   </tr>
//                 ) : items.length === 0 ? (
//                   <tr>
//                     <td colSpan={4} className="py-4 text-muted-foreground">
//                       Tidak ada data
//                     </td>
//                   </tr>
//                 ) : (
//                   items.map((t) => (
//                     <tr
//                       key={t.id}
//                       className="border-b border-border/10 hover:bg-muted/10"
//                     >
//                       <td className="py-2 px-2">
//                         <div className="font-medium">
//                           {t.topic ?? "(Tanpa judul)"}
//                         </div>
//                         {t.messages?.[0]?.body && (
//                           <div className="text-xs text-muted-foreground line-clamp-1">
//                             {t.messages[0].body}
//                           </div>
//                         )}
//                       </td>
//                       <td className="py-2 px-2">
//                         <Badge variant="secondary">{t.status}</Badge>
//                       </td>
//                       <td className="py-2 px-2">
//                         {new Date(t.updatedAt).toLocaleString()}
//                       </td>
//                       <td className="py-2 px-2">
//                         <Link href={`/admin/support/${t.id}`}>
//                           <span className="inline-flex items-center gap-2 text-primary hover:underline">
//                             <MessageSquare className="w-4 h-4" /> Buka
//                           </span>
//                         </Link>
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </GlassCard>
//       </div>
//     </AppShell>
//   );
// }

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
import { LifeBuoy, MessageSquare, RefreshCw, Info } from "lucide-react";

// ⬇️ Tooltip (desktop) + Dialog (mobile)
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Thread = {
  id: string;
  topic: string | null;
  status: "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";
  updatedAt: string;
  messages?: { body: string }[];
};

/* ========= Helper Tooltip: desktop=Tooltip, mobile=Dialog ========= */
function useIsMobileStrict() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return isMobile;
}

function InfoTip({
  ariaLabel,
  children,
  open,
  onOpenChange,
  className = "",
}: {
  ariaLabel: string;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  className?: string;
}) {
  const isMobile = useIsMobileStrict();

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          aria-label={ariaLabel}
          className={`inline-flex items-center justify-center rounded-full p-1.5 hover:bg-muted/50 ${className}`}
          onClick={() => onOpenChange?.(true)}
        >
          <Info className="h-4 w-4 opacity-70" />
        </button>
        <Dialog open={!!open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Info</DialogTitle>
            </DialogHeader>
            <div className="text-sm">{children}</div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            className={`inline-flex items-center justify-center rounded-full p-1.5 hover:bg-muted/50 ${className}`}
          >
            <Info className="h-4 w-4 opacity-70" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          sideOffset={10}
          collisionPadding={16}
          className="rounded-md break-words whitespace-normal leading-relaxed p-3 shadow-lg pointer-events-auto"
          style={{
            position: "fixed",
            zIndex: 2147483647,
            width: "min(92vw, 420px)",
          }}
        >
          <div className="text-sm">{children}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function AdminSupportIndex() {
  const [items, setItems] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("ALL");

  // state tooltip (mobile dialog)
  const [openTip, setOpenTip] = useState(false);

  const load = async () => {
    setLoading(true);
    const url = new URL("/api/support/threads", window.location.origin);
    if (q.trim()) url.searchParams.set("q", q.trim());
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
          // ⬇️ Tooltip ditempel di area judul
          titleExtra={
            <InfoTip
              ariaLabel="Apa fungsi halaman ini?"
              open={openTip}
              onOpenChange={setOpenTip}
            >
              Digunakan untuk membalas pesan chat dari CS.
            </InfoTip>
          }
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

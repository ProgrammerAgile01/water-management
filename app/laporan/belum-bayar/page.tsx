"use client";

import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { AppHeader } from "@/components/app-header";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useEffect, useMemo, useState } from "react";

type Bill = {
  id: string;
  name: string;
  amount: number;
  period: string;
  address: string;
  phone: string;
  dueDate: string;
  daysOverdue: number;
};

export default function BelumBayarPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  const year = useMemo(() => new Date().getFullYear(), []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/dashboard-laporan/belum-bayar?year=${year}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        setItems(data.items ?? []);
      } catch (e) {
        console.error(e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [year]);

  const filteredBills = items.filter(
    (bill) =>
      bill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.period.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getOverdueStatus = (days: number) => {
    if (days <= 7)
      return { label: "Baru Jatuh Tempo", variant: "secondary" as const };
    if (days <= 30)
      return { label: "Terlambat", variant: "destructive" as const };
    return { label: "Sangat Terlambat", variant: "destructive" as const };
  };

  const rupiah = (n: number) => "Rp " + Number(n || 0).toLocaleString("id-ID");

  return (
    <AuthGuard>
      <AppShell>
        <div className="max-w-7xl mx-auto space-y-6">
          <AppHeader
            title="Daftar Belum Bayar"
            breadcrumbs={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Laporan", href: "/dashboard" },
              { label: "Belum Bayar" },
            ]}
          />

          <GlassCard className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Daftar Lengkap Tagihan Belum Bayar
                </h2>
                <p className="text-muted-foreground">
                  {loading
                    ? "Memuat…"
                    : `Total: ${filteredBills.length} pelanggan`}
                </p>
              </div>
              <div className="w-full sm:w-auto">
                <Input
                  placeholder="Cari nama, alamat, atau periode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64"
                />
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                      Nama Pelanggan
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                      Alamat
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                      Periode
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                      Jumlah Tagihan
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                      Jatuh Tempo
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.map((bill) => {
                    const status = getOverdueStatus(bill.daysOverdue);
                    return (
                      <tr
                        key={bill.id}
                        className="border-b border-border/30 hover:bg-muted/20"
                      >
                        <td className="py-4 px-2">
                          <div>
                            <p className="font-medium text-foreground">
                              {bill.name}
                            </p>
                            {bill.phone && (
                              <p className="text-sm text-muted-foreground">
                                {bill.phone}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <p className="text-muted-foreground">
                            {bill.address}
                          </p>
                        </td>
                        <td className="py-4 px-2">
                          <p className="font-medium">{bill.period}</p>
                        </td>
                        <td className="py-4 px-2">
                          <p className="font-bold text-red-600">
                            {rupiah(bill.amount)}
                          </p>
                        </td>
                        <td className="py-4 px-2">
                          <p className="text-muted-foreground">
                            {bill.dueDate}
                          </p>
                          <p className="text-sm text-red-500">
                            {bill.daysOverdue} hari
                          </p>
                        </td>
                        <td className="py-4 px-2">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td className="py-4 px-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              window.open(
                                `https://wa.me/${(bill.phone || "").replace(
                                  /^0/,
                                  "62"
                                )}?text=Halo ${
                                  bill.name
                                }, tagihan air periode ${
                                  bill.period
                                } sebesar ${rupiah(
                                  bill.amount
                                )} belum dibayar. Mohon segera melakukan pembayaran.`,
                                "_blank"
                              )
                            }
                          >
                            WhatsApp
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {filteredBills.map((bill) => {
                const status = getOverdueStatus(bill.daysOverdue);
                return (
                  <div
                    key={bill.id}
                    className="p-4 bg-red-50/50 rounded-lg border border-red-100/50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-foreground">
                          {bill.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {bill.address}
                        </p>
                        {bill.phone && (
                          <p className="text-sm text-muted-foreground">
                            {bill.phone}
                          </p>
                        )}
                      </div>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <p className="text-muted-foreground">Periode:</p>
                        <p className="font-medium">{bill.period}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tagihan:</p>
                        <p className="font-bold text-red-600">
                          {rupiah(bill.amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Jatuh Tempo:</p>
                        <p className="font-medium">{bill.dueDate}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Terlambat:</p>
                        <p className="font-medium text-red-500">
                          {bill.daysOverdue} hari
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full bg-transparent"
                      onClick={() =>
                        window.open(
                          `https://wa.me/${(bill.phone || "").replace(
                            /^0/,
                            "62"
                          )}?text=Halo ${bill.name}, tagihan air periode ${
                            bill.period
                          } sebesar ${rupiah(
                            bill.amount
                          )} belum dibayar. Mohon segera melakukan pembayaran.`,
                          "_blank"
                        )
                      }
                    >
                      Kirim WhatsApp
                    </Button>
                  </div>
                );
              })}
            </div>

            {!loading && filteredBills.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Tidak ada data yang ditemukan
                </p>
              </div>
            )}
          </GlassCard>
        </div>
      </AppShell>
    </AuthGuard>
  );
}

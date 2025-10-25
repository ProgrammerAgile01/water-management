"use client";

import React from "react";
import useSWR from "swr";
import { GlassCard } from "./glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface Customer {
    id: string;
    nama: string;
    kodeCustomer: string;
    noWA: string;
    alamat: string;
    meterAwal: number;
    status: "aktif" | "nonaktif";
}

interface UsageHistory {
    id: string;
    periode: string | null; // prefer YYYY-MM from CatatPeriode
    meterAwal: number | null;
    meterAkhir: number | null;
    jmlPakai: number | null;
    tarifPerM3: number | null;
    abonemen: number | null;
    denda: number | null;
    total: number | null;
    statusBayar: string | null;
    tanggalBayar?: string | null;
    keterangan?: string | null;
    notaUrl?: string | null;
}

interface Props {
    customer: Customer;
    onClose: () => void;
}

const fetcher = (url: string) =>
    fetch(url).then(async (r) => {
        if (!r.ok) throw new Error(await r.text().catch(() => r.statusText));
        return r.json();
    });

const getStatusBadge = (status: string | null) => {
    switch ((status || "").toLowerCase()) {
        case "lunas":
        case "paid":
            return <Badge className="bg-teal-100 text-teal-800">Lunas</Badge>;
        case "belum":
        case "unpaid":
            return <Badge variant="destructive">Belum Bayar</Badge>;
        case "sebagian":
        case "partial":
            return <Badge variant="secondary">Sebagian</Badge>;
        default:
            return <Badge variant="outline">{status ?? "Unknown"}</Badge>;
    }
};

function formatPeriodeLabel(p?: string | null) {
    if (!p) return "-";
    const m = p.match(/^(\d{4})-(\d{2})$/);
    if (m) {
        const year = Number(m[1]);
        const month = Number(m[2]) - 1;
        return new Intl.DateTimeFormat("id-ID", {
            month: "long",
            year: "numeric",
        }).format(new Date(Date.UTC(year, month, 1)));
    }
    return p;
}

function formatRupiah(n?: number | null) {
    if (typeof n !== "number") return "-";
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(n);
}

export function CustomerHistoryModal({ customer, onClose }: Props) {
    const pageSize = 50;
    const apiUrl = `/api/pelanggan/history?pelangganId=${encodeURIComponent(
        customer.id
    )}&page=1&pageSize=${pageSize}`;

    const { data, error } = useSWR<{ ok: boolean; items: UsageHistory[] }>(
        apiUrl,
        fetcher,
        { revalidateOnFocus: false }
    );

    const items = data?.items ?? [];

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-teal-900/40 via-cyan-900/30 to-blue-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="w-full max-w-6xl h-[90vh] overflow-y-auto">
                <GlassCard className="p-6 bg-gradient-to-br from-teal-50/90 via-cyan-50/80 to-blue-50/90 backdrop-blur-md border-2 border-teal-200/30 shadow-2xl">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-teal-900">
                                {customer.nama}
                            </h2>
                            <p className="text-teal-700">
                                Kode: {customer.kodeCustomer}
                            </p>
                            <p className="text-sm text-teal-600 mt-1">
                                {customer.alamat}
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onClose}
                            className="bg-teal-50/50 border-teal-200 hover:bg-teal-100/70 text-teal-700"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Customer Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-teal-50/30 rounded-lg border border-teal-200/20">
                        <div>
                            <p className="text-sm text-teal-600">
                                No. WhatsApp
                            </p>
                            <p className="font-medium text-teal-900">
                                {customer.noWA}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-teal-600">Meter Awal</p>
                            <p className="font-medium text-teal-900">
                                {customer.meterAwal}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-teal-600">Status</p>
                            <div className="mt-1">
                                {customer.status === "aktif" ? (
                                    <Badge className="bg-teal-100 text-teal-800">
                                        Aktif
                                    </Badge>
                                ) : (
                                    <Badge className="bg-gray-100 text-gray-700">
                                        Non-aktif
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Error / Loading */}
                    {error && (
                        <div className="p-4 text-sm text-destructive">
                            Gagal memuat histori: {(error as Error).message}
                        </div>
                    )}

                    {/* Desktop */}
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full">
                            <thead className="sticky top-0 bg-teal-50/90">
                                <tr className="border-b border-teal-200/30">
                                    <th className="text-left py-3 px-2 text-sm font-medium text-teal-700">
                                        Periode
                                    </th>
                                    <th className="text-center py-3 px-2 text-sm font-medium text-teal-700">
                                        Meter Awal
                                    </th>
                                    <th className="text-center py-3 px-2 text-sm font-medium text-teal-700">
                                        Meter Akhir
                                    </th>
                                    <th className="text-center py-3 px-2 text-sm font-medium text-teal-700">
                                        Jml Pakai
                                    </th>
                                    <th className="text-right py-3 px-2 text-sm font-medium text-teal-700">
                                        Tarif/m³
                                    </th>
                                    <th className="text-right py-3 px-2 text-sm font-medium text-teal-700">
                                        Abonemen
                                    </th>
                                    <th className="text-right py-3 px-2 text-sm font-medium text-teal-700">
                                        Denda
                                    </th>
                                    <th className="text-right py-3 px-2 text-sm font-medium text-teal-700">
                                        Total
                                    </th>
                                    <th className="text-center py-3 px-2 text-sm font-medium text-teal-700">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className="py-6 px-2 text-center text-sm text-muted-foreground"
                                        >
                                            Belum ada histori.
                                        </td>
                                    </tr>
                                )}
                                {items.map((h) => (
                                    <tr
                                        key={h.id}
                                        className="border-b border-teal-200/20 hover:bg-teal-50/30"
                                    >
                                        <td className="py-3 px-2 text-sm font-medium text-teal-900">
                                            {formatPeriodeLabel(h.periode)}
                                        </td>
                                        <td className="py-3 px-2 text-sm text-center text-teal-800">
                                            {h.meterAwal ?? "-"}
                                        </td>
                                        <td className="py-3 px-2 text-sm text-center text-teal-800">
                                            {h.meterAkhir ?? "-"}
                                        </td>
                                        <td className="py-3 px-2 text-sm text-center font-medium text-teal-600">
                                            {h.jmlPakai ?? "-"} m³
                                        </td>
                                        <td className="py-3 px-2 text-sm text-right text-teal-800">
                                            {formatRupiah(h.tarifPerM3)}
                                        </td>
                                        <td className="py-3 px-2 text-sm text-right text-teal-800">
                                            {formatRupiah(h.abonemen)}
                                        </td>
                                        <td className="py-3 px-2 text-sm text-right text-teal-800">
                                            {h.denda && h.denda > 0
                                                ? formatRupiah(h.denda)
                                                : "-"}
                                        </td>
                                        <td className="py-3 px-2 text-sm text-right font-bold text-teal-900">
                                            {formatRupiah(h.total)}
                                        </td>
                                        <td className="py-3 px-2 text-center">
                                            {getStatusBadge(h.statusBayar)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile */}
                    <div className="lg:hidden space-y-4">
                        {items.length === 0 && (
                            <div className="p-4 text-center text-sm text-muted-foreground bg-muted/20 rounded-lg">
                                Belum ada histori.
                            </div>
                        )}
                        {items.map((history) => (
                            <div
                                key={history.id}
                                className="p-4 bg-teal-50/30 rounded-lg border border-teal-200/20 space-y-3"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-medium text-teal-900">
                                            {formatPeriodeLabel(
                                                history.periode
                                            )}
                                        </p>
                                        <p className="text-sm text-teal-600 font-medium">
                                            {history.jmlPakai ?? "-"} m³
                                        </p>
                                    </div>
                                    {getStatusBadge(history.statusBayar)}
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-teal-600">
                                            Meter:
                                        </span>{" "}
                                        <span className="text-teal-800">
                                            {history.meterAwal ?? "-"} →{" "}
                                            {history.meterAkhir ?? "-"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-teal-600">
                                            Tarif:
                                        </span>{" "}
                                        <span className="text-teal-800">
                                            {formatRupiah(history.tarifPerM3)}
                                            /m³
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-teal-600">
                                            Abonemen:
                                        </span>{" "}
                                        <span className="text-teal-800">
                                            {formatRupiah(history.abonemen)}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-teal-600">
                                            Denda:
                                        </span>{" "}
                                        <span className="text-teal-800">
                                            {history.denda && history.denda > 0
                                                ? formatRupiah(history.denda)
                                                : "-"}
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-teal-200/30">
                                    <p className="font-bold text-teal-900">
                                        Total: {formatRupiah(history.total)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end mt-6 pt-4 border-t border-teal-200/30">
                        <Button
                            onClick={onClose}
                            className="px-8 bg-teal-600 hover:bg-teal-700 text-white"
                        >
                            Tutup
                        </Button>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}

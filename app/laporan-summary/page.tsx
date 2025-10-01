// "use client";

// import { useEffect } from "react";
// import { AppHeader } from "@/components/app-header";
// import { AuthGuard } from "@/components/auth-guard";
// import { AppShell } from "@/components/app-shell";
// import { GlassCard } from "@/components/glass-card";
// import { useDashboardStore } from "@/lib/dashboard-store";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import {
//   LineChart,
//   Line,
//   BarChart,
//   Bar,
//   Cell,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   ResponsiveContainer,
//   Legend,
// } from "recharts";
// import { X } from "lucide-react";

// export default function DashboardLaporanPage() {
//   const {
//     selectedYear,
//     zoneNames,
//     waterUsageData,
//     revenueData,
//     expenseData,
//     profitLossData,
//     unpaidBills,
//     setSelectedYear,
//   } = useDashboardStore();

//   useEffect(() => {
//     // auto-load tahun aktif saat pertama render
//     useDashboardStore.getState().getDataByYear();
//   }, []);

//   const formatCurrency = (value: number) =>
//     `Rp ${(value / 1_000_000).toFixed(1)}M`;
//   const formatUsage = (value: number) => `${value} m³`;

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 pb-24">
//       <AuthGuard>
//         <AppShell>
//           <AppHeader title="Dashboard Laporan" />

//           <div className="container mx-auto px-4 space-y-6">
//             <GlassCard className="p-4">
//               <div className="flex items-center gap-4">
//                 <label className="text-sm font-medium text-foreground">
//                   Tahun:
//                 </label>
//                 <Select
//                   value={selectedYear.toString()}
//                   onValueChange={(value) => {
//                     const y = Number.parseInt(value);
//                     setSelectedYear(y);
//                   }}
//                 >
//                   <SelectTrigger className="w-32">
//                     <SelectValue />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="2023">2023</SelectItem>
//                     <SelectItem value="2024">2024</SelectItem>
//                     <SelectItem value="2025">2025</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>
//             </GlassCard>

//             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//               {/* Water Usage Chart (6 zona) */}
//               <GlassCard className="p-6">
//                 <h3 className="text-lg font-semibold text-foreground mb-4">
//                   📈 Grafik Pemakaian Air
//                 </h3>
//                 <ResponsiveContainer width="100%" height={300}>
//                   <LineChart data={waterUsageData}>
//                     <CartesianGrid
//                       strokeDasharray="3 3"
//                       stroke="rgba(0, 150, 136, 0.1)"
//                     />
//                     <XAxis
//                       dataKey="month"
//                       stroke="rgba(0, 77, 64, 0.7)"
//                       fontSize={12}
//                     />
//                     <YAxis stroke="rgba(0, 77, 64, 0.7)" fontSize={12} />
//                     <Tooltip
//                       contentStyle={{
//                         backgroundColor: "rgba(255, 255, 255, 0.9)",
//                         border: "1px solid rgba(0, 150, 136, 0.2)",
//                         borderRadius: "8px",
//                         backdropFilter: "blur(10px)",
//                       }}
//                       formatter={(value, name) => [
//                         formatUsage(Number(value)),
//                         name,
//                       ]}
//                     />
//                     <Legend />
//                     <Line
//                       type="monotone"
//                       dataKey="total"
//                       stroke="#009688"
//                       strokeWidth={3}
//                       name="Total"
//                       dot={{ fill: "#009688", strokeWidth: 2, r: 4 }}
//                     />
//                     <Line
//                       type="monotone"
//                       dataKey="blokA"
//                       stroke="#4CAF50"
//                       strokeWidth={2}
//                       name={zoneNames[0] ?? "Blok A"}
//                       dot={{ fill: "#4CAF50", strokeWidth: 2, r: 3 }}
//                     />
//                     <Line
//                       type="monotone"
//                       dataKey="blokB"
//                       stroke="#FF9800"
//                       strokeWidth={2}
//                       name={zoneNames[1] ?? "Blok B"}
//                       dot={{ fill: "#FF9800", strokeWidth: 2, r: 3 }}
//                     />
//                     <Line
//                       type="monotone"
//                       dataKey="blokC"
//                       stroke="#2196F3"
//                       strokeWidth={2}
//                       name={zoneNames[2] ?? "Blok C"}
//                       dot={{ fill: "#2196F3", strokeWidth: 2, r: 3 }}
//                     />
//                     <Line
//                       type="monotone"
//                       dataKey="blokD"
//                       stroke="#9C27B0"
//                       strokeWidth={2}
//                       name={zoneNames[3] ?? "Blok D"}
//                       dot={{ fill: "#9C27B0", strokeWidth: 2, r: 3 }}
//                     />
//                     <Line
//                       type="monotone"
//                       dataKey="blokE"
//                       stroke="#795548"
//                       strokeWidth={2}
//                       name={zoneNames[4] ?? "Blok E"}
//                       dot={{ fill: "#795548", strokeWidth: 2, r: 3 }}
//                     />
//                     <Line
//                       type="monotone"
//                       dataKey="blokF"
//                       stroke="#607D8B"
//                       strokeWidth={2}
//                       name={zoneNames[5] ?? "Blok F"}
//                       dot={{ fill: "#607D8B", strokeWidth: 2, r: 3 }}
//                     />
//                   </LineChart>
//                 </ResponsiveContainer>
//               </GlassCard>

//               {/* Revenue */}
//               <GlassCard className="p-6">
//                 <h3 className="text-lg font-semibold text-foreground mb-4">
//                   💰 Grafik Pendapatan
//                 </h3>
//                 <ResponsiveContainer width="100%" height={300}>
//                   <BarChart data={revenueData}>
//                     <CartesianGrid
//                       strokeDasharray="3 3"
//                       stroke="rgba(0, 150, 136, 0.1)"
//                     />
//                     <XAxis
//                       dataKey="month"
//                       stroke="rgba(0, 77, 64, 0.7)"
//                       fontSize={12}
//                     />
//                     <YAxis
//                       stroke="rgba(0, 77, 64, 0.7)"
//                       fontSize={12}
//                       tickFormatter={formatCurrency}
//                     />
//                     <Tooltip
//                       contentStyle={{
//                         backgroundColor: "rgba(255, 255, 255, 0.9)",
//                         border: "1px solid rgba(0, 150, 136, 0.2)",
//                         borderRadius: "8px",
//                         backdropFilter: "blur(10px)",
//                       }}
//                       formatter={(value) => [
//                         `Rp ${Number(value).toLocaleString("id-ID")}`,
//                         "Pendapatan",
//                       ]}
//                     />
//                     <Legend />
//                     <Bar
//                       dataKey="amount"
//                       fill="#009688"
//                       radius={[4, 4, 0, 0]}
//                       name="Pendapatan Bulanan"
//                     />
//                   </BarChart>
//                 </ResponsiveContainer>
//               </GlassCard>
//             </div>

//             <GlassCard className="p-6">
//               <h3 className="text-lg font-semibold text-foreground mb-4">
//                 📊 Grafik Pengeluaran Per Bulan
//               </h3>
//               <ResponsiveContainer width="100%" height={300}>
//                 <LineChart data={expenseData}>
//                   <CartesianGrid
//                     strokeDasharray="3 3"
//                     stroke="rgba(0, 150, 136, 0.1)"
//                   />
//                   <XAxis
//                     dataKey="month"
//                     stroke="rgba(0, 77, 64, 0.7)"
//                     fontSize={12}
//                   />
//                   <YAxis
//                     stroke="rgba(0, 77, 64, 0.7)"
//                     fontSize={12}
//                     tickFormatter={formatCurrency}
//                   />
//                   <Tooltip
//                     contentStyle={{
//                       backgroundColor: "rgba(255, 255, 255, 0.9)",
//                       border: "1px solid rgba(0, 150, 136, 0.2)",
//                       borderRadius: "8px",
//                       backdropFilter: "blur(10px)",
//                     }}
//                     formatter={(value) => [
//                       `Rp ${Number(value).toLocaleString("id-ID")}`,
//                       "",
//                     ]}
//                   />
//                   <Legend />
//                   <Line
//                     type="monotone"
//                     dataKey="operasional"
//                     stroke="#FF5722"
//                     strokeWidth={3}
//                     name="Pengeluaran Operasional"
//                     dot={{ fill: "#FF5722", strokeWidth: 2, r: 4 }}
//                   />
//                   <Line
//                     type="monotone"
//                     dataKey="lainnya"
//                     stroke="#9C27B0"
//                     strokeWidth={3}
//                     name="Pengeluaran Lain"
//                     dot={{ fill: "#9C27B0", strokeWidth: 2, r: 4 }}
//                   />
//                 </LineChart>
//               </ResponsiveContainer>
//             </GlassCard>

//             <GlassCard className="p-6">
//               <h3 className="text-lg font-semibold text-foreground mb-4">
//                 📊 Grafik Laba Rugi
//               </h3>
//               <ResponsiveContainer width="100%" height={300}>
//                 <BarChart data={profitLossData}>
//                   <CartesianGrid
//                     strokeDasharray="3 3"
//                     stroke="rgba(0, 150, 136, 0.1)"
//                   />
//                   <XAxis
//                     dataKey="month"
//                     stroke="rgba(0, 77, 64, 0.7)"
//                     fontSize={12}
//                   />
//                   <YAxis
//                     stroke="rgba(0, 77, 64, 0.7)"
//                     fontSize={12}
//                     tickFormatter={formatCurrency}
//                   />
//                   <Tooltip
//                     contentStyle={{
//                       backgroundColor: "rgba(255, 255, 255, 0.9)",
//                       border: "1px solid rgba(0, 150, 136, 0.2)",
//                       borderRadius: "8px",
//                       backdropFilter: "blur(10px)",
//                     }}
//                     formatter={(value) => [
//                       `Rp ${Number(value).toLocaleString("id-ID")}`,
//                       Number(value) >= 0 ? "Laba" : "Rugi",
//                     ]}
//                   />
//                   <Bar dataKey="profit" radius={[4, 4, 0, 0]} name="Laba/Rugi">
//                     {profitLossData.map((entry, index) => (
//                       <Cell
//                         key={`cell-${index}`}
//                         fill={entry.profit >= 0 ? "#4CAF50" : "#F44336"}
//                       />
//                     ))}
//                   </Bar>
//                 </BarChart>
//               </ResponsiveContainer>
//             </GlassCard>

//             <GlassCard className="p-6">
//               <h3 className="text-lg font-semibold text-foreground mb-4">
//                 Tabel Tagihan Belum Lunas
//               </h3>

//               {/* Desktop Table */}
//               <div className="hidden md:block overflow-x-auto">
//                 <table className="w-full">
//                   <thead>
//                     <tr className="border-b border-gray-200">
//                       <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">
//                         No
//                       </th>
//                       <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">
//                         Nama Warga
//                       </th>
//                       <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">
//                         Blok/Zona
//                       </th>
//                       <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">
//                         Periode
//                       </th>
//                       <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">
//                         Nominal
//                       </th>
//                       <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">
//                         Status
//                       </th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {unpaidBills.map((bill, index) => (
//                       <tr
//                         key={bill.id}
//                         className="border-b border-gray-100 hover:bg-gray-50/50"
//                       >
//                         <td className="py-3 px-4 text-sm">{index + 1}</td>
//                         <td className="py-3 px-4 text-sm">{bill.nama}</td>
//                         <td className="py-3 px-4 text-sm">{bill.blok}</td>
//                         <td className="py-3 px-4 text-sm">{bill.periode}</td>
//                         <td className="py-3 px-4 text-sm">
//                           Rp {bill.nominal.toLocaleString("id-ID")}
//                         </td>
//                         <td className="py-3 px-4 text-sm">
//                           <X className="h-4 w-4 text-red-500" />
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>

//               {/* Mobile Card List */}
//               <div className="md:hidden space-y-3">
//                 {unpaidBills.map((bill) => (
//                   <div
//                     key={bill.id}
//                     className="bg-white/50 rounded-lg p-4 border border-gray-200"
//                   >
//                     <div className="flex justify-between items-start mb-2">
//                       <div>
//                         <p className="font-medium text-sm">{bill.nama}</p>
//                         <p className="text-xs text-gray-600">{bill.blok}</p>
//                       </div>
//                       <X className="h-4 w-4 text-red-500 mt-1" />
//                     </div>
//                     <div className="flex justify-between items-center text-xs text-gray-600">
//                       <span>{bill.periode}</span>
//                       <span className="font-medium text-foreground">
//                         Rp {bill.nominal.toLocaleString("id-ID")}
//                       </span>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </GlassCard>
//           </div>
//         </AppShell>
//       </AuthGuard>
//     </div>
//   );
// }

"use client";

import { useEffect } from "react";
import { AppHeader } from "@/components/app-header";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { useDashboardStore } from "@/lib/dashboard-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function DashboardLaporanPage() {
  const {
    selectedYear,
    zoneNames,
    waterUsageData,
    revenueData,
    expenseData,
    profitLossData,
    unpaidBills,
    setSelectedYear,
  } = useDashboardStore();

  useEffect(() => {
    // auto-load tahun aktif saat pertama render
    useDashboardStore.getState().getDataByYear();
  }, []);

  const formatCurrency = (value: number) =>
    `Rp ${(value / 1_000_000).toFixed(1)}M`;
  const formatUsage = (value: number) => `${value} m³`;

  // Normalisasi status dari API: dukung "lunas"/"belum_lunas" dan "paid"/"unpaid"
  const isPaid = (status: string | undefined) =>
    (status ?? "").toLowerCase() === "lunas" ||
    (status ?? "").toLowerCase() === "paid";

  return (
    <div className="min-h-screen">
      <AuthGuard>
        <AppShell>
          <AppHeader title="Dashboard Laporan" />

          <div className="container mx-auto px-4 space-y-6">
            <GlassCard className="p-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-foreground">
                  Tahun:
                </label>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) => {
                    const y = Number.parseInt(value);
                    setSelectedYear(y);
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </GlassCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Water Usage Chart (6 zona) */}
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  📈 Grafik Pemakaian Air
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={waterUsageData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(0, 150, 136, 0.1)"
                    />
                    <XAxis
                      dataKey="month"
                      stroke="rgba(0, 77, 64, 0.7)"
                      fontSize={12}
                    />
                    <YAxis stroke="rgba(0, 77, 64, 0.7)" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        border: "1px solid rgba(0, 150, 136, 0.2)",
                        borderRadius: "8px",
                        backdropFilter: "blur(10px)",
                      }}
                      formatter={(value, name) => [
                        formatUsage(Number(value)),
                        name,
                      ]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#009688"
                      strokeWidth={3}
                      name="Total"
                      dot={{ fill: "#009688", strokeWidth: 2, r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="blokA"
                      stroke="#4CAF50"
                      strokeWidth={2}
                      name={zoneNames[0] ?? "Blok A"}
                      dot={{ fill: "#4CAF50", strokeWidth: 2, r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="blokB"
                      stroke="#FF9800"
                      strokeWidth={2}
                      name={zoneNames[1] ?? "Blok B"}
                      dot={{ fill: "#FF9800", strokeWidth: 2, r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="blokC"
                      stroke="#2196F3"
                      strokeWidth={2}
                      name={zoneNames[2] ?? "Blok C"}
                      dot={{ fill: "#2196F3", strokeWidth: 2, r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="blokD"
                      stroke="#9C27B0"
                      strokeWidth={2}
                      name={zoneNames[3] ?? "Blok D"}
                      dot={{ fill: "#9C27B0", strokeWidth: 2, r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="blokE"
                      stroke="#795548"
                      strokeWidth={2}
                      name={zoneNames[4] ?? "Blok E"}
                      dot={{ fill: "#795548", strokeWidth: 2, r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="blokF"
                      stroke="#607D8B"
                      strokeWidth={2}
                      name={zoneNames[5] ?? "Blok F"}
                      dot={{ fill: "#607D8B", strokeWidth: 2, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </GlassCard>

              {/* Revenue */}
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  💰 Grafik Pendapatan
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(0, 150, 136, 0.1)"
                    />
                    <XAxis
                      dataKey="month"
                      stroke="rgba(0, 77, 64, 0.7)"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="rgba(0, 77, 64, 0.7)"
                      fontSize={12}
                      tickFormatter={formatCurrency}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        border: "1px solid rgba(0, 150, 136, 0.2)",
                        borderRadius: "8px",
                        backdropFilter: "blur(10px)",
                      }}
                      formatter={(value) => [
                        `Rp ${Number(value).toLocaleString("id-ID")}`,
                        "Pendapatan",
                      ]}
                    />
                    <Legend />
                    <Bar
                      dataKey="amount"
                      fill="#009688"
                      radius={[4, 4, 0, 0]}
                      name="Pendapatan Bulanan"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>
            </div>

            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                📊 Grafik Pengeluaran Per Bulan
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={expenseData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(0, 150, 136, 0.1)"
                  />
                  <XAxis
                    dataKey="month"
                    stroke="rgba(0, 77, 64, 0.7)"
                    fontSize={12}
                  />
                  <YAxis
                    stroke="rgba(0, 77, 64, 0.7)"
                    fontSize={12}
                    tickFormatter={formatCurrency}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      border: "1px solid rgba(0, 150, 136, 0.2)",
                      borderRadius: "8px",
                      backdropFilter: "blur(10px)",
                    }}
                    formatter={(value) => [
                      `Rp ${Number(value).toLocaleString("id-ID")}`,
                      "",
                    ]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="operasional"
                    stroke="#FF5722"
                    strokeWidth={3}
                    name="Pengeluaran Operasional"
                    dot={{ fill: "#FF5722", strokeWidth: 2, r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="lainnya"
                    stroke="#9C27B0"
                    strokeWidth={3}
                    name="Pengeluaran Lain"
                    dot={{ fill: "#9C27B0", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                📊 Grafik Laba Rugi
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={profitLossData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(0, 150, 136, 0.1)"
                  />
                  <XAxis
                    dataKey="month"
                    stroke="rgba(0, 77, 64, 0.7)"
                    fontSize={12}
                  />
                  <YAxis
                    stroke="rgba(0, 77, 64, 0.7)"
                    fontSize={12}
                    tickFormatter={formatCurrency}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      border: "1px solid rgba(0, 150, 136, 0.2)",
                      borderRadius: "8px",
                      backdropFilter: "blur(10px)",
                    }}
                    formatter={(value) => [
                      `Rp ${Number(value).toLocaleString("id-ID")}`,
                      Number(value) >= 0 ? "Laba" : "Rugi",
                    ]}
                  />
                  <Bar dataKey="profit" radius={[4, 4, 0, 0]} name="Laba/Rugi">
                    {profitLossData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.profit >= 0 ? "#4CAF50" : "#F44336"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Tabel Tagihan Belum Lunas
              </h3>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">
                        No
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">
                        Nama Warga
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">
                        Blok
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">
                        Periode
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">
                        Nominal
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {unpaidBills.map((bill, index) => (
                      <tr
                        key={bill.id}
                        className="border-b border-gray-100 hover:bg-gray-50/50"
                      >
                        <td className="py-3 px-4 text-sm text-foreground">
                          {index + 1}
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground">
                          {bill.nama}
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground">
                          {bill.blok}
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground">
                          {bill.periode}
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground">
                          Rp {bill.nominal.toLocaleString("id-ID")}
                        </td>
                        <td className="py-3 px-4 text-sm font-semibold">
                          {isPaid(bill.status) ? (
                            <div className="flex gap-2">
                              <span className="bg-green-100 text-green-400 px-2 py-1 rounded-md text-xs">
                                Lunas
                              </span>
                              <span className="bg-green-100 text-green-400 px-2 py-1 rounded-md text-xs">
                                Terverifikasi
                              </span>
                            </div>
                          ) : (
                            <span className="bg-red-100 text-red-400 px-2 py-1 rounded-md text-xs">
                              Belum Lunas
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="md:hidden space-y-3">
                {unpaidBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="bg-white/50 rounded-lg p-4 border border-gray-200"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-sm">{bill.nama}</p>
                        <p className="text-xs text-gray-600">{bill.blok}</p>
                      </div>
                      {isPaid(bill.status) ? (
                        <span className="text-green-600 text-xs font-semibold">
                          Lunas
                        </span>
                      ) : (
                        <span className="text-red-500 text-xs font-semibold">
                          Belum Lunas
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-600">
                      <span>{bill.periode}</span>
                      <span className="font-medium text-foreground">
                        Rp {bill.nominal.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </AppShell>
      </AuthGuard>
    </div>
  );
}

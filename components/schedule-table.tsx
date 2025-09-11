"use client";

import {
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Calendar,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GlassCard } from "@/components/glass-card";
import { useScheduleStore, type ScheduleItem } from "@/lib/schedule-store";
import { useToast } from "@/hooks/use-toast";

// Ketatkan typing statusConfig supaya kunci wajib = status UI kita
const statusConfig: Record<
  ScheduleItem["status"],
  {
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  waiting: { label: "Waiting", color: "bg-gray-500 text-white", icon: Clock },
  "in-progress": {
    label: "In Progress",
    color: "bg-blue-500 text-white",
    icon: Clock,
  },
  "non-progress": {
    label: "Non-Progress",
    color: "bg-orange-500 text-white",
    icon: AlertTriangle,
  },
  finished: {
    label: "Finished",
    color: "bg-green-500 text-white",
    icon: CheckCircle,
  },
  overdue: { label: "Overdue", color: "bg-red-500 text-white", icon: XCircle },
};

interface ScheduleTableProps {
  schedules: ScheduleItem[];
  isLoading: boolean;
}

// ==== Helpers aman untuk zona lama (string) & baru (objek) ====
function getZonaName(z: ScheduleItem["zona"] | string): string {
  if (!z) return "";
  if (typeof z === "string") return z;
  // @ts-expect-error: untuk kompatibilitas bila tipe local masih string
  return z?.nama ?? "";
}

export function ScheduleTable({ schedules, isLoading }: ScheduleTableProps) {
  const { startRecording } = useScheduleStore();
  const { toast } = useToast();

  const handleStartRecording = async (scheduleId: string) => {
    try {
      await startRecording(scheduleId);
      toast({ title: "Berhasil", description: "Form pencatatan dimulai" });
    } catch {
      toast({
        title: "Error",
        description: "Gagal memulai pencatatan",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const getProgressPercentage = (progress: number, target: number) =>
    target > 0 ? Math.round((progress / target) * 100) : 0;

  if (isLoading) {
    return (
      <GlassCard className="p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-white/20 rounded-lg" />
            </div>
          ))}
        </div>
      </GlassCard>
    );
  }

  if (schedules.length === 0) {
    return (
      <GlassCard className="p-12 text-center">
        <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Tidak ada jadwal
        </h3>
        <p className="text-muted-foreground">
          Tidak ada jadwal untuk filter ini
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/10 border-b border-white/20">
            <tr>
              <th className="text-left p-4 font-semibold text-foreground">
                No
              </th>
              <th className="text-left p-4 font-semibold text-foreground">
                Zona & Alamat
              </th>
              <th className="text-left p-4 font-semibold text-foreground">
                Petugas
              </th>
              <th className="text-left p-4 font-semibold text-foreground">
                Target
              </th>
              <th className="text-left p-4 font-semibold text-foreground">
                Progress
              </th>
              <th className="text-left p-4 font-semibold text-foreground">
                Status
              </th>
              <th className="text-left p-4 font-semibold text-foreground">
                Tanggal Rencana
              </th>
              <th className="text-left p-4 font-semibold text-foreground">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((schedule, index) => {
              const StatusIcon = statusConfig[schedule.status].icon;
              const progressPercentage = getProgressPercentage(
                schedule.progress,
                schedule.target
              );
              const zonaName = getZonaName(schedule.zona);

              const avatarUrl =
                schedule.petugas.avatar && schedule.petugas.avatar.trim() !== ""
                  ? schedule.petugas.avatar
                  : "/placeholder.svg";
              const petugasInitial = (
                schedule.petugas.nama?.trim()?.charAt(0) || "#"
              ).toUpperCase();

              return (
                <tr
                  key={schedule.id}
                  className="border-b border-white/10 hover:bg-white/5"
                >
                  <td className="p-4 text-foreground">{index + 1}</td>
                  <td className="p-4">
                    <div>
                      <div className="font-semibold text-foreground">
                        {zonaName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {schedule.alamat}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={avatarUrl} />
                        <AvatarFallback>{petugasInitial}</AvatarFallback>
                      </Avatar>
                      <span className="text-foreground">
                        {schedule.petugas.nama}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-foreground">{schedule.target}</td>
                  <td className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground">
                          {schedule.progress}/{schedule.target}
                        </span>
                        <span className="text-muted-foreground">
                          {progressPercentage}%
                        </span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge
                      className={`${
                        statusConfig[schedule.status].color
                      } flex items-center gap-1 w-fit`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {statusConfig[schedule.status].label}
                    </Badge>
                  </td>
                  <td className="p-4 text-foreground">
                    {formatDate(schedule.tanggalRencana)}
                  </td>
                  <td className="p-4">
                    <Button
                      onClick={() => handleStartRecording(schedule.id)}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2"
                      size="sm"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Catat Sekarang
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4 p-4">
        {schedules.map((schedule) => {
          const StatusIcon = statusConfig[schedule.status].icon;
          const progressPercentage = getProgressPercentage(
            schedule.progress,
            schedule.target
          );
          const zonaName = getZonaName(schedule.zona);

          const avatarUrl =
            schedule.petugas.avatar && schedule.petugas.avatar.trim() !== ""
              ? schedule.petugas.avatar
              : "/placeholder.svg";
          const petugasInitial = (
            schedule.petugas.nama?.trim()?.charAt(0) || "#"
          ).toUpperCase();

          return (
            <div
              key={schedule.id}
              className="bg-white/10 rounded-lg p-4 space-y-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground text-lg">
                    {zonaName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {schedule.alamat}
                  </p>
                </div>
                <Badge
                  className={`${
                    statusConfig[schedule.status].color
                  } flex items-center gap-1 ml-2`}
                >
                  <StatusIcon className="h-3 w-3" />
                  {statusConfig[schedule.status].label}
                </Badge>
              </div>

              {/* Body */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback className="text-xs">
                        {petugasInitial}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-foreground">
                      {schedule.petugas.nama}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">
                    {formatDate(schedule.tanggalRencana)}
                  </span>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    Progress
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {schedule.progress}/{schedule.target} - {progressPercentage}
                    %
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>

              {/* Footer */}
              <Button
                onClick={() => handleStartRecording(schedule.id)}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Catat Sekarang
              </Button>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

import { GlassCard } from "@/components/glass-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function MasterBiayaLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 pb-20">
      {/* Header Skeleton */}
      <GlassCard className="mb-6 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-10 w-10" />
        </div>
      </GlassCard>

      <div className="container mx-auto px-4 space-y-6">
        {/* Header Section Skeleton */}
        <GlassCard className="p-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <Skeleton className="h-10 w-full sm:w-40" />
            <Skeleton className="h-10 flex-1" />
          </div>
        </GlassCard>

        {/* Add Button Skeleton */}
        <div className="flex justify-end">
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Table Skeleton */}
        <GlassCard className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-6 w-20" />
                <div className="flex gap-2 ml-auto">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

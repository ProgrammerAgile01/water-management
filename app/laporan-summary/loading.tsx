import { GlassCard } from "@/components/glass-card";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 pb-24">
      <div className="container mx-auto px-4 space-y-6">
        <GlassCard className="p-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
        </GlassCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard className="p-6">
            <div className="h-6 bg-gray-200 rounded mb-4 animate-pulse" />
            <div className="h-64 bg-gray-200 rounded animate-pulse" />
          </GlassCard>
          <GlassCard className="p-6">
            <div className="h-6 bg-gray-200 rounded mb-4 animate-pulse" />
            <div className="h-64 bg-gray-200 rounded animate-pulse" />
          </GlassCard>
        </div>

        <GlassCard className="p-6">
          <div className="h-6 bg-gray-200 rounded mb-4 animate-pulse" />
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
        </GlassCard>
      </div>
    </div>
  );
}

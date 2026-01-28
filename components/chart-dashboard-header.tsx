import { InfoDot } from "./ui/radix-tooltip";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

export function ChartHeader({
  title,
  year,
  count,
  source,
}: {
  title: string;
  year: number | null;
  count: number;
  source: string;
}) {
  return (
    <div className="flex items-start gap-2 mb-3">
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">
          {year
            ? `Tahun ${year} · ${count} bulan`
            : `Timeline seluruh periode · ${count} titik data`}
        </p>
      </div>

      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <InfoDot label="Info" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{source}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {!year && (
        <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
          Timeline
        </span>
      )}
    </div>
  );
}

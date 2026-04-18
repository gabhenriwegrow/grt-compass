import { memo } from "react";
import { formatDate } from "@/lib/grt";

type Checkin = { week_date: string; status_snapshot: string };

interface Props {
  checkins: Checkin[]; // ordered oldest -> newest
  currentStatus?: string;
  weeks?: number;
  height?: number;
  width?: number;
}

const STATUS_Y: Record<string, number> = {
  concluido: 0,
  em_andamento: 1,
  pausado: 2,
  nao_iniciado: 3,
  bloqueado: 4,
};

const STATUS_COLOR: Record<string, string> = {
  concluido: "#2D7D46",
  em_andamento: "#9B26B6",
  pausado: "#B07D1A",
  nao_iniciado: "#878787",
  bloqueado: "#C0392B",
};

const yFor = (s: string) => STATUS_Y[s] ?? 3;
const colorFor = (s: string) => STATUS_COLOR[s] ?? "#878787";

const StatusSparklineImpl = ({
  checkins,
  currentStatus,
  weeks = 8,
  height = 20,
  width = 120,
}: Props) => {
  // Dedupe by week_date keeping last; take last N
  const map = new Map<string, Checkin>();
  for (const c of checkins) map.set(c.week_date, c);
  let pts = Array.from(map.values()).sort((a, b) => a.week_date.localeCompare(b.week_date));
  pts = pts.slice(-weeks);

  // Append current status as last point if it differs from last check-in's status
  if (currentStatus) {
    const last = pts[pts.length - 1];
    if (!last || last.status_snapshot !== currentStatus) {
      pts = [...pts, { week_date: new Date().toISOString().slice(0, 10), status_snapshot: currentStatus }];
      if (pts.length > weeks) pts = pts.slice(-weeks);
    }
  }

  if (pts.length === 0) {
    return <span className="text-[10px] text-muted-foreground">Sem histórico</span>;
  }

  const pad = 4;
  const vbW = width;
  const vbH = height;
  const innerW = vbW - pad * 2;
  const innerH = vbH - pad * 2;
  const yMax = 4;

  const xFor = (i: number) =>
    pts.length === 1 ? vbW / 2 : pad + (innerW * i) / (pts.length - 1);
  const yPx = (s: string) => pad + (innerH * yFor(s)) / yMax;

  const pathD = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(2)} ${yPx(p.status_snapshot).toFixed(2)}`)
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${vbW} ${vbH}`}
      overflow="visible"
      aria-hidden="false"
      role="img"
    >
      {pts.length > 1 && (
        <path
          d={pathD}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {pts.map((p, i) => {
        const isLast = i === pts.length - 1;
        const cx = xFor(i);
        const cy = yPx(p.status_snapshot);
        const fill = colorFor(p.status_snapshot);
        return (
          <g key={`${p.week_date}-${i}`}>
            {isLast && (
              <circle cx={cx} cy={cy} r={6} fill={fill} opacity={0.25} className="animate-pulse" />
            )}
            <circle cx={cx} cy={cy} r={isLast ? 4 : 3} fill={fill}>
              <title>{`${formatDate(p.week_date)} — ${p.status_snapshot}`}</title>
            </circle>
          </g>
        );
      })}
    </svg>
  );
};

export const StatusSparkline = memo(StatusSparklineImpl);

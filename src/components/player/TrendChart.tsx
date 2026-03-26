// src/components/player/TrendChart.tsx
"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

interface TrendChartProps {
  data: number[];
  line?: number;
  label: string;
  color?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-card border border-bg-border rounded p-2">
        <p className="text-[9px] font-mono text-text-muted">Game {label}</p>
        <p className="text-sm font-mono font-bold text-accent-green">
          {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export function TrendChart({ data, line, label, color = "#00FF87" }: TrendChartProps) {
  const chartData = data.map((val, i) => ({
    game: `G${data.length - i}`,
    value: val,
    label: `Game ${i + 1}`,
  })).reverse();

  const avg = data.reduce((a, b) => a + b, 0) / data.length;
  const min = Math.min(...data);
  const max = Math.max(...data);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[9px] font-mono text-text-muted uppercase tracking-wider">
          {label} — Last {data.length} Games
        </div>
        <div className="flex items-center gap-3 text-[9px] font-mono">
          <span className="text-text-muted">
            Avg: <span className="text-text-primary font-semibold">{avg.toFixed(1)}</span>
          </span>
          {line && (
            <span className="text-accent-amber">
              Line: <span className="font-semibold">{line}</span>
            </span>
          )}
        </div>
      </div>

      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="game"
              tick={{ fontSize: 8, fill: "#4A5D6E", fontFamily: "IBM Plex Mono" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[Math.max(0, min - 3), max + 3]}
              tick={{ fontSize: 8, fill: "#4A5D6E", fontFamily: "IBM Plex Mono" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            {line && (
              <ReferenceLine
                y={line}
                stroke="#F59E0B"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            )}
            <ReferenceLine
              y={avg}
              stroke="#7B8FA6"
              strokeDasharray="2 2"
              strokeWidth={1}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill="url(#trendGradient)"
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                const isOver = line ? payload.value >= line : true;
                return (
                  <circle
                    key={payload.game}
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill={isOver ? "#00FF87" : "#FF3B5C"}
                    stroke="transparent"
                  />
                );
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-2 mt-2">
        {[
          { label: "AVG", val: avg.toFixed(1), color: "#E8EEF4" },
          { label: "HIGH", val: max, color: "#00FF87" },
          { label: "LOW", val: min, color: "#FF3B5C" },
          {
            label: line ? "O/U RATE" : "LAST",
            val: line
              ? `${Math.round((data.filter((v) => v >= line).length / data.length) * 100)}%`
              : data[0],
            color: "#F59E0B",
          },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-[8px] font-mono text-text-muted">{stat.label}</div>
            <div
              className="text-sm font-mono font-bold"
              style={{ color: stat.color }}
            >
              {stat.val}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

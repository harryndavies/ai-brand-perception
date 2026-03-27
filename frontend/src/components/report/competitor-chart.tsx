import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CompetitorPosition } from "@/types";

interface CompetitorChartProps {
  positions: CompetitorPosition[];
  primaryBrand: string;
}

const COLORS = [
  "var(--color-primary)",
  "#6366f1",
  "#8b5cf6",
  "#a78bfa",
];

export function CompetitorChart({ positions, primaryBrand }: CompetitorChartProps) {
  const data = positions.map((p) => ({
    ...p,
    x: p.lifestyle_score,
    y: p.premium_score,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Competitive Positioning
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ top: 10, right: 30, bottom: 30, left: 30 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              type="number"
              dataKey="x"
              domain={[0, 1]}
              tickCount={5}
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            >
              <Label
                value="Functional → Lifestyle"
                position="bottom"
                offset={10}
                className="fill-muted-foreground text-xs"
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="y"
              domain={[0, 1]}
              tickCount={5}
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            >
              <Label
                value="Mass Market → Premium"
                angle={-90}
                position="left"
                offset={10}
                className="fill-muted-foreground text-xs"
              />
            </YAxis>
            <Tooltip
              content={({ payload }) => {
                if (!payload?.length) return null;
                const item = payload[0].payload as CompetitorPosition & { x: number; y: number };
                return (
                  <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-md">
                    <p className="font-medium">{item.brand}</p>
                    <p className="text-muted-foreground">
                      Premium: {(item.premium_score * 100).toFixed(0)}% · Lifestyle: {(item.lifestyle_score * 100).toFixed(0)}%
                    </p>
                  </div>
                );
              }}
            />
            <Scatter data={data} fill="#6366f1">
              {data.map((entry, index) => (
                <Cell
                  key={entry.brand}
                  fill={entry.brand === primaryBrand ? "#6366f1" : COLORS[index % COLORS.length]}
                  r={entry.brand === primaryBrand ? 8 : 6}
                  stroke={entry.brand === primaryBrand ? "#4f46e5" : "none"}
                  strokeWidth={2}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div className="mt-2 flex flex-wrap justify-center gap-4">
          {positions.map((p, i) => (
            <div key={p.brand} className="flex items-center gap-1.5 text-xs">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: p.brand === primaryBrand ? "#6366f1" : COLORS[i % COLORS.length],
                }}
              />
              <span className={p.brand === primaryBrand ? "font-medium" : "text-muted-foreground"}>
                {p.brand}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

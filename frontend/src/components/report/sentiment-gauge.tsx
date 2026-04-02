import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SentimentGaugeProps {
  score: number;
  brand: string;
}

export function SentimentGauge({ score, brand }: SentimentGaugeProps) {
  const percentage = ((score + 1) / 2) * 100;
  const label =
    score >= 0.6
      ? "Very Positive"
      : score >= 0.2
        ? "Positive"
        : score >= -0.2
          ? "Neutral"
          : score >= -0.6
            ? "Negative"
            : "Very Negative";
  const color =
    score >= 0.2
      ? "text-emerald-500"
      : score >= -0.2
        ? "text-amber-500"
        : "text-red-500";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          Overall Sentiment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="relative flex h-24 w-24 items-center justify-center">
            <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/30"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={`${percentage * 2.51} ${251 - percentage * 2.51}`}
                strokeLinecap="round"
                className={color}
              />
            </svg>
            <span className={`absolute text-lg font-bold ${color}`}>
              {score > 0 ? "+" : ""}
              {score.toFixed(2)}
            </span>
          </div>
          <div>
            <p className={`text-lg font-semibold ${color}`}>{label}</p>
            <p className="text-sm text-muted-foreground">
              Aggregate sentiment for {brand} across all analysis perspectives.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BrandScores } from "@/types";

const SCORE_LABELS: Record<keyof BrandScores, string> = {
  brand_recognition: "Brand Recognition",
  sentiment: "Sentiment",
  innovation: "Innovation",
  value_perception: "Value Perception",
  market_positioning: "Market Positioning",
};

function scoreColor(score: number): string {
  if (score >= 8) return "text-emerald-500";
  if (score >= 5) return "text-amber-500";
  return "text-red-500";
}

export function ScoreCard({ scores }: { scores: BrandScores }) {
  const entries = Object.entries(SCORE_LABELS) as [keyof BrandScores, string][];
  const avg = Math.round(
    entries.reduce((sum, [key]) => sum + scores[key], 0) / entries.length * 10
  ) / 10;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Perception Scores</CardTitle>
          <span className={`text-lg font-bold ${scoreColor(avg)}`}>{avg}/10</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.map(([key, label]) => (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>{label}</span>
              <span className={`font-medium ${scoreColor(scores[key])}`}>
                {scores[key]}/10
              </span>
            </div>
            <Progress value={scores[key] * 10} className="h-1.5" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

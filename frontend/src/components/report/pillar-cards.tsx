import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { BrandPillar } from "@/types";

interface PillarCardsProps {
  pillars: BrandPillar[];
}

export function PillarCards({ pillars }: PillarCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {pillars.map((pillar) => (
        <Card key={pillar.name}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-sm font-medium">
                {pillar.name}
              </CardTitle>
              <span className="text-xs font-medium text-muted-foreground">
                {Math.round(pillar.confidence * 100)}%
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={pillar.confidence * 100} className="h-1.5" />
            <p className="text-sm text-muted-foreground">
              {pillar.description}
            </p>
            <div className="flex flex-wrap gap-1">
              {pillar.sources.map((source) => (
                <Badge key={source} variant="secondary" className="text-xs">
                  {source}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

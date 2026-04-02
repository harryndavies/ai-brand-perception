import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";
import type { JobStatus } from "@/types";

export function NewAnalysisPage() {
  const navigate = useNavigate();
  const [brand, setBrand] = useState("");
  const [competitors, setCompetitors] = useState(["", "", ""]);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<JobStatus>("idle");
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    return () => { eventSourceRef.current?.close(); };
  }, []);

  const connectSSE = useCallback(
    (reportId: string) => {
      const es = api.reports.stream(reportId);
      eventSourceRef.current = es;

      es.addEventListener("progress", (e) => {
        const data = JSON.parse(e.data) as Record<
          string,
          { id: string; status: JobStatus; progress: number }
        >;
        const analysis = data["analysis"];
        if (analysis) {
          setStatus(analysis.status);
        }
      });

      es.addEventListener("complete", () => {
        es.close();
        setTimeout(() => navigate(`/reports/${reportId}`), 600);
      });

      es.addEventListener("error", () => {
        es.close();
        setStatus("failed");
      });
    },
    [navigate]
  );

  const mutation = useMutation({
    mutationFn: () => {
      const filteredCompetitors = competitors.filter((c) => c.trim());
      return api.reports.create(brand.trim(), filteredCompetitors);
    },
    onSuccess: (report) => {
      connectSSE(report.id);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!brand.trim()) return;

    setIsRunning(true);
    setStatus("pending");
    mutation.mutate();
  }

  function updateCompetitor(index: number, value: string) {
    setCompetitors((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  const statusLabel =
    status === "pending" ? "Queued" :
    status === "running" ? "Analysing" :
    status === "complete" ? "Complete" :
    status === "failed" ? "Failed" : "Waiting";

  const badgeVariant =
    status === "complete" ? "default" as const :
    status === "failed" ? "destructive" as const :
    status === "running" ? "secondary" as const :
    "outline" as const;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Analysis</h1>
        <p className="text-muted-foreground">
          Enter a brand to analyse its perception using Claude AI.
        </p>
      </div>

      {!isRunning ? (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand name</Label>
                <Input
                  id="brand"
                  placeholder="e.g. Arc'teryx, Notion, Stripe..."
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  autoFocus
                  className="text-base"
                />
              </div>

              <div className="space-y-3">
                <Label>Competitors (optional)</Label>
                <p className="text-sm text-muted-foreground">
                  Add up to 3 competitor brands for comparison.
                </p>
                {competitors.map((comp, i) => (
                  <Input
                    key={i}
                    placeholder={`Competitor ${i + 1}`}
                    value={comp}
                    onChange={(e) => updateCompetitor(i, e.target.value)}
                  />
                ))}
              </div>

              <Button type="submit" className="w-full" disabled={!brand.trim()}>
                Start Analysis
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Analysing <span className="text-indigo-500">{brand}</span>
            </CardTitle>
            <CardDescription>
              Running brand perception, news sentiment, and competitor analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Analysis</span>
              <Badge variant={badgeVariant}>{statusLabel}</Badge>
            </div>
            {status === "running" ? (
              <Progress value={50} className="h-2" />
            ) : status === "complete" ? (
              <Progress value={100} className="h-2" />
            ) : (
              <Progress value={0} className="h-2" />
            )}
            {status === "failed" && (
              <p className="text-sm text-destructive">
                Something went wrong. Please try again.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

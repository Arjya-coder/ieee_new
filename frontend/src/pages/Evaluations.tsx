import { BarChart3, Download, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Evaluation {
  id: string;
  timestamp: string;
  dataSource: string;
  dataset: string;
  accuracy: number;
  sampleCount: number;
  status: "completed" | "failed" | "running";
}

const Evaluations = () => {
  const evaluations: Evaluation[] = [
    {
      id: "eval_001",
      timestamp: new Date().toISOString(),
      dataSource: "synthetic",
      dataset: "test_safe_scenarios.csv",
      accuracy: 0.945,
      sampleCount: 1000,
      status: "completed"
    },
    {
      id: "eval_002",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      dataSource: "firebase",
      dataset: "live_packets",
      accuracy: 0.912,
      sampleCount: 500,
      status: "completed"
    },
    {
      id: "eval_003",
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      dataSource: "combined",
      dataset: "mixed_dataset",
      accuracy: 0.928,
      sampleCount: 1500,
      status: "completed"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Evaluation History</h1>
        <p className="text-muted-foreground">View past model evaluation results</p>
      </div>

      <Card className="backdrop-blur-sm bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Previous Evaluations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                  <TableHead className="text-foreground font-semibold">ID</TableHead>
                  <TableHead className="text-foreground font-semibold">Timestamp</TableHead>
                  <TableHead className="text-foreground font-semibold">Data Source</TableHead>
                  <TableHead className="text-foreground font-semibold">Dataset</TableHead>
                  <TableHead className="text-foreground font-semibold">Accuracy</TableHead>
                  <TableHead className="text-foreground font-semibold">Samples</TableHead>
                  <TableHead className="text-foreground font-semibold">Status</TableHead>
                  <TableHead className="text-foreground font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluations.map((evaluation) => (
                  <TableRow key={evaluation.id} className="hover:bg-secondary/30">
                    <TableCell className="font-mono text-sm text-primary">{evaluation.id}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(evaluation.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell className="capitalize text-foreground">{evaluation.dataSource}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {evaluation.dataset}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-lg font-bold text-success">
                        {(evaluation.accuracy * 100).toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-foreground">
                      {evaluation.sampleCount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          evaluation.status === "completed"
                            ? "bg-success/20 text-success border-success/50"
                            : evaluation.status === "running"
                            ? "bg-warning/20 text-warning border-warning/50"
                            : "bg-alert/20 text-alert border-alert/50"
                        }
                      >
                        {evaluation.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="gap-2">
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Download className="w-4 h-4" />
                          Export
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Evaluations;

import { useState } from "react";
import { FlaskConical, Play, Database, Radio } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfusionMatrix } from "@/components/evaluation/ConfusionMatrix";
import { MetricsDisplay } from "@/components/evaluation/MetricsDisplay";
import { toast } from "sonner";

const ModelTesting = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const [dataSource, setDataSource] = useState("synthetic");

  const mockResults = {
    matrix: {
      predicted: {
        safe: { safe: 950, medium: 30, alert: 20 },
        medium: { safe: 25, medium: 940, alert: 35 },
        alert: { safe: 15, medium: 40, alert: 945 }
      }
    },
    metrics: {
      accuracy: 0.945,
      precision: { safe: 0.96, medium: 0.93, alert: 0.945 },
      recall: { safe: 0.95, medium: 0.94, alert: 0.945 },
      f1: { safe: 0.955, medium: 0.935, alert: 0.945 }
    }
  };

  const handleRunEvaluation = async () => {
    setIsRunning(true);
    toast.info("Starting model evaluation...");
    
    // Mock API call
    setTimeout(() => {
      setIsRunning(false);
      setHasResults(true);
      toast.success("Evaluation completed successfully");
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Model Testing</h1>
        <p className="text-muted-foreground">Run ML model evaluations and view results</p>
      </div>

      <Card className="backdrop-blur-sm bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            Evaluation Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="data-source">Data Source</Label>
              <Select value={dataSource} onValueChange={setDataSource}>
                <SelectTrigger id="data-source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="synthetic">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Synthetic Dataset
                    </div>
                  </SelectItem>
                  <SelectItem value="firebase">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4" />
                      Live Firebase Data
                    </div>
                  </SelectItem>
                  <SelectItem value="combined">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      <Radio className="w-4 h-4" />
                      Combined
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataset">Dataset Selection</Label>
              <Select defaultValue="test_safe">
                <SelectTrigger id="dataset">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="test_safe">test_safe_scenarios.csv</SelectItem>
                  <SelectItem value="test_medium">test_medium_scenarios.csv</SelectItem>
                  <SelectItem value="test_alert">test_alert_scenarios.csv</SelectItem>
                  <SelectItem value="training">training_data_v1.csv</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="limit">Sample Limit</Label>
              <Input
                id="limit"
                type="number"
                defaultValue={1000}
                placeholder="Number of samples"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model-endpoint">Model Endpoint</Label>
              <Input
                id="model-endpoint"
                type="text"
                defaultValue="http://localhost:5001/predict_batch"
                placeholder="API endpoint URL"
              />
            </div>
          </div>

          <Button
            onClick={handleRunEvaluation}
            disabled={isRunning}
            className="w-full md:w-auto gap-2"
            size="lg"
          >
            <Play className="w-5 h-5" />
            {isRunning ? "Running Evaluation..." : "Run Evaluation"}
          </Button>
        </CardContent>
      </Card>

      {hasResults && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ConfusionMatrix matrix={mockResults.matrix} />
          <MetricsDisplay metrics={mockResults.metrics} />
        </div>
      )}
    </div>
  );
};

export default ModelTesting;

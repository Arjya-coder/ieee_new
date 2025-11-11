import { useState } from "react";
import { Database, Upload, Trash2, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatasetUploader } from "@/components/datasets/DatasetUploader";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Dataset {
  id: string;
  name: string;
  uploadTime: string;
  rowCount: number;
  uploader: string;
  status: "validated" | "pending" | "error";
}

const Datasets = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([
    {
      id: "1",
      name: "training_data_v1.csv",
      uploadTime: new Date().toISOString(),
      rowCount: 10000,
      uploader: "admin",
      status: "validated"
    },
    {
      id: "2",
      name: "test_safe_scenarios.csv",
      uploadTime: new Date(Date.now() - 86400000).toISOString(),
      rowCount: 2500,
      uploader: "admin",
      status: "validated"
    }
  ]);

  const handleUpload = async (file: File) => {
    // Mock upload - replace with actual Firebase Storage upload
    const newDataset: Dataset = {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      uploadTime: new Date().toISOString(),
      rowCount: Math.floor(Math.random() * 10000),
      uploader: "current_user",
      status: "pending"
    };
    
    setDatasets(prev => [newDataset, ...prev]);
    
    // Simulate validation
    setTimeout(() => {
      setDatasets(prev => prev.map(d => 
        d.id === newDataset.id ? { ...d, status: "validated" as const } : d
      ));
    }, 2000);
  };

  const handleDelete = (id: string) => {
    setDatasets(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dataset Manager</h1>
        <p className="text-muted-foreground">Upload and manage synthetic CSV datasets</p>
      </div>

      <DatasetUploader onUpload={handleUpload} />

      <Card className="backdrop-blur-sm bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Uploaded Datasets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                  <TableHead className="text-foreground font-semibold">Name</TableHead>
                  <TableHead className="text-foreground font-semibold">Upload Time</TableHead>
                  <TableHead className="text-foreground font-semibold">Rows</TableHead>
                  <TableHead className="text-foreground font-semibold">Uploader</TableHead>
                  <TableHead className="text-foreground font-semibold">Status</TableHead>
                  <TableHead className="text-foreground font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datasets.map((dataset) => (
                  <TableRow key={dataset.id} className="hover:bg-secondary/30">
                    <TableCell className="font-mono text-sm text-foreground">{dataset.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(dataset.uploadTime).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-primary">{dataset.rowCount.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">{dataset.uploader}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          dataset.status === "validated"
                            ? "bg-success/20 text-success border-success/50"
                            : dataset.status === "pending"
                            ? "bg-warning/20 text-warning border-warning/50"
                            : "bg-alert/20 text-alert border-alert/50"
                        }
                      >
                        {dataset.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="gap-2">
                          <Eye className="w-4 h-4" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 text-alert hover:text-alert"
                          onClick={() => handleDelete(dataset.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
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

export default Datasets;

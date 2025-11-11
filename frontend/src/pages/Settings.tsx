import { Settings as SettingsIcon, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Settings = () => {
  const handleSave = () => {
    toast.success("Settings saved successfully");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Configure application and model settings</p>
      </div>

      <Card className="backdrop-blur-sm bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-primary" />
            Firebase Configuration
          </CardTitle>
          <CardDescription>Configure Firebase Realtime Database connection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firebase-url">Firebase Database URL</Label>
            <Input
              id="firebase-url"
              type="text"
              placeholder="https://your-project.firebaseio.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="firebase-key">Firebase API Key</Label>
            <Input
              id="firebase-key"
              type="password"
              placeholder="Your Firebase API key"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="backdrop-blur-sm bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground">Model Endpoint Configuration</CardTitle>
          <CardDescription>Configure external model endpoint for predictions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="model-url">Model Endpoint URL</Label>
            <Input
              id="model-url"
              type="text"
              defaultValue="http://localhost:5001/predict_batch"
              placeholder="http://localhost:5001/predict_batch"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auth-token">Authentication Token (Optional)</Label>
            <Input
              id="auth-token"
              type="password"
              placeholder="Bearer token for API authentication"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="backdrop-blur-sm bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground">Injection Settings</CardTitle>
          <CardDescription>Configure batch injection and rate limiting</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="batch-size">Batch Size</Label>
            <Input
              id="batch-size"
              type="number"
              defaultValue={100}
              placeholder="Number of records per batch"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate-limit">Rate Limit (packets/sec)</Label>
            <Input
              id="rate-limit"
              type="number"
              defaultValue={10}
              placeholder="Maximum packets per second"
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="gap-2" size="lg">
        <Save className="w-5 h-5" />
        Save Settings
      </Button>
    </div>
  );
};

export default Settings;

import { useState, useEffect } from "react";
import { Activity, Radio, TrendingUp, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { PacketTable, Packet } from "@/components/packets/PacketTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React from "react";
import RealTimeChart from "../components/evaluation/RealTimeChart";

// Mock data generator - replace with Firebase connection
const generateMockPacket = (): Packet => {
  const labels = ["safe", "medium", "alert"] as const;
  return {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    src_id: `DEV_${Math.floor(Math.random() * 100).toString().padStart(3, '0')}`,
    rssi_dbm: -90 + Math.random() * 60,
    payload_hex: Array.from({ length: 16 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join(''),
    pkt_count: Math.floor(Math.random() * 1000),
    crc_ok: Math.random() > 0.1,
    label: labels[Math.floor(Math.random() * labels.length)],
    is_synthetic: Math.random() > 0.7,
  };
};

const LiveFeed = () => {
  const [packets, setPackets] = useState<Packet[]>(() => 
    Array.from({ length: 20 }, generateMockPacket)
  );

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setPackets(prev => [generateMockPacket(), ...prev.slice(0, 99)]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const avgRssi = (packets.reduce((sum, p) => sum + p.rssi_dbm, 0) / packets.length).toFixed(1);
  const alertCount = packets.filter(p => p.label === "alert").length;
  const safePercentage = ((packets.filter(p => p.label === "safe").length / packets.length) * 100).toFixed(0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Live Feed</h1>
        <p className="text-muted-foreground">Real-time RF packet monitoring</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Packets"
          value={packets.length}
          icon={Activity}
          trend={{ value: "+12% from last hour", isPositive: true }}
        />
        <StatCard
          title="Avg RSSI"
          value={`${avgRssi} dBm`}
          icon={Radio}
        />
        <StatCard
          title="Safe Rate"
          value={`${safePercentage}%`}
          icon={TrendingUp}
          trend={{ value: "+5% improvement", isPositive: true }}
        />
        <StatCard
          title="Alerts"
          value={alertCount}
          icon={AlertTriangle}
        />
      </div>

      <Card className="backdrop-blur-sm bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary animate-pulse" />
            Recent Packets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PacketTable packets={packets} />
        </CardContent>
      </Card>

      {/* Real-time chart polling every 5 seconds */}
      <section style={{ marginTop: 16 }}>
        <h2>Live Feed (updates every 5s)</h2>
        <RealTimeChart endpoint="/api/live" refreshInterval={5000} maxPoints={60} title="Live Metric" />
      </section>
    </div>
  );
};

export default LiveFeed;

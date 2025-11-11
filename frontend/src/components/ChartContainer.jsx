// ChartContainer.jsx
import React, { useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  TimeScale,
} from "chart.js";
import 'chartjs-adapter-date-fns';

ChartJS.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend
);

/**
 * ChartContainer
 * Props:
 *  - lastEntry: latest processed entry {timestamp, temperature, humidity, gas, wifi_rssi, rfm_rssi, rf_noise_floor}
 *  - antennaLast: latest antenna payload {idx, ts, rfm_rssi, rf_noise_floor}
 *
 * Keeps short rolling history and draws four charts in a column:
 *  - Wi-Fi RSSI (dBm)
 *  - RFM RSSI (dBm)
 *  - Gas (units)
 *  - Temp / Humidity (two lines)
 */

const MAX_POINTS = 80;

function nowMs() {
  return Date.now();
}

export default function ChartContainer({ lastEntry, antennaLast }) {
  const [wifiHistory, setWifiHistory] = useState([]);
  const [rfmHistory, setRfmHistory] = useState([]);
  const [gasHistory, setGasHistory] = useState([]);
  const [tempHistory, setTempHistory] = useState([]);
  const [humHistory, setHumHistory] = useState([]);

  // update histories when new data arrives
  useEffect(() => {
    if (lastEntry) {
      const t = (lastEntry.timestamp && typeof lastEntry.timestamp === "number")
        ? lastEntry.timestamp * 1000
        : nowMs();
      setWifiHistory((h) => pushPoint(h, { x: t, y: lastEntry.wifi_rssi }));
      setGasHistory((h) => pushPoint(h, { x: t, y: lastEntry.gas }));
      setTempHistory((h) => pushPoint(h, { x: t, y: lastEntry.temperature }));
      setHumHistory((h) => pushPoint(h, { x: t, y: lastEntry.humidity }));
    }
  }, [lastEntry]);

  // keep RFM in sync with antenna stream (antennaLast preferred)
  useEffect(() => {
    if (antennaLast) {
      const t = antennaLast.ts ? new Date(antennaLast.ts).getTime() : nowMs();
      setRfmHistory((h) => pushPoint(h, { x: t, y: antennaLast.rfm_rssi }));
    }
  }, [antennaLast]);

  // small helper to push and trim arrays
  function pushPoint(arr, point) {
    const next = [...arr, point];
    if (next.length > MAX_POINTS) next.shift();
    return next;
  }

  // Chart datasets and options generator
  const baseOptions = (title) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: {
        type: 'time',
        time: { unit: 'second', displayFormats: { second: 'HH:mm:ss' } },
        ticks: { autoSkip: true, maxTicksLimit: 6 }
      },
      y: { beginAtZero: false }
    }
  });

  const wifiData = {
    datasets: [{
      label: 'WiFi RSSI (dBm)',
      data: wifiHistory,
      borderWidth: 2,
      borderColor: '#00FF7F',
      pointRadius: 0,
      tension: 0.2,
      fill: true,
      backgroundColor: 'rgba(0,255,127,0.06)'
    }]
  };

  const rfmData = {
    datasets: [{
      label: 'RFM RSSI (dBm)',
      data: rfmHistory,
      borderWidth: 2,
      borderColor: '#00FFFF',
      pointRadius: 0,
      tension: 0.2,
      fill: true,
      backgroundColor: 'rgba(0,255,255,0.04)'
    }]
  };

  const gasData = {
    datasets: [{
      label: 'Gas (units)',
      data: gasHistory,
      borderWidth: 2,
      borderColor: '#FFD700',
      pointRadius: 0,
      tension: 0.2,
      fill: true,
      backgroundColor: 'rgba(255,215,0,0.04)'
    }]
  };

  const tempHumData = {
    datasets: [
      {
        label: 'Temperature (°C)',
        data: tempHistory,
        borderWidth: 2,
        borderColor: '#FF7A7A',
        pointRadius: 0,
        tension: 0.2,
        yAxisID: 'y1'
      },
      {
        label: 'Humidity (%)',
        data: humHistory,
        borderWidth: 2,
        borderColor: '#7AD1FF',
        pointRadius: 0,
        tension: 0.2,
        yAxisID: 'y2'
      }
    ]
  };

  const tempHumOptions = {
    ...baseOptions('Temp & Humidity'),
    scales: {
      x: baseOptions().scales.x,
      y1: { type: 'linear', position: 'left', title: { display: true, text: '°C' } },
      y2: { type: 'linear', position: 'right', title: { display: true, text: '%' }, grid: { drawOnChartArea: false } }
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-2xl bg-[#07121a] border border-gray-800 h-40">
        <div className="text-xs text-gray-300">Wi-Fi RSSI</div>
        <div className="h-28">
          <Line data={wifiData} options={baseOptions('WiFi RSSI')} />
        </div>
      </div>

      <div className="p-3 rounded-2xl bg-[#07121a] border border-gray-800 h-40">
        <div className="text-xs text-gray-300">RFM RSSI (Antenna)</div>
        <div className="h-28">
          <Line data={rfmData} options={baseOptions('RFM RSSI')} />
        </div>
      </div>

      <div className="p-3 rounded-2xl bg-[#07121a] border border-gray-800 h-40">
        <div className="text-xs text-gray-300">Gas</div>
        <div className="h-28">
          <Line data={gasData} options={baseOptions('Gas')} />
        </div>
      </div>

      <div className="p-3 rounded-2xl bg-[#07121a] border border-gray-800 h-44">
        <div className="text-xs text-gray-300">Temperature & Humidity</div>
        <div className="h-36">
          <Line data={tempHumData} options={tempHumOptions} />
        </div>
      </div>
    </div>
  );
}

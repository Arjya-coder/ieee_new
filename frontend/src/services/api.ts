/**
 * API Service for RF Monitor Dashboard
 * Connects to Flask backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface Packet {
  id: string;
  timestamp: string;
  src_id: string;
  rssi_dbm: number;
  payload_hex: string;
  pkt_count: number;
  crc_ok: boolean;
  label: "safe" | "medium" | "alert";
  is_synthetic?: boolean;
}

export interface Dataset {
  id: string;
  name: string;
  upload_time: string;
  row_count: number;
  uploader: string;
  storage_url: string;
  status: "validated" | "pending" | "error";
}

export interface Evaluation {
  id: string;
  timestamp: string;
  dataset_source: string;
  metrics: {
    accuracy: number;
    precision: { safe: number; medium: number; alert: number };
    recall: { safe: number; medium: number; alert: number };
    f1: { safe: number; medium: number; alert: number };
  };
  sample_count: number;
}

// ============================================================================
// PACKET API
// ============================================================================

export const getPackets = async (limit: number = 100): Promise<Packet[]> => {
  const response = await fetch(`${API_BASE_URL}/packets?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch packets');
  return response.json();
};

export const insertSyntheticPacket = async (packet: Omit<Packet, 'id'>): Promise<{ id: string }> => {
  const response = await fetch(`${API_BASE_URL}/insertSynthetic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(packet),
  });
  if (!response.ok) throw new Error('Failed to insert packet');
  return response.json();
};

export const clearPackets = async (): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/clearPackets`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to clear packets');
};

// ============================================================================
// DATASET API
// ============================================================================

export const uploadCsv = async (file: File, uploader: string): Promise<{ dataset_id: string; metadata: Dataset }> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('uploader', uploader);

  const response = await fetch(`${API_BASE_URL}/uploadCsv`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload CSV');
  }
  
  return response.json();
};

export const injectDataset = async (
  datasetId: string,
  batchSize?: number,
  rateLimit?: number
): Promise<{ injected_count: number }> => {
  const response = await fetch(`${API_BASE_URL}/injectDataset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dataset_id: datasetId,
      batch_size: batchSize,
      rate_limit: rateLimit,
    }),
  });
  
  if (!response.ok) throw new Error('Failed to inject dataset');
  return response.json();
};

// ============================================================================
// MODEL EVALUATION API
// ============================================================================

export const runEvaluation = async (config: {
  dataset_source: 'synthetic' | 'firebase' | 'combined';
  dataset_id?: string;
  limit?: number;
  model_endpoint?: string;
}): Promise<{
  eval_id: string;
  metrics: Evaluation['metrics'];
  predictions: any[];
}> => {
  const response = await fetch(`${API_BASE_URL}/runEvaluation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to run evaluation');
  }
  
  return response.json();
};

export const uploadModelPredictions = async (
  predictions: any[],
  metadata: any
): Promise<{ eval_id: string }> => {
  const response = await fetch(`${API_BASE_URL}/uploadModelPredictions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      predictions,
      eval_metadata: metadata,
    }),
  });
  
  if (!response.ok) throw new Error('Failed to upload predictions');
  return response.json();
};

export const getEvaluations = async (): Promise<Evaluation[]> => {
  const response = await fetch(`${API_BASE_URL}/evaluations`);
  if (!response.ok) throw new Error('Failed to fetch evaluations');
  return response.json();
};

export const getEvaluationDetail = async (evalId: string): Promise<{
  evaluation: Evaluation;
  predictions: any[];
}> => {
  const response = await fetch(`${API_BASE_URL}/evaluations/${evalId}`);
  if (!response.ok) throw new Error('Failed to fetch evaluation details');
  return response.json();
};

// ============================================================================
// HEALTH CHECK
// ============================================================================

export const healthCheck = async (): Promise<{ status: string; timestamp: string }> => {
  const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
  if (!response.ok) throw new Error('Health check failed');
  return response.json();
};

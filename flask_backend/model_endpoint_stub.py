"""
Model Endpoint Stub
This is a mock model endpoint for testing the evaluation pipeline.
Run this on your laptop to simulate a real ML model.

Usage:
    python model_endpoint_stub.py

The endpoint will listen on http://localhost:5001/predict_batch
"""

from flask import Flask, request, jsonify
import random
from datetime import datetime

app = Flask(__name__)

LABELS = ['safe', 'medium', 'alert']


@app.route('/predict_batch', methods=['POST'])
def predict_batch():
    """
    Mock model prediction endpoint
    Accepts batch of records and returns predictions
    
    Expected input:
    {
        "records": [
            {
                "timestamp": "2024-01-01T00:00:00",
                "src_id": "DEV_001",
                "rssi_dbm": -65.5,
                "payload_hex": "a1b2c3d4",
                "pkt_count": 100,
                "crc_ok": true,
                "label": "safe"
            },
            ...
        ]
    }
    
    Returns:
    {
        "predictions": [
            {
                "row_index": 0,
                "pred_label": "safe",
                "confidence": 0.95
            },
            ...
        ]
    }
    """
    try:
        data = request.json
        records = data.get('records', [])
        
        if not records:
            return jsonify({'error': 'No records provided'}), 400
        
        predictions = []
        
        for idx, record in enumerate(records):
            # Mock prediction logic - replace with actual model
            # For demo, predict based on RSSI with some randomness
            rssi = record.get('rssi_dbm', -80)
            
            if rssi > -60:
                # Strong signal - likely safe
                pred_label = random.choices(LABELS, weights=[0.8, 0.15, 0.05])[0]
            elif rssi > -80:
                # Medium signal - more uncertainty
                pred_label = random.choices(LABELS, weights=[0.3, 0.5, 0.2])[0]
            else:
                # Weak signal - higher alert probability
                pred_label = random.choices(LABELS, weights=[0.1, 0.3, 0.6])[0]
            
            # Generate confidence score
            confidence = random.uniform(0.7, 0.99)
            
            predictions.append({
                'id': record.get('id', f'record_{idx}'),
                'row_index': idx,
                'pred_label': pred_label,
                'confidence': round(confidence, 4)
            })
        
        print(f"[{datetime.now()}] Processed {len(predictions)} predictions")
        
        return jsonify({
            'predictions': predictions,
            'model_version': '1.0.0-mock',
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({
        'status': 'healthy',
        'model': 'mock-rf-classifier',
        'version': '1.0.0'
    }), 200


if __name__ == '__main__':
    print("=" * 60)
    print("Mock Model Endpoint Starting...")
    print("Listening on: http://localhost:5001")
    print("Endpoint: POST /predict_batch")
    print("=" * 60)
    app.run(debug=True, host='0.0.0.0', port=5001)

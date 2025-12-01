"""
TrendPulse API - FastAPI Backend
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import numpy as np
from scipy.signal import savgol_filter

app = FastAPI(
    title="TrendPulse API",
    description="Cultural Trend Prediction Platform",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class TrendData(BaseModel):
    keyword: str
    values: List[float]
    brand: Optional[str] = None
    category: Optional[str] = None

class AnalysisResult(BaseModel):
    keyword: str
    phase: str
    priority: str
    r0: float
    snr: float
    velocity: float
    peak_days: int
    first_mover_days: int
    confidence: float
    urgency: str
    recommendations: List[dict]

# Analysis Engine
class TrendEngine:
    THRESHOLDS = {
        'snr_emerging': 1.5,
        'snr_early_signal': 2.0,
        'snr_acceleration': 3.0,
        'snr_breakout': 5.0,
        'velocity_breakout': 3.0,
        'r0_viral': 2.0,
    }

    @staticmethod
    def calculate_r0(values: np.ndarray, window: int = 7) -> float:
        if len(values) < window + 3:
            return 0.0
        r0_values = []
        for i in range(window, len(values)):
            prev_mean = np.mean(values[i-window:i])
            if prev_mean > 0:
                r0_values.append(values[i] / prev_mean)
        return float(np.mean(r0_values[-3:])) if r0_values else 0.0

    @staticmethod
    def analyze(values: List[float], keyword: str) -> dict:
        arr = np.array(values)
        
        # Baseline
        baseline_end = max(5, int(len(arr) * 0.3))
        baseline_mean = float(np.mean(arr[:baseline_end]))
        baseline_std = float(np.std(arr[:baseline_end]))
        
        # Current
        current = float(arr[-1])
        snr = (current - baseline_mean) / baseline_std if baseline_std > 0 else 0
        
        # Velocity
        if len(arr) >= 5:
            smoothed = savgol_filter(arr, min(5, len(arr)), 2)
            velocity = (smoothed[-1] - smoothed[-2]) / max(smoothed[-2], 1)
        else:
            velocity = 0
        
        # R0
        r0 = TrendEngine.calculate_r0(arr)
        
        # Phase classification
        if snr >= 5 and velocity >= 3 and r0 >= 2:
            phase = "breakout"
            priority = "critical"
        elif snr >= 3 and velocity >= 1 and r0 >= 1:
            phase = "acceleration"
            priority = "high"
        elif snr >= 2 and velocity >= 0.5:
            phase = "early_signal"
            priority = "medium"
        elif snr >= 1.5 or velocity > 0:
            phase = "emerging"
            priority = "low"
        else:
            phase = "baseline"
            priority = "low"
        
        # Timing
        if r0 > 1 and velocity > 0:
            peak_days = int(60 / max(r0, 0.5) / max(velocity + 1, 1))
            peak_days = max(7, min(365, peak_days))
        else:
            peak_days = 999
        
        first_mover_days = max(0, peak_days - 3)
        
        # Urgency
        if phase == "breakout" or peak_days < 7:
            urgency = "immediate"
        elif phase == "acceleration" or peak_days < 14:
            urgency = "same_day"
        elif peak_days < 30:
            urgency = "fast_track"
        elif peak_days < 60:
            urgency = "standard"
        else:
            urgency = "planned"
        
        # Confidence
        data_quality = min(1.0, len(arr) / 90)
        confidence = (data_quality * 0.25 + min(1, abs(snr) / 5) * 0.25 + 
                     (min(1, r0 / 2) * 0.25 if r0 > 0.5 else 0) + 0.2)
        
        # Recommendations
        recs_map = {
            "immediate": [
                {"type": "Real-time Social Post", "deadline": "< 2 hours", "priority": "critical"},
                {"type": "Newsjacking Thread", "deadline": "< 4 hours", "priority": "high"}
            ],
            "same_day": [
                {"type": "Social Media Series", "deadline": "24 hours", "priority": "high"},
                {"type": "Blog Post Draft", "deadline": "48 hours", "priority": "medium"}
            ],
            "fast_track": [
                {"type": "Thought Leadership", "deadline": "1 week", "priority": "medium"},
                {"type": "Video Explainer", "deadline": "1-2 weeks", "priority": "medium"}
            ],
            "standard": [
                {"type": "Pillar Content", "deadline": "2-3 weeks", "priority": "medium"},
                {"type": "Video Series", "deadline": "3-4 weeks", "priority": "low"}
            ],
            "planned": [
                {"type": "Long-form Content", "deadline": "1-2 months", "priority": "low"},
                {"type": "Campaign Strategy", "deadline": "2-3 months", "priority": "low"}
            ]
        }
        
        return {
            "keyword": keyword,
            "phase": phase,
            "priority": priority,
            "r0": round(r0, 3),
            "snr": round(snr, 2),
            "velocity": round(velocity, 3),
            "peak_days": peak_days,
            "first_mover_days": first_mover_days,
            "confidence": round(confidence, 2),
            "urgency": urgency,
            "recommendations": recs_map.get(urgency, [])
        }

# Routes
@app.get("/")
async def root():
    return {"message": "TrendPulse API v1.0.0", "status": "healthy"}

@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.post("/analyze", response_model=AnalysisResult)
async def analyze_trend(data: TrendData):
    if len(data.values) < 5:
        raise HTTPException(status_code=400, detail="At least 5 data points required")
    
    result = TrendEngine.analyze(data.values, data.keyword)
    return result

@app.post("/batch-analyze")
async def batch_analyze(trends: List[TrendData]):
    results = []
    for trend in trends:
        if len(trend.values) >= 5:
            result = TrendEngine.analyze(trend.values, trend.keyword)
            results.append(result)
    
    # Sort by priority
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    results.sort(key=lambda x: priority_order.get(x["priority"], 4))
    
    return {"results": results, "count": len(results)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

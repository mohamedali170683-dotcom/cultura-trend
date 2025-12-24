"""
TrendPulse API - FastAPI Backend
Cultural Trend Prediction using Epidemiological R0 Modeling
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import numpy as np
from scipy.signal import savgol_filter

app = FastAPI(
    title="TrendPulse API",
    description="Cultural Trend Prediction Platform using R0 Modeling",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic Models
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


class BatchAnalysisResult(BaseModel):
    results: List[dict]
    count: int


# Trend Analysis Engine
class TrendEngine:
    """
    Core engine for analyzing cultural trends using epidemiological modeling.

    Key metrics:
    - R0 (Basic Reproduction Number): Viral spread rate, >1 means spreading
    - SNR (Signal-to-Noise Ratio): How strong the signal is vs baseline
    - Velocity: Rate of change in the trend

    Phases: baseline -> emerging -> early_signal -> acceleration -> breakout -> peak -> decline
    """

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
        """
        Calculate the R0 (Basic Reproduction Number) for trend spread.

        R0 > 1: Trend is spreading/growing
        R0 < 1: Trend is declining
        R0 > 2: Viral/exponential growth
        """
        if len(values) < window + 3:
            return 0.0

        r0_values = []
        for i in range(window, len(values)):
            prev_mean = np.mean(values[i-window:i])
            if prev_mean > 0:
                r0_values.append(values[i] / prev_mean)

        return float(np.mean(r0_values[-3:])) if r0_values else 0.0

    @staticmethod
    def calculate_snr(current: float, baseline_mean: float, baseline_std: float) -> float:
        """Calculate Signal-to-Noise Ratio."""
        if baseline_std <= 0:
            return 0.0
        return (current - baseline_mean) / baseline_std

    @staticmethod
    def calculate_velocity(values: np.ndarray) -> float:
        """Calculate the velocity (rate of change) of the trend."""
        if len(values) < 5:
            return 0.0

        try:
            smoothed = savgol_filter(values, min(5, len(values)), 2)
            if smoothed[-2] > 0:
                return (smoothed[-1] - smoothed[-2]) / smoothed[-2]
        except Exception:
            pass

        return 0.0

    @staticmethod
    def classify_phase(snr: float, velocity: float, r0: float) -> tuple:
        """
        Classify the trend phase and priority based on metrics.

        Returns: (phase, priority)
        """
        if snr >= 5 and velocity >= 3 and r0 >= 2:
            return "breakout", "critical"
        elif snr >= 3 and velocity >= 1 and r0 >= 1:
            return "acceleration", "high"
        elif snr >= 2 and velocity >= 0.5:
            return "early_signal", "medium"
        elif snr >= 1.5 or velocity > 0:
            return "emerging", "low"
        else:
            return "baseline", "low"

    @staticmethod
    def estimate_peak_timing(r0: float, velocity: float) -> int:
        """Estimate days until trend reaches peak."""
        if r0 <= 1 or velocity <= 0:
            return 999

        peak_days = int(60 / max(r0, 0.5) / max(velocity + 1, 1))
        return max(7, min(365, peak_days))

    @staticmethod
    def determine_urgency(phase: str, peak_days: int) -> str:
        """Determine urgency level for content action."""
        if phase == "breakout" or peak_days < 7:
            return "immediate"
        elif phase == "acceleration" or peak_days < 14:
            return "same_day"
        elif peak_days < 30:
            return "fast_track"
        elif peak_days < 60:
            return "standard"
        else:
            return "planned"

    @staticmethod
    def calculate_confidence(data_length: int, snr: float, r0: float) -> float:
        """Calculate confidence score for the analysis."""
        data_quality = min(1.0, data_length / 90)
        snr_confidence = min(1.0, abs(snr) / 5) * 0.25
        r0_confidence = (min(1.0, r0 / 2) * 0.25) if r0 > 0.5 else 0

        return data_quality * 0.25 + snr_confidence + r0_confidence + 0.2

    @staticmethod
    def get_recommendations(urgency: str) -> List[dict]:
        """Get content recommendations based on urgency level."""
        recommendations_map = {
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
        return recommendations_map.get(urgency, [])

    @classmethod
    def analyze(cls, values: List[float], keyword: str) -> dict:
        """
        Perform complete trend analysis on the provided data.

        Args:
            values: Time series data points
            keyword: The trend keyword being analyzed

        Returns:
            Complete analysis results including phase, metrics, and recommendations
        """
        arr = np.array(values)

        # Calculate baseline statistics
        baseline_end = max(5, int(len(arr) * 0.3))
        baseline_mean = float(np.mean(arr[:baseline_end]))
        baseline_std = float(np.std(arr[:baseline_end]))

        # Current value
        current = float(arr[-1])

        # Calculate core metrics
        snr = cls.calculate_snr(current, baseline_mean, baseline_std)
        velocity = cls.calculate_velocity(arr)
        r0 = cls.calculate_r0(arr)

        # Classify phase and priority
        phase, priority = cls.classify_phase(snr, velocity, r0)

        # Estimate timing
        peak_days = cls.estimate_peak_timing(r0, velocity)
        first_mover_days = max(0, peak_days - 3)

        # Determine urgency and confidence
        urgency = cls.determine_urgency(phase, peak_days)
        confidence = cls.calculate_confidence(len(arr), snr, r0)

        # Get recommendations
        recommendations = cls.get_recommendations(urgency)

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
            "recommendations": recommendations
        }


# API Routes
@app.get("/")
async def root():
    """Health check and API info endpoint."""
    return {
        "message": "TrendPulse API v1.0.0",
        "description": "Cultural Trend Prediction Platform",
        "status": "healthy",
        "endpoints": {
            "health": "/health",
            "analyze": "POST /analyze",
            "batch": "POST /batch-analyze"
        }
    }


@app.get("/health")
async def health():
    """Detailed health status endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }


@app.post("/analyze", response_model=AnalysisResult)
async def analyze_trend(data: TrendData):
    """
    Analyze a single trend using R0 epidemiological modeling.

    Requires at least 5 data points for meaningful analysis.

    Returns phase classification, metrics, timing estimates, and content recommendations.
    """
    if len(data.values) < 5:
        raise HTTPException(
            status_code=400,
            detail="At least 5 data points required for trend analysis"
        )

    result = TrendEngine.analyze(data.values, data.keyword)
    return result


@app.post("/batch-analyze", response_model=BatchAnalysisResult)
async def batch_analyze(trends: List[TrendData]):
    """
    Analyze multiple trends in a single request.

    Results are sorted by priority (critical first).
    """
    results = []

    for trend in trends:
        if len(trend.values) >= 5:
            result = TrendEngine.analyze(trend.values, trend.keyword)
            if trend.brand:
                result["brand"] = trend.brand
            if trend.category:
                result["category"] = trend.category
            results.append(result)

    # Sort by priority
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    results.sort(key=lambda x: priority_order.get(x["priority"], 4))

    return {"results": results, "count": len(results)}


@app.get("/demo-data")
async def get_demo_data():
    """
    Get demo trend data for testing and demonstration purposes.
    """
    import random

    demo_trends = [
        {"keyword": "Ozempic Ernährung", "pattern": "breakout", "brand": "Nestlé"},
        {"keyword": "KI Chatbot Integration", "pattern": "acceleration", "brand": "Deutsche Telekom"},
        {"keyword": "Pflanzliche Proteine", "pattern": "emerging", "brand": "Nestlé"},
        {"keyword": "5G Smart Home", "pattern": "emerging", "brand": "Deutsche Telekom"},
    ]

    results = []
    for trend in demo_trends:
        # Generate synthetic time series data
        days = 90
        baseline = 25
        values = []

        for i in range(days):
            if trend["pattern"] == "breakout":
                value = baseline + random.random() * 5 if i < 70 else baseline + (1.15 ** (i - 70)) * 10
            elif trend["pattern"] == "acceleration":
                value = baseline + (1.03 ** i) * 5 + random.random() * 3
            else:  # emerging
                value = baseline + random.random() * 5 if i < 60 else baseline + (i - 60) * 1.5 + random.random() * 3

            values.append(max(0, value))

        analysis = TrendEngine.analyze(values, trend["keyword"])
        analysis["brand"] = trend["brand"]
        analysis["values"] = values[-30:]  # Last 30 days for charting
        results.append(analysis)

    return {"trends": results}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

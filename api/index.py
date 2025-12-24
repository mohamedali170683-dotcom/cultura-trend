"""
TrendPulse API - Vercel Serverless Function
Cultural Trend Prediction using Epidemiological R0 Modeling
"""
from http.server import BaseHTTPRequestHandler
import json
from typing import List
import math

class TrendEngine:
    """Core engine for analyzing cultural trends using epidemiological modeling."""

    @staticmethod
    def calculate_r0(values: list, window: int = 7) -> float:
        """Calculate the R0 (Basic Reproduction Number) for trend spread."""
        if len(values) < window + 3:
            return 0.0

        r0_values = []
        for i in range(window, len(values)):
            prev_sum = sum(values[i-window:i])
            prev_mean = prev_sum / window
            if prev_mean > 0:
                r0_values.append(values[i] / prev_mean)

        if r0_values:
            return sum(r0_values[-3:]) / len(r0_values[-3:])
        return 0.0

    @staticmethod
    def calculate_mean(values: list) -> float:
        return sum(values) / len(values) if values else 0

    @staticmethod
    def calculate_std(values: list) -> float:
        if len(values) < 2:
            return 0
        mean = sum(values) / len(values)
        variance = sum((x - mean) ** 2 for x in values) / len(values)
        return math.sqrt(variance)

    @staticmethod
    def analyze(values: list, keyword: str) -> dict:
        """Perform complete trend analysis on the provided data."""
        if len(values) < 5:
            return {"error": "At least 5 data points required"}

        # Calculate baseline statistics
        baseline_end = max(5, int(len(values) * 0.3))
        baseline_mean = TrendEngine.calculate_mean(values[:baseline_end])
        baseline_std = TrendEngine.calculate_std(values[:baseline_end])

        # Current value
        current = values[-1]

        # Calculate SNR
        snr = (current - baseline_mean) / baseline_std if baseline_std > 0 else 0

        # Calculate velocity (simplified)
        if len(values) >= 5:
            recent = values[-5:]
            velocity = (recent[-1] - recent[0]) / max(recent[0], 1) / 5
        else:
            velocity = 0

        # Calculate R0
        r0 = TrendEngine.calculate_r0(values)

        # Classify phase and priority
        if snr >= 5 and velocity >= 0.5 and r0 >= 2:
            phase, priority = "breakout", "critical"
        elif snr >= 3 and velocity >= 0.2 and r0 >= 1:
            phase, priority = "acceleration", "high"
        elif snr >= 2 and velocity >= 0.1:
            phase, priority = "early_signal", "medium"
        elif snr >= 1.5 or velocity > 0:
            phase, priority = "emerging", "low"
        else:
            phase, priority = "baseline", "low"

        # Estimate timing
        if r0 > 1 and velocity > 0:
            peak_days = int(60 / max(r0, 0.5) / max(velocity + 1, 1))
            peak_days = max(7, min(365, peak_days))
        else:
            peak_days = 999

        first_mover_days = max(0, peak_days - 3)

        # Determine urgency
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

        # Calculate confidence
        data_quality = min(1.0, len(values) / 90)
        confidence = (data_quality * 0.25 + min(1, abs(snr) / 5) * 0.25 +
                     (min(1, r0 / 2) * 0.25 if r0 > 0.5 else 0) + 0.2)

        # Get recommendations
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


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        response = {
            "message": "TrendPulse API v1.0.0",
            "description": "Cultural Trend Prediction Platform",
            "status": "healthy",
            "endpoints": {
                "GET /api": "Health check",
                "POST /api/analyze": "Analyze single trend",
                "POST /api/batch": "Analyze multiple trends"
            }
        }
        self.wfile.write(json.dumps(response).encode())

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)

        try:
            data = json.loads(post_data.decode())
        except json.JSONDecodeError:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Invalid JSON"}).encode())
            return

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        # Handle single analysis
        if "keyword" in data and "values" in data:
            result = TrendEngine.analyze(data["values"], data["keyword"])
            self.wfile.write(json.dumps(result).encode())
        # Handle batch analysis
        elif "trends" in data:
            results = []
            for trend in data["trends"]:
                if "keyword" in trend and "values" in trend:
                    result = TrendEngine.analyze(trend["values"], trend["keyword"])
                    if "brand" in trend:
                        result["brand"] = trend["brand"]
                    results.append(result)

            priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
            results.sort(key=lambda x: priority_order.get(x.get("priority", "low"), 4))
            self.wfile.write(json.dumps({"results": results, "count": len(results)}).encode())
        else:
            self.wfile.write(json.dumps({"error": "Missing keyword and values"}).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

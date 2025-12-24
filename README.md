# TrendPulse

**Cultural Trend Prediction Platform using Epidemiological R0 Modeling**

A B2B SaaS platform that predicts cultural trends 30-180 days before they peak, enabling marketing teams to create timely, relevant content.

## Overview

TrendPulse uses epidemiological modeling (specifically R0 - Basic Reproduction Number) to analyze how cultural trends spread through populations, similar to how diseases spread. This scientific approach provides:

- **Early Detection**: Identify emerging trends before they go mainstream
- **Timing Predictions**: Estimate when trends will peak
- **First-Mover Advantage**: Calculate optimal content publishing windows
- **Actionable Recommendations**: Get specific content suggestions based on trend urgency

## Key Metrics

| Metric | Description | Interpretation |
|--------|-------------|----------------|
| **R0** | Basic Reproduction Number | >1 = spreading, >2 = viral growth |
| **SNR** | Signal-to-Noise Ratio | Strength of trend vs. baseline noise |
| **Velocity** | Rate of Change | How fast the trend is accelerating |
| **Peak Days** | Estimated time to peak | Days until maximum interest |
| **First-Mover Window** | Optimal action window | Days to publish for maximum impact |

## Trend Phases

```
baseline -> emerging -> early_signal -> acceleration -> breakout -> peak -> decline
```

| Phase | Priority | Action Required |
|-------|----------|-----------------|
| Breakout | Critical | Immediate (< 2 hours) |
| Acceleration | High | Same Day |
| Early Signal | Medium | Fast Track (1 week) |
| Emerging | Low | Planned (1-2 months) |

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development
- Recharts for data visualization
- Lucide React for icons
- Custom CSS (no framework dependencies)

### Backend
- Python FastAPI
- NumPy & SciPy for scientific computing
- Pydantic for data validation

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m app.main
# API at http://localhost:8000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check and API info |
| GET | `/health` | Detailed health status |
| POST | `/analyze` | Analyze single trend |
| POST | `/batch-analyze` | Analyze multiple trends |
| GET | `/demo-data` | Get demo trend data |

### Example API Call

```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "AI trends",
    "values": [20, 25, 32, 45, 78, 120, 180, 250, 320]
  }'
```

### Response

```json
{
  "keyword": "AI trends",
  "phase": "acceleration",
  "priority": "high",
  "r0": 1.85,
  "snr": 6.8,
  "velocity": 1.8,
  "peak_days": 28,
  "first_mover_days": 25,
  "confidence": 0.88,
  "urgency": "same_day",
  "recommendations": [
    {"type": "Social Media Series", "deadline": "24 hours", "priority": "high"},
    {"type": "Blog Post Draft", "deadline": "48 hours", "priority": "medium"}
  ]
}
```

## Features

### Dashboard
- Real-time signal monitoring with priority-based sorting
- Interactive trend cards with mini-charts
- Filtering by priority, brand, and keyword search
- Priority distribution visualization

### Signal Details
- 90-day trend evolution charts
- Detailed metrics breakdown
- First-mover advantage window calculator
- Content action recommendations

### Quick Actions
- Weekly report generation
- Alert configuration
- Keyword management
- Export functionality

## Target Market

### Primary
- Marketing agencies (WPP, Publicis, Omnicom)
- Enterprise marketing teams

### Secondary
- PR agencies
- Brand strategists
- Content marketing teams

### Use Cases
- Content calendar planning
- Newsjacking opportunities
- Campaign timing optimization
- Competitive intelligence

## Pricing Tiers (Planned)

| Tier | Price | Brands | Keywords | Features |
|------|-------|--------|----------|----------|
| Starter | $499/mo | 3 | 100 | Dashboard, Alerts |
| Professional | $1,499/mo | 10 | 500 | + API, Reports |
| Enterprise | $4,999/mo | Unlimited | Unlimited | + White-label, SLA |

## Project Structure

```
cultura-trend/
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Main dashboard component
│   │   ├── App.css          # Styling
│   │   ├── main.tsx         # Entry point
│   │   └── vite-env.d.ts    # TypeScript declarations
│   ├── public/
│   │   └── vite.svg         # Favicon
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py          # FastAPI application
│   └── requirements.txt
└── README.md
```

## Development Roadmap

### MVP (Current)
- [x] Dashboard with trend signals
- [x] Trend analysis engine (R0 modeling)
- [x] Signal phase classification
- [x] Content recommendations

### Phase 2
- [ ] Google Trends API integration
- [ ] User authentication (Supabase)
- [ ] Email/Slack notifications
- [ ] PDF/Excel export

### Phase 3
- [ ] AI content brief generation (OpenAI)
- [ ] Multi-tenant architecture
- [ ] API key management
- [ ] White-label support

## License

Proprietary - All rights reserved

---

Built with R0 Science for Cultural Trend Prediction

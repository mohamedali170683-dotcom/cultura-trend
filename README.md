# TrendPulse - Cultural Trend Prediction Platform

> B2B SaaS platform for predicting cultural trends 30-800 days before they peak using epidemiological R₀ modeling.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.12+
- Git

### Installation

#### 1. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at **http://localhost:5173**

#### 2. Backend Setup
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python -m app.main
```

The API will be available at **http://localhost:8000**

### Verify Installation

1. **Frontend**: Open http://localhost:5173 in your browser
   - You should see the TrendPulse dashboard with 8 mock trend signals
   - Try clicking on a signal card to see the detailed modal view
   - Test the filters and search functionality

2. **Backend**: Test the API
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-01T..."
}
```

## 📁 Project Structure

```
trendpulse/
├── frontend/               # React + TypeScript + Vite
│   ├── src/
│   │   ├── App.tsx        # Main dashboard component
│   │   ├── App.css        # Custom styling
│   │   ├── main.tsx       # React entry point
│   │   └── vite-env.d.ts
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/                # Python FastAPI
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py        # API routes & trend analysis engine
│   ├── venv/              # Python virtual environment
│   └── requirements.txt
│
└── README.md
```

## 🎯 Key Features

### Current Implementation (Demo v1.0)
- ✅ Dashboard with 8 mock trend signals
- ✅ Real-time metrics: R₀, Signal/Noise Ratio, Velocity, Peak Days
- ✅ Phase classification: baseline → emerging → early_signal → acceleration → breakout → peak → decline
- ✅ Priority-based alerts (Critical, High, Medium, Low)
- ✅ Interactive signal cards with mini trend charts
- ✅ Detailed modal views with full trend analysis
- ✅ Content recommendations based on urgency
- ✅ First-mover advantage window calculations
- ✅ Filter by priority, brand, and search
- ✅ FastAPI backend with trend analysis engine
- ✅ R₀ calculation using epidemiological modeling

### How It Works

#### Frontend (`frontend/src/App.tsx`)
- **Dashboard**: Displays active signals, critical alerts, and metrics
- **Signal Cards**: Show trend preview, phase, priority, and key metrics
- **Modal View**: Detailed analysis with 90-day trend chart, recommendations, and timing
- **Filters**: Search, priority filtering, brand filtering

#### Backend (`backend/app/main.py`)
- **TrendEngine**: Core analysis engine
  - Calculates R₀ (Basic Reproduction Number)
  - Computes Signal-to-Noise Ratio
  - Measures velocity (rate of change)
  - Classifies trend phase
  - Predicts peak timing
  - Generates urgency levels and recommendations

#### API Endpoints
- `GET /` - Health check
- `GET /health` - Detailed health status
- `POST /analyze` - Analyze single trend
  ```json
  {
    "keyword": "AI trends",
    "values": [20, 25, 32, 45, 78, 120, 180],
    "brand": "Optional",
    "category": "Technology"
  }
  ```
- `POST /batch-analyze` - Analyze multiple trends

## 📊 Key Metrics Explained

### R₀ (Basic Reproduction Number)
- **> 2.0**: Super viral (immediate action required)
- **1.5 - 2.0**: Viral spread (high priority)
- **1.0 - 1.5**: Spreading (monitor closely)
- **< 1.0**: Declining or stable

### Signal-to-Noise Ratio (SNR)
- Measures how strong the signal is compared to baseline noise
- **> 5.0**: Breakout (critical)
- **> 3.0**: Acceleration (high)
- **> 2.0**: Early signal (medium)
- **> 1.5**: Emerging (low)

### Phase Classification
1. **Baseline**: No significant change
2. **Emerging**: First signs of growth
3. **Early Signal**: Clear upward trend
4. **Acceleration**: Rapid growth phase
5. **Breakout**: Explosive viral growth
6. **Peak**: Maximum attention
7. **Decline**: Decreasing interest

### Urgency Levels
- **Immediate** (< 2 hours): Real-time social posts, newsjacking
- **Same Day** (24 hours): Social media series, blog posts
- **Fast Track** (1-2 weeks): Thought leadership, video content
- **Standard** (2-4 weeks): Pillar content, video series
- **Planned** (1-3 months): Long-form content, campaigns

## 🛠 Tech Stack

### Frontend
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool & dev server
- **Recharts**: Data visualization
- **Lucide React**: Icons
- **Custom CSS**: Styling (no Tailwind)

### Backend
- **FastAPI**: Modern Python web framework
- **NumPy**: Numerical computing
- **SciPy**: Scientific computing (Savitzky-Golay filtering)
- **Pydantic**: Data validation
- **Uvicorn**: ASGI server

## 🔮 Next Steps & Roadmap

### Phase 1: Data Integration (Weeks 1-2)
- [ ] Google Trends API integration
- [ ] Twitter/X API for social signals
- [ ] Reddit API for community trends
- [ ] News API for media mentions
- [ ] TikTok trend scraping

### Phase 2: Authentication & User Management (Weeks 3-4)
- [ ] Supabase authentication
- [ ] User roles (Admin, Manager, Analyst)
- [ ] Brand/client management
- [ ] API key management for enterprise

### Phase 3: Enhanced Analytics (Weeks 5-6)
- [ ] Historical trend database (PostgreSQL)
- [ ] Advanced R₀ modeling with multiple sources
- [ ] Competitor trend analysis
- [ ] Geographic trend mapping
- [ ] Industry-specific trend categories

### Phase 4: AI Features (Weeks 7-8)
- [ ] OpenAI integration for content brief generation
- [ ] GPT-4 trend summarization
- [ ] Automated headline suggestions
- [ ] Content strategy recommendations

### Phase 5: Alerts & Notifications (Weeks 9-10)
- [ ] Email alerts (SendGrid/Resend)
- [ ] Slack integration
- [ ] Microsoft Teams integration
- [ ] Webhook support for custom integrations
- [ ] Mobile push notifications

### Phase 6: Reporting & Export (Weeks 11-12)
- [ ] PDF report generation
- [ ] Excel/CSV export
- [ ] Weekly email digests
- [ ] Custom report templates
- [ ] White-label reports for agencies

### Phase 7: Enterprise Features (Months 4-6)
- [ ] Multi-brand management
- [ ] Team collaboration tools
- [ ] Custom alert rules
- [ ] SLA monitoring
- [ ] Dedicated support
- [ ] SSO (SAML/OAuth)

## 💼 Business Model

### Pricing Tiers
- **Starter**: $499/mo
  - 3 brands, 100 keywords
  - Basic alerts
  - 7-day data retention
  
- **Professional**: $1,499/mo
  - 10 brands, 500 keywords
  - API access
  - 90-day data retention
  - Email alerts
  
- **Enterprise**: $4,999/mo
  - Unlimited brands & keywords
  - White-label
  - 1-year data retention
  - SLA + dedicated support
  - Custom integrations

### Target Market
- **Primary**: Marketing agencies (WPP, Publicis, Omnicom)
- **Secondary**: Enterprise brands (Fortune 500)
- **Tertiary**: PR agencies, investor research firms

### Revenue Projections
- **Year 1**: $900K ARR, 50 customers
- **Year 3**: $12M ARR, 500 customers
- **Year 5**: $60M ARR, 2,000 customers

## 🧪 Testing the API

### Example: Analyze a Trend
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "Ozempic diet trends",
    "values": [
      15, 18, 22, 25, 28, 32, 38, 45, 55, 70,
      92, 120, 160, 210, 280, 370, 480, 620, 790, 980
    ]
  }'
```

### Expected Response
```json
{
  "keyword": "Ozempic diet trends",
  "phase": "breakout",
  "priority": "critical",
  "r0": 2.34,
  "snr": 12.5,
  "velocity": 3.2,
  "peak_days": 14,
  "first_mover_days": 11,
  "confidence": 0.92,
  "urgency": "immediate",
  "recommendations": [
    {
      "type": "Real-time Social Post",
      "deadline": "< 2 hours",
      "priority": "critical"
    },
    {
      "type": "Newsjacking Thread",
      "deadline": "< 4 hours",
      "priority": "high"
    }
  ]
}
```

## 📚 Documentation

### Frontend Components
- `App`: Main application shell
- `StatCard`: Metric display cards
- `SignalCard`: Individual trend signal cards
- `SignalModal`: Detailed trend analysis modal
- `Badge`: Status badges (priority, phase)
- `PhaseBadge`: Trend phase indicators

### Backend Classes
- `TrendEngine`: Core analysis engine
- `TrendData`: Input data model
- `AnalysisResult`: Output data model

### Utility Functions
- `generateTrendData()`: Creates mock trend data for visualization
- `calculate_r0()`: Computes viral reproduction number
- `analyze()`: Main trend analysis pipeline

## 🐛 Troubleshooting

### Frontend Issues

**Port 5173 already in use**
```bash
# Kill the process using port 5173
kill -9 $(lsof -ti:5173)
# Or use a different port
npm run dev -- --port 3000
```

**Dependencies missing**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Backend Issues

**Port 8000 already in use**
```bash
# Kill the process using port 8000
kill -9 $(lsof -ti:8000)
# Or run on a different port
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

**Import errors**
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt --force-reinstall
```

## 🤝 Contributing

This is a private project. For questions or contributions, contact the development team.

## 📄 License

Proprietary - All rights reserved.

---

**Built by WPP Media Germany • Powered by R₀ Science**

Last Updated: December 1, 2025

# FoodGuard AI — Food Adulteration Detection System

Full-stack AI application for detecting food adulteration using ML models.

## Stack
- **Frontend**: React 18 + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI (Python 3.11)
- **Database**: Supabase (PostgreSQL)
- **ML**: scikit-learn, XGBoost, TensorFlow
- **Deploy**: Vercel (frontend) + Railway (backend)

## Quick Start

### 1. ML Pipeline
```bash
cd ml
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
jupyter notebook notebooks/01_eda.ipynb
```

### 2. Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in Supabase keys
uvicorn app.main:app --reload
```

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env.local   # fill in API URL + Supabase keys
npm run dev
```

## Docs
- [API Reference](docs/api/README.md)
- [ML Pipeline](docs/ml/README.md)
- [Setup Guide](docs/setup/README.md)

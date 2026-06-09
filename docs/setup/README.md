# Setup Guide

## Prerequisites
- Node.js 20+, Python 3.11+, Docker (optional), Supabase account

## Steps
1. Clone repo and open `foodguard.code-workspace` in VS Code
2. Install recommended extensions when prompted
3. Follow Quick Start in root README.md
4. Supabase: create tables `detections`, `samples`, `model_runs`
5. Download dataset from Kaggle → place in `ml/data/raw/`
6. Run notebook `01_eda.ipynb`, then `train_xgboost.py`
7. Copy model `.joblib` to `backend/models/`
8. Start backend: `uvicorn app.main:app --reload`
9. Start frontend: `npm run dev`

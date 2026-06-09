import os
import sys

# -------------------------------
# FIX IMPORT PATH
# -------------------------------
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from src.preprocessing.pipeline import load_and_preprocess_data

from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

from xgboost import XGBClassifier
import joblib

# -------------------------------
# CONFIG
# -------------------------------
DATA_PATH = "data/raw/food.csv"


# -------------------------------
# LOAD & PREPROCESS
# -------------------------------
X, y, label_encoder = load_and_preprocess_data(DATA_PATH)

print("✅ Final dataset shape:", X.shape)


# -------------------------------
# TRAIN-TEST SPLIT (NOW SAFE)
# -------------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y,  # now works because rare classes removed
)


# -------------------------------
# MODEL (OPTIMIZED)
# -------------------------------
model = XGBClassifier(
    n_estimators=500,
    max_depth=10,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    gamma=0.1,
    min_child_weight=3,
    random_state=42,
    eval_metric="mlogloss",
    use_label_encoder=False,
)


# -------------------------------
# TRAIN
# -------------------------------
model.fit(X_train, y_train)


# -------------------------------
# EVALUATE
# -------------------------------
y_pred = model.predict(X_test)

accuracy = accuracy_score(y_test, y_pred)

print("\n🔥 Accuracy:", accuracy)
print("\n📊 Classification Report:\n")
print(classification_report(y_test, y_pred))


# -------------------------------
# FEATURE IMPORTANCE (DEBUG)
# -------------------------------
import pandas as pd

importance = pd.DataFrame(
    {"Feature": X.columns, "Importance": model.feature_importances_}
).sort_values(by="Importance", ascending=False)

print("\n🔝 Top Features:\n", importance.head(10))


# -------------------------------
# SAVE MODEL
# -------------------------------
os.makedirs("models", exist_ok=True)

joblib.dump(model, "models/xgboost_model.pkl")
joblib.dump(label_encoder, "models/label_encoder.pkl")

print("\n✅ Model saved successfully!")

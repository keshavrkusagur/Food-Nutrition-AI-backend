import numpy as np
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import json
import io
import joblib
import pandas as pd

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],         # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# 📁 PATHS
# =========================
MODEL_PATH = r"C:\Users\kesha\Downloads\foodguard-ai\foodguard-ai\backend\ml\models\food_model.h5"
CLASS_NAMES_PATH = r"C:\Users\kesha\Downloads\foodguard-ai\foodguard-ai\backend\ml\models\class_names.json"
NUTRITION_MODEL_PATH = r"C:\Users\kesha\Downloads\foodguard-ai\foodguard-ai\backend\ml\models\xgboost_model.pkl"
NUTRITION_DATA_PATH = r"C:\Users\kesha\Downloads\foodguard-ai\foodguard-ai\backend\ml\data\raw\food.csv"

IMG_SIZE = (224, 224)

# =========================
# 🔄 LOAD MODELS
# =========================
model = tf.keras.models.load_model(MODEL_PATH)

with open(CLASS_NAMES_PATH, "r") as f:
    class_names = json.load(f)

nutrition_model = joblib.load(NUTRITION_MODEL_PATH)  # (optional use)
nutrition_df = pd.read_csv(NUTRITION_DATA_PATH)

# =========================
# 🖼️ IMAGE PREPROCESS
# =========================
def preprocess_image(image_bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize(IMG_SIZE)

    img_array = np.array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    return img_array

# =========================
# 🍎 NUTRITION LOOKUP
# =========================
def get_nutrition(food_name):
    try:
        food_name = food_name.lower().strip()

        # search in BOTH Category and Description
        result = nutrition_df[
            nutrition_df['Category'].str.lower().str.contains(food_name, na=False) |
            nutrition_df['Description'].str.lower().str.contains(food_name, na=False)
        ]

        if not result.empty:
            return result.iloc[0].to_dict()

        return None

    except Exception as e:
        print("Nutrition error:", e)
        return None

# =========================
# ❤️ HEALTH SCORING
# =========================
def health_score(nutrition):
    try:
        if nutrition is None:
            return "Unknown ⚠️"

        calories = float(nutrition.get("Data.Kilocalories", 0))
        fat = float(nutrition.get("Data.Fat.Total Lipid", 0))
        sugar = float(nutrition.get("Data.Sugar Total", 0))

        if calories < 200 and fat < 10:
            return "Healthy ✅"
        elif calories < 400:
            return "Moderate ⚖️"
        else:
            return "Unhealthy ❌"

    except Exception as e:
        print("Health error:", e)
        return "Error"

# =========================
# 🔍 PREDICTION API
# =========================
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    try:
        contents = await file.read()

        img_array = preprocess_image(contents)
        predictions = model.predict(img_array)

        predicted_class = class_names[np.argmax(predictions)]
        confidence = float(np.max(predictions))

        nutrition = get_nutrition(predicted_class)

        # SAFE handling
        if nutrition is None:
            return {
                "food": predicted_class,
                "confidence": round(confidence, 3),
                "nutrition": "Not found in database ⚠️",
                "health": "Unknown"
            }

        health = health_score(nutrition)

        return {
            "food": predicted_class,
            "confidence": round(confidence, 3),
            "nutrition": nutrition,
            "health": health
        }

    except Exception as e:
        return {"error": str(e)}

# =========================
# 🏠 ROOT
# =========================
@app.get("/")
def home():
    return {"message": "FoodGuard AI is running 🚀"}
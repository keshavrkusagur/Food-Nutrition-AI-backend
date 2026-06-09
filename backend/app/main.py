from fastapi import FastAPI, File, UploadFile, Form
import uvicorn
import numpy as np
import pandas as pd
import joblib
import tensorflow as tf
from PIL import Image
import io
import os

app = FastAPI()

# -------------------------
# LOAD MODELS
# -------------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

image_model_path = os.path.join(BASE_DIR, "ml", "models", "image_model.h5")
xgb_model_path = os.path.join(BASE_DIR, "ml", "models", "xgboost_model.pkl")
label_path = os.path.join(BASE_DIR, "ml", "models", "label_encoder.pkl")

image_model = tf.keras.models.load_model(image_model_path)
xgb_model = joblib.load(xgb_model_path)
label_encoder = joblib.load(label_path)

# ⚠️ CHANGE THIS BASED ON TRAINING
class_names = ["fresh", "rotten"]

# -------------------------
# IMAGE PREDICTION
# -------------------------
def predict_image(file):
    img = Image.open(io.BytesIO(file)).convert("RGB")
    img = img.resize((224, 224))
    
    img_array = np.array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    prediction = image_model.predict(img_array)
    class_index = np.argmax(prediction)

    return class_names[class_index], float(np.max(prediction))


# -------------------------
# XGBOOST PREDICTION
# -------------------------
def predict_nutrition(data):
    df = pd.DataFrame([data])
    pred = xgb_model.predict(df)
    label = label_encoder.inverse_transform(pred)
    return label[0]


# -------------------------
# TEST IMAGE ONLY
# -------------------------
@app.post("/test-image")
async def test_image(file: UploadFile = File(...)):
    contents = await file.read()
    label, confidence = predict_image(contents)

    return {
        "prediction": label,
        "confidence": confidence
    }


# -------------------------
# TEST XGBOOST ONLY
# -------------------------
@app.post("/test-xgb")
async def test_xgb(
    calories: float = Form(...),
    protein: float = Form(...),
    fat: float = Form(...),
    carbs: float = Form(...)
):
    data = {
        "calories": calories,
        "protein": protein,
        "fat": fat,
        "carbs": carbs
    }

    result = predict_nutrition(data)

    return {"prediction": result}


# -------------------------
# COMBINED TEST
# -------------------------
@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    calories: float = Form(...),
    protein: float = Form(...),
    fat: float = Form(...),
    carbs: float = Form(...)
):
    contents = await file.read()

    img_label, confidence = predict_image(contents)

    nutrition_data = {
        "calories": calories,
        "protein": protein,
        "fat": fat,
        "carbs": carbs
    }

    nutrition_label = predict_nutrition(nutrition_data)

    return {
        "image_prediction": img_label,
        "confidence": confidence,
        "nutrition_prediction": nutrition_label
    }
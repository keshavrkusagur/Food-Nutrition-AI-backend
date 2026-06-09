from fastapi import FastAPI, File, UploadFile, Form
import numpy as np
import pandas as pd
import joblib
from PIL import Image
import io
import os
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# -------------------------
# PATH SETUP (FIXED)
# -------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

image_model_path = os.path.join(BASE_DIR, "ml", "models", "food_model.h5")
xgb_model_path = os.path.join(BASE_DIR, "ml", "models", "xgboost_model.pkl")
label_path = os.path.join(BASE_DIR, "ml", "models", "label_encoder.pkl")

print("Image model path:", image_model_path)
print("Exists:", os.path.exists(image_model_path))

print("XGB model path:", xgb_model_path)
print("Exists:", os.path.exists(xgb_model_path))

# -------------------------
# LOAD MODELS
# -------------------------
image_model = tf.keras.models.load_model(image_model_path)
xgb_model = joblib.load(xgb_model_path)
label_encoder = joblib.load(label_path)

# ⚠️ MUST MATCH TRAINING
class_names = ["fresh", "rotten"]

# -------------------------
# IMAGE PREDICTION
# -------------------------
def predict_image(file_bytes):
    img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    img = img.resize((224, 224))

    img_array = np.array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    prediction = image_model.predict(img_array)
    class_index = np.argmax(prediction)

    return class_names[class_index], float(np.max(prediction))


# -------------------------
# XGBOOST PREDICTION
# -------------------------
def predict_nutrition(data_dict):
    df = pd.DataFrame([data_dict])

    # Debug (IMPORTANT)
    print("Input DataFrame:", df)

    pred = xgb_model.predict(df)
    label = label_encoder.inverse_transform(pred)

    return label[0]


# -------------------------
# TEST IMAGE MODEL
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
# TEST XGBOOST MODEL
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
# COMBINED MODEL
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

    # Image prediction
    img_label, confidence = predict_image(contents)

    # Nutrition prediction
    nutrition_data = {
        "calories": calories,
        "protein": protein,
        "fat": fat,
        "carbs": carbs
    }

    nutrition_label = predict_nutrition(nutrition_data)

    # Final decision logic
    if img_label == "rotten":
        final = "❌ Unsafe to eat"
    elif nutrition_label == "unhealthy":
        final = "⚠️ Not recommended"
    else:
        final = "✅ Safe & Good"

    return {
        "image_prediction": img_label,
        "confidence": confidence,
        "nutrition_prediction": nutrition_label,
        "final_result": final
    }

import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
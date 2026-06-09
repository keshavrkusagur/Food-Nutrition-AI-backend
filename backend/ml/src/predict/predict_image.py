import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing import image
import json
import os

# =========================
# 📁 PATHS
# =========================
MODEL_PATH = r"C:\Users\kesha\Downloads\foodguard-ai\foodguard-ai\ml\models\food_model.h5"
CLASS_NAMES_PATH = r"C:\Users\kesha\Downloads\foodguard-ai\foodguard-ai\ml\models\class_names.json"

IMG_SIZE = (224, 224)

# =========================
# 🔄 LOAD MODEL
# =========================
model = tf.keras.models.load_model(MODEL_PATH)

with open(CLASS_NAMES_PATH, "r") as f:
    class_names = json.load(f)

# =========================
# 🖼️ IMAGE PREPROCESS
# =========================
def preprocess_image(img_path):
    img = image.load_img(img_path, target_size=IMG_SIZE)
    img_array = image.img_to_array(img)
    img_array = img_array / 255.0
    img_array = np.expand_dims(img_array, axis=0)
    return img_array

# =========================
# 🔍 PREDICT FUNCTION
# =========================
def predict(img_path):
    img_array = preprocess_image(img_path)
    
    predictions = model.predict(img_array)
    predicted_class = class_names[np.argmax(predictions)]
    confidence = np.max(predictions)

    return predicted_class, confidence

# =========================
# ▶️ TEST
# =========================
if __name__ == "__main__":
    test_image = r"C:\Users\kesha\Downloads\foodguard-ai\foodguard-ai\ml\data\images\butter\butter.1.jpg"  # CHANGE THIS
    
    label, conf = predict(test_image)
    
    print(f"🍽️ Prediction: {label}")
    print(f"📊 Confidence: {conf:.2f}")
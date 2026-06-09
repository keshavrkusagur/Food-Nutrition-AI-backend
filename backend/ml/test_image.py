@app.post("/test-image")
async def test_image(file: UploadFile = File(...)):
    if image_model is None:
        return {"error": "Image model not loaded"}

    try:
        contents = await file.read()

        # ✅ FIX 1: Force RGB
        img = Image.open(io.BytesIO(contents)).convert("RGB")

        # ✅ FIX 2: Resize
        img = img.resize((224, 224))

        # ✅ FIX 3: Normalize
        img_array = np.array(img) / 255.0

        # ✅ FIX 4: Expand dims
        img_array = np.expand_dims(img_array, axis=0)

        # ✅ DEBUG
        print("Input shape:", img_array.shape)

        preds = image_model.predict(img_array)

        print("Raw prediction:", preds)

        predicted_class = int(np.argmax(preds))
        confidence = float(np.max(preds))

        return {
            "prediction": predicted_class,
            "confidence": confidence
        }

    except Exception as e:
        print("❌ ERROR:", str(e))
        return {"error": str(e)}
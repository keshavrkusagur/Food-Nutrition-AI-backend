import joblib, numpy as np, os
from datetime import datetime, timezone
from app.core.config import settings

class InferenceService:
    def __init__(self):
        self.active_model = settings.ACTIVE_MODEL
        self._models: dict = {}
        self._load_model(self.active_model)

    def _load_model(self, name: str):
        path = os.path.join(settings.MODEL_DIR, f"{name}.joblib")
        if os.path.exists(path):
            self._models[name] = joblib.load(path)

    def predict(self, category: str, parameters: dict, threshold: float) -> dict:
        model = self._models.get(self.active_model)
        if not model:
            raise RuntimeError(f"Model '{self.active_model}' not loaded")
        features = list(parameters.values())
        proba = model.predict_proba([features])[0]
        confidence = float(np.max(proba))
        label_idx  = int(np.argmax(proba))
        if confidence < threshold:
            result = "INCONCLUSIVE"
        elif label_idx == 1:
            result = "ADULTERATED"
        else:
            result = "CLEAN"
        return {
            "result": result,
            "confidence": round(confidence, 4),
            "adulterants": [],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

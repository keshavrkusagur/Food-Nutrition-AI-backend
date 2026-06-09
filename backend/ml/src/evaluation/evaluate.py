import joblib, json
import numpy as np
from sklearn.metrics import (
    classification_report, confusion_matrix,
    roc_auc_score, f1_score, precision_score, recall_score
)

def evaluate_model(model_path: str, X_test, y_test) -> dict:
    bundle = joblib.load(model_path)
    model, pipe, le = bundle["model"], bundle["pipeline"], bundle["label_encoder"]
    X_t    = pipe.transform(X_test)
    y_pred = model.predict(X_t)
    y_proba= model.predict_proba(X_t)
    metrics = {
        "accuracy":         float(np.mean(y_pred == y_test)),
        "f1":               float(f1_score(y_test, y_pred, average="weighted")),
        "precision":        float(precision_score(y_test, y_pred, average="weighted")),
        "recall":           float(recall_score(y_test, y_pred, average="weighted")),
        "roc_auc":          float(roc_auc_score(y_test, y_proba, multi_class="ovr")),
        "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
    }
    print(json.dumps(metrics, indent=2))
    return metrics

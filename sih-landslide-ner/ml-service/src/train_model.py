import os
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import classification_report, accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
import joblib

# Paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATA_PATH = os.path.join(BASE_DIR, "data-pipeline", "processed", "ml_training_dataset_real.csv")
MODEL_DIR = os.path.join(BASE_DIR, "ml-service", "models")
MODEL_PATH = os.path.join(MODEL_DIR, "rf_landslide_model.pkl")

os.makedirs(MODEL_DIR, exist_ok=True)

# Load data
print(f"Loading data from {DATA_PATH}...")
df = pd.read_csv(DATA_PATH)

# ==========================================
# SINGLE SOURCE OF TRUTH: FEATURES
# ==========================================
# Prediction Horizon: "Next 24 hours"
# We drop rain_event_day_mm (leakage) and lat/lon (spatial memorization).
FEATURES = [
    'slope',
    'clay_percent',
    'rain_day_minus_3_mm', 
    'rain_day_minus_2_mm', 
    'rain_day_minus_1_mm'
]

X = df[FEATURES]
y = df['target']
groups = df['id'] # Group by event ID so Safe and Danger rows stay in the same split!

# ==========================================
# TRAIN / TEST SPLIT
# ==========================================
print("Splitting data using GroupShuffleSplit...")
# GroupShuffleSplit ensures an entire event's location/history goes to either Train or Test, not both.
gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
train_idx, test_idx = next(gss.split(X, y, groups))

X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]

# ==========================================
# TRAIN MODEL
# ==========================================
print("Training Random Forest Classifier...")
rf = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
rf.fit(X_train, y_train)

# ==========================================
# EVALUATE MODEL
# ==========================================
print("\nEvaluating Early-Warning Model...")
y_pred = rf.predict(X_test)
y_prob = rf.predict_proba(X_test)[:, np.where(rf.classes_ == 1)[0][0]]

print(f"Accuracy:  {accuracy_score(y_test, y_pred):.2f}")
print(f"Precision: {precision_score(y_test, y_pred):.2f}")
print(f"Recall:    {recall_score(y_test, y_pred):.2f}")
print(f"F1-Score:  {f1_score(y_test, y_pred):.2f}")
print(f"ROC-AUC:   {roc_auc_score(y_test, y_prob):.2f}")

print("\nConfusion Matrix (Safe=0, Danger=1):")
print(confusion_matrix(y_test, y_pred))

print("\nClassification Report:")
print(classification_report(y_test, y_pred))

# ==========================================
# SAVE ARTIFACT
# ==========================================
# Save both the model and the strict feature list required for inference
artifact = {
    'model': rf,
    'features': FEATURES
}
joblib.dump(artifact, MODEL_PATH)
print(f"\n✅ Reproducible model artifact saved to {MODEL_PATH}")


import os
import pandas as pd
import numpy as np
import joblib
from datetime import datetime

from sklearn.model_selection import GroupShuffleSplit
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import HistGradientBoostingClassifier, GradientBoostingClassifier
from sklearn.metrics import (
    classification_report, 
    accuracy_score, 
    precision_score, 
    recall_score, 
    f1_score, 
    roc_auc_score, 
    brier_score_loss,
    confusion_matrix
)

# Paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATA_PATH = os.path.join(BASE_DIR, "data-pipeline", "processed", "ml_training_dataset_advanced.csv")
MODEL_DIR = os.path.join(BASE_DIR, "ml-service", "models")
MODEL_PATH = os.path.join(MODEL_DIR, "xgb_landslide_model.pkl")
LEGACY_MODEL_PATH = os.path.join(MODEL_DIR, "rf_landslide_model.pkl")

os.makedirs(MODEL_DIR, exist_ok=True)

print(f"============================================================")
print(f"🧠 TRAINING HIGH-PRECISION GEOTECHNICAL LANDSLIDE MODEL")
print(f"============================================================")
print(f"Loading dataset from: {DATA_PATH}")

df = pd.read_csv(DATA_PATH)

# ==========================================
# 1. 12-FEATURE GEOTECHNICAL & HYDROLOGICAL MATRIX
# ==========================================
FEATURES = [
    'slope',
    'elevation',
    'aspect_sin',
    'aspect_cos',
    'clay_percent',
    'sand_percent',
    'silt_percent',
    'bulk_density',
    'rain_day_minus_1_mm',
    'rain_3d_sum_mm',
    'rain_7d_api_mm',
    'pore_pressure_index'
]

X = df[FEATURES].copy()
y = df['target'].copy()
groups = df['cluster_group'].astype(str)

print(f"\nDataset Size: {len(df)} samples across {groups.nunique()} unique event clusters.")
print(f"Positive Landslides (Target=1): {y.sum()} ({y.mean()*100:.1f}%)")
print(f"Negative Controls   (Target=0): {len(y) - y.sum()} ({(1-y.mean())*100:.1f}%)")

# ==========================================
# 2. GROUPED TRAIN / TEST SPLIT (Zero spatial leakage)
# ==========================================
print("\nPerforming GroupShuffleSplit (80% Train / 20% Test by event cluster)...")
gss = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=42)
train_idx, test_idx = next(gss.split(X, y, groups))

X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
groups_test = groups.iloc[test_idx]

print(f"Train set: {len(X_train)} samples (Pos: {y_train.sum()}, Neg: {len(y_train)-y_train.sum()})")
print(f"Test set:  {len(X_test)} samples across {groups_test.nunique()} strictly unseen clusters (Pos: {y_test.sum()}, Neg: {len(y_test)-y_test.sum()})")

# ==========================================
# 3. FIT ENSEMBLE CLASSIFIER & 5-FOLD CALIBRATION
# ==========================================
print("\nFitting Gradient Boosting Classifier with 5-Fold Probability Calibration...")
base_clf = GradientBoostingClassifier(
    n_estimators=160,
    max_depth=4,
    learning_rate=0.05,
    subsample=0.85,
    random_state=42
)

# Calibrate probabilities with 5-fold cross-validation
calibrated_model = CalibratedClassifierCV(estimator=base_clf, method='sigmoid', cv=5)
calibrated_model.fit(X_train, y_train)

# Fit base model separately for feature importance analysis
base_clf.fit(X_train, y_train)

# ==========================================
# 4. STRICT EVALUATION ON UNSEEN TEST CLUSTERS
# ==========================================
print("\n" + "="*60)
print("📊 EVALUATION ON STRICTLY UNSEEN TEST EVENT CLUSTERS")
print("="*60)

y_prob = calibrated_model.predict_proba(X_test)[:, 1]
y_pred = (y_prob >= 0.45).astype(int)

acc = accuracy_score(y_test, y_pred)
prec = precision_score(y_test, y_pred)
rec = recall_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)
roc = roc_auc_score(y_test, y_prob)
brier = brier_score_loss(y_test, y_prob)

print(f"🎯 Accuracy:              {acc*100:.2f}%")
print(f"🎯 ROC-AUC:               {roc*100:.2f}%")
print(f"🎯 F1-Score:              {f1*100:.2f}%")
print(f"🎯 Precision:             {prec*100:.2f}%")
print(f"🎯 Recall (Safety Catch): {rec*100:.2f}%")
print(f"🎯 Brier Calibration Loss:{brier:.4f} (Ideal < 0.08)")

print("\nConfusion Matrix (Rows: Actual [Safe, Hazard], Cols: Predicted [Safe, Hazard]):")
cm = confusion_matrix(y_test, y_pred)
print(cm)
print(f"  - Safe Slopes Correctly Cleared: {cm[0, 0]} / {cm[0].sum()} ({cm[0, 0]/cm[0].sum()*100:.1f}%)")
print(f"  - Real Landslides Correctly Caught: {cm[1, 1]} / {cm[1].sum()} ({cm[1, 1]/cm[1].sum()*100:.1f}%)")

print("\nDetailed Classification Report:")
print(classification_report(y_test, y_pred, target_names=['Safe / No Slide', 'Landslide Hazard']))

# Feature Importances from Base Tree Ensemble
print("\n🌲 Top Geotechnical & Hydrological Feature Drivers:")
importances = base_clf.feature_importances_
feat_imp = sorted(zip(FEATURES, importances), key=lambda x: x[1], reverse=True)
for feat, imp in feat_imp:
    bar = "█" * int(imp * 40)
    print(f"  • {feat:22s} : {imp*100:5.2f}%  {bar}")

# ==========================================
# 5. SAVE ARTIFACT
# ==========================================
artifact = {
    'model': calibrated_model,
    'base_model': base_clf,
    'features': FEATURES,
    'metrics': {
        'accuracy': float(acc),
        'roc_auc': float(roc),
        'f1_score': float(f1),
        'precision': float(prec),
        'recall': float(rec),
        'brier_loss': float(brier)
    },
    'model_version': '3.0-geotechnical-gradientboost',
    'trained_at': datetime.now().isoformat()
}

joblib.dump(artifact, MODEL_PATH)
joblib.dump(artifact, LEGACY_MODEL_PATH)

print(f"\n✅ High-Precision Model Artifact saved to:")
print(f"   • {MODEL_PATH}")
print(f"   • {LEGACY_MODEL_PATH} (backwards compatibility)")
print(f"============================================================\n")

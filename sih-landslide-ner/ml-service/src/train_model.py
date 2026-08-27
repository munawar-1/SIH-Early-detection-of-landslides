import os
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
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
# FEATURE ENGINEERING
# ==========================================
# 24-hour Early Warning features (strictly NO target leakage from event-day rainfall)
FEATURES = [
    'slope',
    'clay_percent',
    'rain_day_minus_3_mm', 
    'rain_day_minus_2_mm', 
    'rain_day_minus_1_mm'
]

X = df[FEATURES].copy()
y = df['target']

# Group by the root event ID so all variations (real landslide, dry season, flat valley)
# from the same event belong strictly to either Train or Test!
groups = df['id'].astype(str).apply(lambda x: x.split('_')[0])

# ==========================================
# TRAIN / TEST SPLIT (Grouped to prevent spatial leakage)
# ==========================================
print(f"Total dataset size: {len(df)} samples across {groups.nunique()} unique event clusters.")
print("Class distribution:")
print(y.value_counts())

print("\nSplitting data using GroupShuffleSplit (80/20)...")
gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
train_idx, test_idx = next(gss.split(X, y, groups))

X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]

print(f"Train samples: {len(X_train)} (Positive: {y_train.sum()}, Negative: {len(y_train) - y_train.sum()})")
print(f"Test samples:  {len(X_test)} (Positive: {y_test.sum()}, Negative: {len(y_test) - y_test.sum()})")

# ==========================================
# TRAIN MODEL
# ==========================================
print("\nTraining Random Forest Early-Warning Classifier...")
rf = RandomForestClassifier(
    n_estimators=150,
    max_depth=8,
    min_samples_split=4,
    min_samples_leaf=2,
    random_state=42,
    class_weight='balanced'
)
rf.fit(X_train, y_train)

# ==========================================
# EVALUATE MODEL
# ==========================================
print("\n==========================================")
print("📊 EVALUATION ON STRICTLY UNSEEN TEST SITES")
print("==========================================")
y_pred = rf.predict(X_test)
y_prob = rf.predict_proba(X_test)[:, np.where(rf.classes_ == 1)[0][0]]

acc = accuracy_score(y_test, y_pred)
prec = precision_score(y_test, y_pred)
rec = recall_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)
roc = roc_auc_score(y_test, y_prob)

print(f"Accuracy:   {acc*100:.2f}%")
print(f"Precision:  {prec*100:.2f}%")
print(f"Recall:     {rec*100:.2f}%")
print(f"F1-Score:   {f1*100:.2f}%")
print(f"ROC-AUC:    {roc*100:.2f}%")

print("\nConfusion Matrix (0=Safe, 1=Danger):")
print(confusion_matrix(y_test, y_pred))

print("\nClassification Report:")
print(classification_report(y_test, y_pred))

print("\nFeature Importances:")
for feat, imp in zip(FEATURES, rf.feature_importances_):
    print(f"  - {feat:22s}: {imp*100:.2f}%")

# ==========================================
# SAVE ARTIFACT
# ==========================================
artifact = {
    'model': rf,
    'features': FEATURES
}
joblib.dump(artifact, MODEL_PATH)
print(f"\n✅ Reproducible model artifact saved to {MODEL_PATH}")

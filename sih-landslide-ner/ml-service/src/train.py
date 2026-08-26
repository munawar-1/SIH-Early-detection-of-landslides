import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import joblib

# Setup paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
INPUT_CSV = os.path.join(BASE_DIR, "data-pipeline", "processed", "ml_training_dataset.csv")
MODEL_DIR = os.path.join(BASE_DIR, "ml-service", "models")
MODEL_PATH = os.path.join(MODEL_DIR, "rf_landslide_model.pkl")

def main():
    print("="*50)
    print(f"Loading dataset from:\n{INPUT_CSV}")
    print("="*50)
    
    if not os.path.exists(INPUT_CSV):
        print("[❌ ERROR] Dataset not found! Run data pipeline scripts first.")
        return

    # 1. Load Data
    df = pd.read_csv(INPUT_CSV)
    
    # 2. Separate Features (X) and Target (y)
    X = df.drop(columns=['target'])
    y = df['target']
    
    # 3. Split into Training (80%) and Testing (20%) sets
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    print(f"[INFO] Training data: {len(X_train)} samples | Testing data: {len(X_test)} samples")
    
    # 4. Initialize and Train the Random Forest Model
    print("[INFO] Training Random Forest Classifier...")
    rf_model = RandomForestClassifier(
        n_estimators=100,      # Number of trees
        max_depth=10,          # Prevents trees from getting too deep/overfitting
        random_state=42,
        class_weight="balanced" # Handles any slight imbalances in 0s and 1s
    )
    rf_model.fit(X_train, y_train)
    
    # 5. Evaluate the Model
    y_pred = rf_model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    
    print("\n[📊 Model Performance]")
    print(f"Accuracy: {acc * 100:.2f}%\n")
    print("Classification Report:")
    print(classification_report(y_test, y_pred))
    
    print("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    
    # 6. Save the Model for FastAPI / Java integration
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(rf_model, MODEL_PATH)
    
    print(f"\n[🎉 SUCCESS] Model saved successfully to:\n{MODEL_PATH}")

if __name__ == "__main__":
    main()
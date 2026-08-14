from pathlib import Path

import joblib
import pandas as pd

from interpret.glassbox import ExplainableBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split


BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "framingham.csv"
MODEL_PATH = BASE_DIR / "framingham_ebm.joblib"

TARGET_COLUMN = "TenYearCHD"


# --------------------------------------------------
# 1. Load the dataset
# --------------------------------------------------

data = pd.read_csv(DATA_PATH)


# --------------------------------------------------
# 2. Separate the features and target
# --------------------------------------------------

X = data.drop(columns=[TARGET_COLUMN])
y = data[TARGET_COLUMN]

feature_names = X.columns.tolist()


# --------------------------------------------------
# 3. Split the dataset
# --------------------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y,
)


# --------------------------------------------------
# 4. Impute missing values
# --------------------------------------------------

imputer = SimpleImputer(strategy="median")

X_train_imputed = imputer.fit_transform(X_train)
X_test_imputed = imputer.transform(X_test)

# Restore the column names after imputation.
X_train_imputed = pd.DataFrame(
    X_train_imputed,
    columns=feature_names,
    index=X_train.index,
)

X_test_imputed = pd.DataFrame(
    X_test_imputed,
    columns=feature_names,
    index=X_test.index,
)


# --------------------------------------------------
# 5. Train the basic EBM
# --------------------------------------------------

model = ExplainableBoostingClassifier(
    random_state=42,
)

model.fit(X_train_imputed, y_train)


# --------------------------------------------------
# 6. Evaluate the model
# --------------------------------------------------

predictions = model.predict(X_test_imputed)
probabilities = model.predict_proba(X_test_imputed)[:, 1]

print("Accuracy:", accuracy_score(y_test, predictions))
print("ROC AUC:", roc_auc_score(y_test, probabilities))

print("\nConfusion matrix:")
print(confusion_matrix(y_test, predictions))

print("\nClassification report:")
print(classification_report(y_test, predictions, zero_division=0))


# --------------------------------------------------
# 7. Save everything needed for future predictions
# --------------------------------------------------

model_artifact = {
    "model": model,
    "imputer": imputer,
    "feature_names": feature_names,
    "target_column": TARGET_COLUMN,
}

joblib.dump(model_artifact, MODEL_PATH)

print(f"\nModel saved to: {MODEL_PATH}")
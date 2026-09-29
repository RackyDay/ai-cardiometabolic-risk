from pathlib import Path

import joblib
import pandas as pd
from scipy.stats import randint, uniform

from interpret.glassbox import ExplainableBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    brier_score_loss,
    classification_report,
    confusion_matrix,
    roc_auc_score,
)
from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline


BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "framingham.csv"
MODEL_PATH = BASE_DIR / "framingham_ebm.joblib"

TARGET_COLUMN = "TenYearCHD"
RANDOM_STATE = 42


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
# The test set is only ever touched once, for the final evaluation below.
# All tuning happens via cross-validation on the training set so that the
# held-out numbers stay an honest estimate of generalization.

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=RANDOM_STATE,
    stratify=y,
)


# --------------------------------------------------
# 4. Build the imputation + model pipeline
# --------------------------------------------------
# Imputation is fit inside the pipeline so each cross-validation fold only
# ever sees its own training rows (no leakage from validation folds into
# the median used to fill missing values).

pipeline = Pipeline(
    [
        ("imputer", SimpleImputer(strategy="median")),
        ("model", ExplainableBoostingClassifier(random_state=RANDOM_STATE)),
    ]
)
# Keep the imputer's output as a DataFrame (not a bare ndarray) so the EBM
# is fit with its real column names. Without this, explain_local() reports
# generic positional names that don't match feature_names, and
# risk_model.py's per-prediction "top contributors" comes back empty.
pipeline.set_output(transform="pandas")


# --------------------------------------------------
# 5. Tune hyperparameters with stratified cross-validation
# --------------------------------------------------
# A single train/test split on ~4200 rows is noisy (its ROC AUC can swing
# several points depending on which rows land in the test set), so the
# search itself is scored on 5-fold CV rather than one split, and the best
# hyperparameters are chosen by their average behavior across folds.

param_distributions = {
    "model__learning_rate": uniform(0.005, 0.05),
    "model__interactions": [0, 3, 5, 8, "3x", "5x"],
    "model__outer_bags": randint(8, 40),
    "model__min_samples_leaf": randint(2, 20),
    "model__max_leaves": [2, 3, 4],
    "model__reg_alpha": uniform(0.0, 1.0),
    "model__reg_lambda": uniform(0.0, 1.0),
    "model__smoothing_rounds": randint(0, 200),
    "model__max_bins": [128, 256, 512, 1024],
}

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)

search = RandomizedSearchCV(
    pipeline,
    param_distributions=param_distributions,
    n_iter=40,
    scoring="roc_auc",
    cv=cv,
    random_state=RANDOM_STATE,
    n_jobs=-1,
)

search.fit(X_train, y_train)

print("Cross-validated ROC AUC (best params, mean over 5 folds):", search.best_score_)
print("Best hyperparameters:", search.best_params_)

best_pipeline = search.best_estimator_
imputer = best_pipeline.named_steps["imputer"]
model = best_pipeline.named_steps["model"]


# --------------------------------------------------
# 6. Evaluate on the held-out test set
# --------------------------------------------------
# Accuracy alone is misleading here: ~85% of rows are the negative class,
# so a model that always predicts "no CHD" already scores ~85% accuracy.
# ROC AUC/PR AUC measure ranking quality across both classes, and the
# Brier score checks calibration -- how close the predicted probability is
# to the true likelihood -- since that probability is shown to users
# directly as their risk score, not just used for a threshold-based label.

predictions = best_pipeline.predict(X_test)
probabilities = best_pipeline.predict_proba(X_test)[:, 1]

print("\nAccuracy:", accuracy_score(y_test, predictions))
print("ROC AUC:", roc_auc_score(y_test, probabilities))
print("PR AUC (average precision):", average_precision_score(y_test, probabilities))
print("Brier score (lower is better-calibrated):", brier_score_loss(y_test, probabilities))

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

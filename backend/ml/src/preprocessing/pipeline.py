import pandas as pd
from sklearn.preprocessing import LabelEncoder


def load_and_preprocess_data(file_path):
    # -------------------------------
    # LOAD DATA
    # -------------------------------
    df = pd.read_csv(file_path)

    print("✅ Initial shape:", df.shape)

    # -------------------------------
    # DROP USELESS COLUMNS
    # -------------------------------
    drop_cols = [
        "Description",
        "Nutrient Data Bank Number",
        "Data.Household Weights.1st Household Weight Description",
        "Data.Household Weights.2nd Household Weight Description",
    ]

    df = df.drop(columns=[col for col in drop_cols if col in df.columns])

    # -------------------------------
    # REMOVE ALL NON-NUMERIC COLUMNS (🔥 KEY FIX)
    # -------------------------------
    df = df.select_dtypes(include=["number"])

    print("✅ After removing text columns:", df.shape)

    # -------------------------------
    # DROP MISSING VALUES
    # -------------------------------
    df = df.dropna()

    # -------------------------------
    # TARGET COLUMN
    # -------------------------------
    target_column = "Category"

    # ⚠️ IMPORTANT: Category got removed above if it was string
    # So we reload it separately before removing types

    original_df = pd.read_csv(file_path)

    if target_column not in original_df.columns:
        raise ValueError(f"{target_column} not found")

    y = original_df[target_column]

    # -------------------------------
    # REMOVE RARE CLASSES
    # -------------------------------
    min_samples = 5

    class_counts = y.value_counts()
    valid_classes = class_counts[class_counts >= min_samples].index

    mask = y.isin(valid_classes)

    df = df[mask]
    y = y[mask]

    print("✅ After removing rare classes:", df.shape)

    # -------------------------------
    # ENCODE TARGET
    # -------------------------------
    le = LabelEncoder()
    y = le.fit_transform(y)

    print("✅ Encoding done")

    return df, y, le

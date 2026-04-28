# train.py
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import pickle

# ── Données synthétiques (remplace par tes vraies données) ──────────────────
# Chaque ligne = un rendez-vous historique
np.random.seed(42)
n = 500

df = pd.DataFrame({
    "day_of_week":    np.random.randint(0, 7, n),   # 0=Lun … 6=Dim
    "hour":           np.random.randint(8, 18, n),   # 8h … 17h
    "specialite":     np.random.choice(
                          ["Generale", "Cardiologie", "Pediatrie", "Dermatologie"], n),
    "days_until_appt": np.random.randint(0, 30, n),  # jours avant RDV
    "previous_noshow": np.random.randint(0, 4, n),   # nb no-shows historique
    "no_show":        np.random.randint(0, 2, n),    # cible : 1 = no-show
})

# ── Encodage ─────────────────────────────────────────────────────────────────
spec_map = {"Generale": 0, "Cardiologie": 1, "Pediatrie": 2, "Dermatologie": 3}
df["specialite_enc"] = df["specialite"].map(spec_map)

FEATURES = ["day_of_week", "hour", "specialite_enc", "days_until_appt", "previous_noshow"]
X = df[FEATURES]
y = df["no_show"]

# ── Entraînement ─────────────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

print(classification_report(y_test, model.predict(X_test)))

# ── Sauvegarde ───────────────────────────────────────────────────────────────
with open("model.pkl", "wb") as f:
    pickle.dump(model, f)

print("✅ model.pkl sauvegardé")
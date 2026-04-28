# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np

app = Flask(__name__)
CORS(app)  # autorise les appels depuis Angular

# ── Chargement du modèle ──────────────────────────────────────────────────────
with open("model.pkl", "rb") as f:
    model = pickle.load(f)

SPEC_MAP = {"Generale": 0, "Cardiologie": 1, "Pediatrie": 2, "Dermatologie": 3}
DAYS_FR  = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]

@app.route("/predict-noshow", methods=["POST"])
def predict_noshow():
    """
    Body attendu :
    {
      "day_of_week":     0-6,
      "hour":            8-17,
      "specialite":      "Generale" | "Cardiologie" | ...,
      "days_until_appt": 0-30,
      "previous_noshow": 0-10
    }
    """
    data = request.get_json()

    specialite_enc = SPEC_MAP.get(data.get("specialite", "Generale"), 0)
    features = np.array([[
        data.get("day_of_week",     1),
        data.get("hour",            9),
        specialite_enc,
        data.get("days_until_appt", 7),
        data.get("previous_noshow", 0),
    ]])

    proba = model.predict_proba(features)[0]   # [P(présent), P(noshow)]
    noshow_risk = round(float(proba[1]) * 100, 1)

    # ── Niveau de risque ─────────────────────────────────────────────────────
    if noshow_risk < 30:
        level, color = "Faible", "green"
    elif noshow_risk < 60:
        level, color = "Modéré", "amber"
    else:
        level, color = "Élevé", "red"

    # ── Facteurs les plus importants ─────────────────────────────────────────
    importances = model.feature_importances_
    feat_names  = ["Jour", "Heure", "Spécialité", "Délai RDV", "Historique NS"]
    top_factors = sorted(
        zip(feat_names, importances), key=lambda x: x[1], reverse=True
    )[:3]

    return jsonify({
        "noshow_risk":  noshow_risk,
        "present_prob": round(float(proba[0]) * 100, 1),
        "risk_level":   level,
        "risk_color":   color,
        "top_factors":  [{"name": f, "importance": round(i * 100, 1)}
                         for f, i in top_factors],
    })


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(port=5000, debug=True)
# ============================================================
#  utils/emotion_combiner.py
#  Weighted fusion of face + voice emotion predictions
# ============================================================

FACE_WEIGHT  = 0.60   # Face is generally more reliable
VOICE_WEIGHT = 0.40

EMOTIONS = ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"]

# Valence map: positive / negative / neutral
VALENCE = {
    "happy": "positive", "surprise": "positive",
    "sad": "negative",   "angry": "negative",
    "fear": "negative",  "disgust": "negative",
    "neutral": "neutral",
}


def combine_emotions(
    face_emotion: str,
    face_confidence: float,
    voice_emotion: str,
    voice_confidence: float,
) -> dict:
    """
    Combine face and voice emotion predictions using weighted averaging.

    Strategy:
      - If both agree → high confidence result
      - If they disagree → weight by individual confidence + modality weight
      - Return dominant emotion + combined confidence score
    """
    face_emotion  = face_emotion.lower()
    voice_emotion = voice_emotion.lower()

    # Build weighted score vectors
    face_scores  = _build_score_vector(face_emotion,  face_confidence)
    voice_scores = _build_score_vector(voice_emotion, voice_confidence)

    combined = {}
    for e in EMOTIONS:
        combined[e] = (
            FACE_WEIGHT  * face_scores.get(e,  0.0) +
            VOICE_WEIGHT * voice_scores.get(e, 0.0)
        )

    dominant = max(combined, key=combined.get)
    confidence = round(combined[dominant], 4)

    # Agreement flag
    agreement = face_emotion == voice_emotion

    return {
        "combined_emotion": dominant,
        "confidence": confidence,
        "agreement": agreement,
        "valence": VALENCE.get(dominant, "neutral"),
        "face_emotion": face_emotion,
        "voice_emotion": voice_emotion,
        "all_combined_scores": {k: round(v, 4) for k, v in combined.items()},
        "analysis": _generate_analysis(
            face_emotion, voice_emotion, dominant, agreement
        ),
    }


def _build_score_vector(dominant_emotion: str, confidence: float) -> dict:
    """
    Build a full probability vector from a dominant label + confidence.
    Remaining probability is distributed equally across other classes.
    """
    other_prob = (1.0 - confidence) / max(len(EMOTIONS) - 1, 1)
    return {
        e: (confidence if e == dominant_emotion else other_prob)
        for e in EMOTIONS
    }


def _generate_analysis(face: str, voice: str, combined: str, agreement: bool) -> str:
    if agreement:
        return (
            f"Both face and voice strongly indicate '{combined}'. "
            f"High confidence combined result."
        )
    face_val  = VALENCE.get(face, "neutral")
    voice_val = VALENCE.get(voice, "neutral")
    if face_val == voice_val:
        return (
            f"Face shows '{face}' and voice shows '{voice}' — both {face_val}. "
            f"Combined result: '{combined}'."
        )
    return (
        f"Mixed signals: face indicates '{face}' ({face_val}) while voice "
        f"suggests '{voice}' ({voice_val}). Combined dominant: '{combined}'."
    )

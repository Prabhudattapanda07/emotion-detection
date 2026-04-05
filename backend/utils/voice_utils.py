# ============================================================
#  utils/voice_utils.py
#  Voice emotion detection using Librosa MFCC features
# ============================================================

import io
import logging
import numpy as np

logger = logging.getLogger("emotion-cloud.voice-utils")

try:
    import librosa
    _LIBROSA_AVAILABLE = True
    logger.info("✅ Librosa loaded")
except ImportError:
    _LIBROSA_AVAILABLE = False
    logger.warning("⚠️  Librosa not installed")

EMOTIONS = ["angry", "fear", "happy", "neutral", "sad", "surprise", "disgust"]


def detect_emotion_from_audio(file_bytes: bytes) -> dict:
    """
    Extract MFCC features from audio and predict emotion.

    Pipeline:
      1. Load audio with Librosa (resampled to 22 050 Hz)
      2. Silence / noise check
      3. Extract 40 MFCCs + delta MFCCs
      4. Compute statistical features (mean, std, max)
      5. Map features to emotion via rule-based model
         (replace step 5 with a trained sklearn/TF model in prod)

    Returns:
        {
            "emotion": str,
            "confidence": float,
            "all_scores": dict,
            "mfcc_summary": list[float]
        }

    Raises:
        ValueError: if audio is too short, silent, or corrupt.
    """
    if not _LIBROSA_AVAILABLE:
        raise RuntimeError("Librosa is not installed on this server.")

    # ── Load audio ──
    try:
        y, sr = librosa.load(io.BytesIO(file_bytes), sr=22050, mono=True)
    except Exception as e:
        y, sr = _load_with_pydub(file_bytes, original_error=e)

    if len(y) < sr * 0.5:          # < 0.5 seconds
        raise ValueError("Audio clip is too short (minimum 0.5 seconds).")

    # ── Silence detection ──
    rms = librosa.feature.rms(y=y)[0]
    if np.mean(rms) < 0.001:
        raise ValueError("Audio appears to be silent. Please check your microphone.")

    # ── Normalise ──
    y = librosa.util.normalize(y)

    # ── Feature extraction ──
    mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40)
    delta_mfccs = librosa.feature.delta(mfccs)

    # Statistical aggregation
    mfcc_mean = np.mean(mfccs, axis=1)
    mfcc_std  = np.std(mfccs, axis=1)
    delta_mean = np.mean(delta_mfccs, axis=1)

    # Additional features
    zcr = float(np.mean(librosa.feature.zero_crossing_rate(y)))
    spectral_centroid = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
    rolloff = float(np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr)))
    chroma = float(np.mean(librosa.feature.chroma_stft(y=y, sr=sr)))
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    tempo = float(tempo)

    # ── Rule-based emotion mapping (heuristic for demo) ──
    # In production: replace with trained RandomForest / LSTM model
    scores = _rule_based_classifier(
        mfcc_mean, mfcc_std, delta_mean,
        zcr, spectral_centroid, rolloff, chroma, tempo
    )

    dominant = max(scores, key=scores.get)
    mfcc_summary = [round(float(v), 3) for v in mfcc_mean[:10]]

    logger.info(f"🎙️ Voice → {dominant} ({scores[dominant]:.2%})")

    return {
        "emotion": dominant,
        "confidence": float(round(float(scores[dominant]), 4)),
        "all_scores": {k: float(round(float(v), 4)) for k, v in scores.items()},
        "mfcc_summary": mfcc_summary,
    }


def _rule_based_classifier(
    mfcc_mean, mfcc_std, delta_mean,
    zcr, spectral_centroid, rolloff, chroma, tempo
) -> dict:
    """
    Heuristic classifier based on acoustic features.
    Replace with: joblib.load('emotion_model.pkl').predict(features)
    """
    scores = {e: 0.0 for e in EMOTIONS}

    energy_var = float(np.var(mfcc_mean))
    pitch_proxy = spectral_centroid / 1000.0   # normalise

    # High energy + high ZCR + high tempo → angry / happy
    if zcr > 0.12 and tempo > 120:
        scores["angry"]   += 0.35
        scores["happy"]   += 0.30
    elif zcr > 0.08 and tempo > 100:
        scores["happy"]   += 0.35
        scores["surprise"] += 0.20

    # Low energy + low ZCR → sad / neutral
    if zcr < 0.05 and tempo < 80:
        scores["sad"]     += 0.40
        scores["neutral"] += 0.25
    elif zcr < 0.08:
        scores["neutral"] += 0.30

    # High spectral centroid → fear / surprise
    if pitch_proxy > 2.0:
        scores["fear"]     += 0.25
        scores["surprise"] += 0.20

    # High MFCC variance → high arousal (angry / fear)
    if energy_var > 500:
        scores["angry"] += 0.20
        scores["fear"]  += 0.15

    # High rolloff → happy / surprise
    if rolloff > 4000:
        scores["happy"]   += 0.15
        scores["surprise"] += 0.10

    # Chroma: musical tonality proxy
    if chroma > 0.5:
        scores["happy"] += 0.10

    # Normalise to probability distribution
    total = sum(scores.values()) or 1.0
    for k in scores:
        scores[k] = max(0.01, scores[k] / total)   # floor at 1%

    # Re-normalise after floor
    total2 = sum(scores.values())
    return {k: v / total2 for k, v in scores.items()}


def _load_with_pydub(file_bytes: bytes, original_error: Exception):
    """
    Fallback decoder for formats like webm/ogg. Requires ffmpeg on PATH.
    """
    try:
        from pydub import AudioSegment
    except Exception:
        raise ValueError(
            "Could not decode audio file. Install ffmpeg (and pydub) or record WAV. "
            f"Original error: {original_error}"
        )

    try:
        audio = AudioSegment.from_file(io.BytesIO(file_bytes))
        wav_buf = io.BytesIO()
        audio.export(wav_buf, format="wav")
        wav_buf.seek(0)
        y, sr = librosa.load(wav_buf, sr=22050, mono=True)
        return y, sr
    except Exception as e:
        raise ValueError(
            "Could not decode audio file (ffmpeg/pydub fallback failed). "
            f"Original error: {original_error}; Fallback error: {e}"
        )

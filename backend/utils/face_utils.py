# ============================================================
#  utils/face_utils.py
#  Face emotion detection using OpenCV + DeepFace
# ============================================================

import io
import logging
import numpy as np
import cv2

logger = logging.getLogger("emotion-cloud.face-utils")

EMOTIONS = ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"]

# Try to import DeepFace; fall back to OpenCV Haar cascade heuristic
try:
    from deepface import DeepFace
    _DEEPFACE_AVAILABLE = True
    logger.info("✅ DeepFace loaded")
except ImportError:
    _DEEPFACE_AVAILABLE = False
    logger.warning("⚠️  DeepFace not installed — using OpenCV heuristic model")


def detect_emotion_from_image(file_bytes: bytes) -> dict:
    """
    Analyse an image and return dominant emotion.

    Returns:
        {
            "emotion": str,
            "confidence": float,
            "all_scores": dict[str, float]
        }

    Raises:
        ValueError: if no face is found or image is invalid.
    """
    # Decode bytes → numpy array
    nparr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError("Could not decode image. Please upload a valid JPEG or PNG.")

    if _DEEPFACE_AVAILABLE:
        return _deepface_detect(img)
    else:
        return _opencv_heuristic(img)


def _deepface_detect(img: np.ndarray) -> dict:
    """Use DeepFace for accurate multi-class emotion detection."""
    try:
        results = DeepFace.analyze(
            img_path=img,
            actions=["emotion"],
            enforce_detection=True,
            detector_backend="opencv",
            silent=True,
        )
    except Exception:
        # Retry with relaxed detection to avoid failing on low-light webcam frames
        try:
            results = DeepFace.analyze(
                img_path=img,
                actions=["emotion"],
                enforce_detection=False,
                detector_backend="opencv",
                silent=True,
            )
        except Exception as e:
            raise ValueError(f"No face detected or analysis failed: {e}")

    # DeepFace returns list of faces
    face_data = results[0] if isinstance(results, list) else results
    raw_scores: dict = face_data["emotion"]          # percentages
    dominant: str = face_data["dominant_emotion"]

    # Normalise to 0-1
    total = float(sum(raw_scores.values()) or 1)
    all_scores = {k: round(float(v) / total, 4) for k, v in raw_scores.items()}
    confidence = float(all_scores.get(dominant, 0.0))

    return {"emotion": dominant, "confidence": confidence, "all_scores": all_scores}


def _opencv_heuristic(img: np.ndarray) -> dict:
    """
    Fallback: Haar cascade face detection + brightness/symmetry heuristic.
    Simplified — good enough for demo; replace with trained model in production.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)

    if len(faces) == 0:
        raise ValueError("No face detected in the image. Please use a clear frontal photo.")

    # Crop the first face
    x, y, w, h = faces[0]
    face_roi = gray[y : y + h, x : x + w]

    # Heuristic: map mean brightness to emotion clusters
    mean_brightness = np.mean(face_roi)
    std_brightness = np.std(face_roi)

    # Rough probability distribution (demo heuristic)
    scores = {
        "happy":    _clamp((mean_brightness - 100) / 100),
        "sad":      _clamp((130 - mean_brightness) / 130),
        "angry":    _clamp(std_brightness / 80),
        "neutral":  _clamp(1 - abs(mean_brightness - 128) / 128),
        "surprise": _clamp(std_brightness / 60 - 0.3),
        "fear":     _clamp((120 - mean_brightness) / 120 * 0.5),
        "disgust":  0.05,
    }
    total = float(sum(scores.values()) or 1)
    all_scores = {k: round(float(v) / total, 4) for k, v in scores.items()}
    dominant = max(all_scores, key=all_scores.get)

    return {
        "emotion": dominant,
        "confidence": float(all_scores[dominant]),
        "all_scores": all_scores,
    }


def _clamp(v: float) -> float:
    return float(max(0.0, min(1.0, float(v))))

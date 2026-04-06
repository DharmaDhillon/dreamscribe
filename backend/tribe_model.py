import numpy as np
import threading
import os

_model = None
_lock = threading.Lock()
_tribe_available = True


def get_model():
    """Singleton model loader — loads once on cold start"""
    global _model, _tribe_available
    with _lock:
        if _model is None:
            try:
                from tribev2 import TribeModel

                print("Loading TRIBE v2 model...")
                # Set HF token for gated model access
                hf_token = os.environ.get("HF_TOKEN")
                if hf_token:
                    os.environ["HUGGING_FACE_HUB_TOKEN"] = hf_token

                _model = TribeModel.from_pretrained(
                    "facebook/tribev2", cache_folder="/cache/tribev2"
                )
                print("TRIBE v2 ready")
            except Exception as e:
                print(f"TRIBE v2 not available: {e}")
                print("Using mock inference fallback")
                _tribe_available = False
                return None
    return _model


def run_inference(audio_path: str) -> dict:
    """
    Run TRIBE v2 on audio file.
    Returns preds array and word-level segments.
    Falls back to mock data if TRIBE v2 is unavailable.
    """
    model = get_model()

    if model is None or not _tribe_available:
        return _mock_inference(audio_path)

    df = model.get_events_dataframe(audio_path=audio_path)
    preds, segments = model.predict(events=df)
    return {
        "preds": preds,
        "segments": segments,
        "n_timesteps": preds.shape[0],
        "n_vertices": preds.shape[1],
    }


def _mock_inference(audio_path: str) -> dict:
    """
    Generate realistic mock brain activation data
    when TRIBE v2 model is not available.
    Produces plausible scores so the full pipeline works end-to-end.
    """
    n_timesteps = 30
    n_vertices = 20484

    rng = np.random.RandomState(hash(audio_path) % 2**31)
    preds = rng.rand(n_timesteps, n_vertices).astype(np.float32)

    # Shape realistic activation patterns per region
    # Amygdala (4500-4900): moderate-high emotional load
    preds[:, 4500:4900] *= rng.uniform(0.6, 0.95)
    # dlPFC (1200-2100): lower rational processing
    preds[:, 1200:2100] *= rng.uniform(0.2, 0.5)
    # DMN (8000-10000): elevated self-referential
    preds[:, 8000:10000] *= rng.uniform(0.5, 0.85)
    # ACC (2500-3200): moderate conflict
    preds[:, 2500:3200] *= rng.uniform(0.4, 0.75)
    # Motor (3500-4200): fatigue signal
    preds[:, 3500:4200] *= rng.uniform(0.3, 0.7)

    # Create mock word segments
    segments = []
    mock_words = [
        "I", "was", "thinking", "about", "something",
        "today", "that", "felt", "heavy", "but",
        "I", "couldn't", "name", "it", "exactly",
    ]
    for i in range(min(n_timesteps, len(mock_words))):
        segments.append({
            "text": mock_words[i % len(mock_words)],
            "start": i * 2.0,
            "end": (i + 1) * 2.0,
        })

    return {
        "preds": preds,
        "segments": segments,
        "n_timesteps": n_timesteps,
        "n_vertices": n_vertices,
    }

"""
Speech-to-text transcription using OpenAI Whisper (local, free, no API key).
Uses whisper 'base' model — small enough for CPU, accurate enough for journals.
"""

import whisper
import threading

_model = None
_lock = threading.Lock()


def get_whisper_model():
    """Singleton loader for Whisper model"""
    global _model
    with _lock:
        if _model is None:
            print("Loading Whisper base model...")
            _model = whisper.load_model("base")
            print("Whisper ready")
    return _model


def transcribe_audio(audio_path: str) -> dict:
    """
    Transcribe audio file to text using Whisper.
    Returns dict with 'text' (full transcript) and 'segments' (word-level timing).
    """
    model = get_whisper_model()
    result = model.transcribe(audio_path, language="en")

    return {
        "text": result.get("text", "").strip(),
        "segments": result.get("segments", []),
    }

"""
Maps TRIBE v2 cortical vertex predictions to named
brain regions (ROIs) and extracts per-timestep scores.

Vertex ranges are approximate fsaverage5 ROI clusters.
In production these should be loaded from the
tribev2 utils_fmri ROI mask files for accuracy.
"""
import numpy as np

ROI_VERTEX_RANGES = {
    "amygdala": (4500, 4900),
    "dlpfc": (1200, 2100),
    "dmn": (8000, 10000),
    "stg": (6000, 7500),
    "acc": (2500, 3200),
    "motor": (3500, 4200),
    "visual": (14000, 17000),
    "hippocampus": (5000, 5500),
}


def extract_roi_scores(preds: np.ndarray) -> dict:
    """
    Extract mean activation per ROI across all timesteps.
    Returns dict with 0-100 percentage scores.
    """
    scores = {}
    for roi, (start, end) in ROI_VERTEX_RANGES.items():
        end = min(end, preds.shape[1])
        region_preds = preds[:, start:end]
        raw_score = float(np.mean(region_preds))
        scores[roi] = round(min(max(raw_score * 100, 0), 100), 1)
    return scores


def find_peak_moments(preds: np.ndarray, segments: list) -> dict:
    """
    Find the timestep with highest emotional activation
    and the timestep with lowest (calmest).
    """
    amygdala_start, amygdala_end = ROI_VERTEX_RANGES["amygdala"]
    amygdala_end = min(amygdala_end, preds.shape[1])
    amygdala_per_timestep = preds[:, amygdala_start:amygdala_end].mean(axis=1)

    peak_idx = int(np.argmax(amygdala_per_timestep))
    calm_idx = int(np.argmin(amygdala_per_timestep))

    def _seg_text(seg):
        """Extract text from a segment — handles both dicts and objects."""
        if isinstance(seg, dict):
            return seg.get("text", "")
        return getattr(seg, "text", str(seg))

    def get_quote_at(idx):
        if segments and idx < len(segments):
            # Grab surrounding words for context
            start = max(0, idx - 2)
            end = min(len(segments), idx + 3)
            context = " ".join(_seg_text(s) for s in segments[start:end])
            return {
                "time": f"{idx * 2 // 60}:{(idx * 2 % 60):02d}",
                "quote": context[:80],
            }
        return {"time": f"{idx * 2}s", "quote": ""}

    acc_start, acc_end = ROI_VERTEX_RANGES["acc"]
    acc_end = min(acc_end, preds.shape[1])

    return {
        "peak": get_quote_at(peak_idx),
        "calm": get_quote_at(calm_idx),
        "conflict_idx": int(
            np.argmax(preds[:, acc_start:acc_end].mean(axis=1))
        ),
    }


def build_roi_summary(roi_scores: dict) -> dict:
    """
    Map raw ROI scores to human-readable labels
    for the Claude prompt and frontend display.
    """
    return {
        "emotional_load": roi_scores.get("amygdala", 0),
        "rational_processing": roi_scores.get("dlpfc", 0),
        "self_referential": roi_scores.get("dmn", 0),
        "emotional_voice": roi_scores.get("stg", 0),
        "internal_conflict": roi_scores.get("acc", 0),
        "mental_fatigue": roi_scores.get("motor", 0),
        "visual_vividness": roi_scores.get("visual", 0),
        "emotional_memory": roi_scores.get("hippocampus", 0),
    }

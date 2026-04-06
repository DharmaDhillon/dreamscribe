from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client
from dotenv import load_dotenv
import os
import traceback
from datetime import date

load_dotenv()

from audio_processor import (
    download_from_supabase, convert_webm_to_mp3, get_temp_paths, cleanup,
)
from transcriber import transcribe_audio
from tribe_model import run_inference
from roi_extractor import extract_roi_scores, find_peak_moments, build_roi_summary
from claude_insights import (
    build_daily_prompt,
    build_dream_prompt,
    build_cross_analysis_prompt,
    get_insight,
)
from mnemo_layer import trace_analysis, get_user_memories, check_and_flag
from ember_agent import analyze_user_patterns, analyze_global_patterns

app = FastAPI(title="DreamScribe AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://dreamscribe.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"],
)


class AnalyzeRequest(BaseModel):
    entry_id: str
    user_id: str
    audio_url: str
    entry_type: str  # "dream" or "daily"
    duration_seconds: int


class AnalyzeResponse(BaseModel):
    entry_id: str
    roi_scores: dict
    moments: dict
    claude_insight: str
    mood_label: str
    transcript: str
    cross_analysis: str | None = None


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_entry(req: AnalyzeRequest, background_tasks: BackgroundTasks):
    paths = get_temp_paths(req.entry_id)

    try:
        # 1. Download audio from Supabase Storage using SDK
        download_from_supabase(req.audio_url, paths["webm"])

        # 2. Convert webm to mp3
        convert_webm_to_mp3(paths["webm"], paths["mp3"])

        # 3. Run TRIBE v2 (or mock fallback)
        tribe_result = run_inference(paths["mp3"])
        preds = tribe_result["preds"]
        segments = tribe_result["segments"]

        # 4. Extract ROI scores
        raw_scores = extract_roi_scores(preds)
        roi_summary = build_roi_summary(raw_scores)
        moments = find_peak_moments(preds, segments)

        # 5. Transcribe audio with Whisper (real speech-to-text)
        whisper_result = transcribe_audio(paths["mp3"])
        transcript = whisper_result["text"]

        # 6. Get user memories from Mnemo
        memories = get_user_memories(
            user_id=req.user_id, entry_type=req.entry_type
        )

        # 7. Build Claude prompt and get insight
        if req.entry_type == "dream":
            prompt = build_dream_prompt(
                transcript=transcript,
                roi_summary=roi_summary,
                moments=moments,
                duration=req.duration_seconds,
                dream_memories=memories,
            )
        else:
            prompt = build_daily_prompt(
                transcript=transcript,
                roi_summary=roi_summary,
                moments=moments,
                duration=req.duration_seconds,
                memories=memories,
            )

        claude_insight = get_insight(prompt)

        # 8. Determine mood label
        mood_label = determine_mood(roi_summary)

        # 9. Update entry in Supabase with all scores
        supabase.table("entries").update(
            {
                "transcript": transcript,
                "amygdala_score": roi_summary["emotional_load"],
                "dlpfc_score": roi_summary["rational_processing"],
                "dmn_score": roi_summary["self_referential"],
                "stg_score": roi_summary["emotional_voice"],
                "acc_score": roi_summary["internal_conflict"],
                "fatigue_score": roi_summary["mental_fatigue"],
                "peak_moment_time": moments["peak"]["time"],
                "peak_moment_quote": moments["peak"]["quote"],
                "calm_moment_time": moments["calm"]["time"],
                "calm_moment_quote": moments["calm"]["quote"],
                "claude_insight": claude_insight,
                "mood_label": mood_label,
            }
        ).eq("id", req.entry_id).execute()

        # 10. Log full analysis trace to Mnemo dashboard
        trace_analysis(
            user_id=req.user_id,
            entry_id=req.entry_id,
            entry_type=req.entry_type,
            transcript=transcript,
            roi_summary=roi_summary,
            mood_label=mood_label,
            claude_insight=claude_insight,
            duration_seconds=req.duration_seconds,
        )

        # 11. Check for cross-analysis opportunity
        cross_insight = await check_cross_analysis(
            user_id=req.user_id,
            entry_type=req.entry_type,
            entry_id=req.entry_id,
            roi_summary=roi_summary,
            moments=moments,
            today=str(date.today()),
            memories=memories,
        )

        # 12. Run clinical flag check in background
        background_tasks.add_task(
            check_and_flag,
            user_id=req.user_id,
            entry_id=req.entry_id,
            transcript=transcript,
            roi_summary=roi_summary,
        )

        # 13. Ember watches — analyze user patterns in background
        background_tasks.add_task(
            analyze_user_patterns,
            user_id=req.user_id,
            latest_entry_id=req.entry_id,
        )

        # 14. Ember watches globally every 5th entry
        try:
            total = supabase.table("entries").select("id", count="exact").execute()
            if total.count and total.count % 5 == 0:
                background_tasks.add_task(analyze_global_patterns)
        except Exception:
            pass

        return AnalyzeResponse(
            entry_id=req.entry_id,
            roi_scores=roi_summary,
            moments=moments,
            claude_insight=claude_insight,
            mood_label=mood_label,
            transcript=transcript,
            cross_analysis=cross_insight,
        )

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cleanup(paths)


async def check_cross_analysis(
    user_id, entry_type, entry_id, roi_summary, moments, today, memories
) -> str | None:
    """
    If user has both a dream + daily entry today,
    generate and save the cross-analysis insight.
    """
    try:
        today_entries = (
            supabase.table("entries")
            .select("*")
            .eq("user_id", user_id)
            .gte("created_at", today)
            .execute()
        )

        entries = today_entries.data or []
        dream = next((e for e in entries if e["entry_type"] == "dream"), None)
        daily = next((e for e in entries if e["entry_type"] == "daily"), None)

        if not (dream and daily):
            return None

        dream_roi = {
            "emotional_load": dream.get("amygdala_score", 0) or 0,
            "self_referential": dream.get("dmn_score", 0) or 0,
            "internal_conflict": dream.get("acc_score", 0) or 0,
        }
        daily_roi = {
            "emotional_load": daily.get("amygdala_score", 0) or 0,
            "rational_processing": daily.get("dlpfc_score", 0) or 0,
            "internal_conflict": daily.get("acc_score", 0) or 0,
        }

        prompt = build_cross_analysis_prompt(
            dream_roi=dream_roi,
            dream_quote=dream.get("peak_moment_quote", "") or "",
            daily_roi=daily_roi,
            daily_quote=daily.get("peak_moment_quote", "") or "",
            memories=memories,
        )
        cross_insight = get_insight(prompt)

        # Save cross analysis
        result = (
            supabase.table("cross_analyses")
            .insert(
                {
                    "user_id": user_id,
                    "date": today,
                    "dream_entry_id": dream["id"],
                    "daily_entry_id": daily["id"],
                    "claude_cross_insight": cross_insight,
                }
            )
            .execute()
        )

        # Link both entries to cross analysis
        ca_id = result.data[0]["id"]
        supabase.table("entries").update({"cross_analysis_id": ca_id}).in_(
            "id", [dream["id"], daily["id"]]
        ).execute()

        return cross_insight

    except Exception as e:
        print(f"Cross analysis error: {e}")
        return None


def determine_mood(roi_summary: dict) -> str:
    """Simple mood label from dominant brain signal"""
    el = roi_summary["emotional_load"]
    rp = roi_summary["rational_processing"]
    sr = roi_summary["self_referential"]
    ic = roi_summary["internal_conflict"]

    if el > 75:
        return "grief · heavy"
    elif ic > 70:
        return "conflicted · uncertain"
    elif rp > 70 and el < 40:
        return "focused · clear"
    elif sr > 70:
        return "reflective · inward"
    elif el > 50:
        return "tender · present"
    else:
        return "quiet · still"


@app.get("/health")
def health():
    return {"status": "DreamScribe backend alive", "emoji": "🕯️"}


@app.get("/ember/insights/{user_id}")
def get_ember_insights(user_id: str):
    """Get Ember's pattern insights for a user + global"""
    personal = supabase.table("ember_insights").select("*").eq("user_id", user_id).eq("scope", "personal").order("created_at", ascending=False).execute()
    global_ins = supabase.table("ember_insights").select("*").eq("scope", "global").order("created_at", ascending=False).execute()
    return {
        "personal": personal.data or [],
        "global": global_ins.data or [],
    }


@app.post("/ember/run-global")
def trigger_global_analysis():
    """Manually trigger Ember's global community analysis"""
    analyze_global_patterns()
    return {"status": "Ember global analysis complete"}


@app.post("/ember/run-personal/{user_id}")
def trigger_personal_analysis(user_id: str):
    """Manually trigger Ember's personal pattern analysis for a user"""
    import traceback as tb
    try:
        analyze_user_patterns(user_id=user_id, latest_entry_id="manual")
        return {"status": f"Ember personal analysis complete for {user_id}"}
    except Exception as e:
        return {"error": str(e), "traceback": tb.format_exc()[-1500:]}


@app.get("/debug-mnemo")
def debug_mnemo():
    """Test Mnemo HTTP /ingest endpoint"""
    from mnemo_layer import mnemo_track
    result = mnemo_track(
        agent_id="dreamscribe-test",
        prompt="Test connection from DreamScribe backend",
        response="Health check successful",
        metadata={"source": "debug-endpoint", "test": True},
    )
    return {"v": 4, "result": result}


@app.get("/debug-download")
def debug_download():
    """Test downloading a file from Supabase storage using requests (HTTP/1.1)"""
    import tempfile, requests as req_lib, re
    try:
        audio_url = "https://sgykmljqkjstkkmeccay.supabase.co/storage/v1/object/sign/audio-entries/c033bdc3-0c00-4cad-8913-9cb7743ee0b3/daily/1775006494712.webm"
        match = re.search(r"audio-entries/(.+?)(?:\?|$)", audio_url)
        file_path = match.group(1) if match else "unknown"

        supabase_url = os.environ.get("SUPABASE_URL", "").strip()
        service_key = os.environ.get("SUPABASE_SERVICE_KEY", "").strip()

        download_url = f"{supabase_url}/storage/v1/object/audio-entries/{file_path}"
        response = req_lib.get(
            download_url,
            headers={
                "Authorization": f"Bearer {service_key}",
                "apikey": service_key,
            },
            timeout=60,
        )

        return {
            "status": "ok" if response.status_code == 200 else "error",
            "http_status": response.status_code,
            "content_length": len(response.content),
            "download_url": download_url,
            "file_path": file_path,
            "supabase_url_set": bool(supabase_url),
            "service_key_set": bool(service_key),
        }
    except Exception as e:
        import traceback as tb
        return {"status": "error", "error": str(e), "traceback": tb.format_exc()}

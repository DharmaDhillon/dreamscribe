import ffmpeg
import tempfile
import os
import re
import requests


def download_from_supabase(audio_url: str, dest_path: str):
    """
    Download audio from Supabase Storage using the service key
    via direct HTTP/1.1 request (avoids HTTP/2 StreamReset issues).
    """
    supabase_url = os.environ["SUPABASE_URL"].strip()
    service_key = os.environ["SUPABASE_SERVICE_KEY"].strip()

    # Extract file path from Supabase storage URL
    match = re.search(r"audio-entries/(.+?)(?:\?|$)", audio_url)
    if not match:
        raise ValueError(f"Could not extract storage path from URL: {audio_url}")

    file_path = match.group(1)
    print(f"Downloading from Supabase storage: audio-entries/{file_path}")

    # Use the Supabase Storage REST API directly with HTTP/1.1
    download_url = f"{supabase_url}/storage/v1/object/audio-entries/{file_path}"
    response = requests.get(
        download_url,
        headers={
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key,
        },
        timeout=60,
    )
    response.raise_for_status()

    with open(dest_path, "wb") as f:
        f.write(response.content)

    file_size = os.path.getsize(dest_path)
    print(f"Downloaded {file_size} bytes to {dest_path}")

    if file_size == 0:
        raise ValueError("Downloaded file is empty")


def convert_webm_to_mp3(input_path: str, output_path: str):
    """Convert .webm to .mp3 using ffmpeg"""
    (
        ffmpeg.input(input_path)
        .output(output_path, acodec="libmp3lame", ar=16000, ac=1)
        .overwrite_output()
        .run(quiet=True)
    )


def get_temp_paths(entry_id: str) -> dict:
    """Get temp file paths for audio processing"""
    tmp = tempfile.gettempdir()
    return {
        "webm": os.path.join(tmp, f"{entry_id}.webm"),
        "mp3": os.path.join(tmp, f"{entry_id}.mp3"),
    }


def cleanup(paths: dict):
    """Remove temp files"""
    for p in paths.values():
        if os.path.exists(p):
            os.remove(p)

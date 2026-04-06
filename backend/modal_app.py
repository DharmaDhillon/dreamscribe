"""
Modal deployment config.
Currently runs WITHOUT GPU using mock TRIBE v2 inference.
Real Claude insights + Mnemo memory still fully active.
Enable GPU + tribev2 when ready for real neural analysis.

Deploy with:
  cd backend
  modal deploy modal_app.py
"""

import modal

app = modal.App("dreamscribe-backend")

# Container image — lightweight for now (no torch/tribev2)
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install(
        "fastapi",
        "uvicorn",
        "python-multipart",
        "supabase",
        "anthropic",
        "ffmpeg-python",
        "numpy",
        "scipy",
        "python-dotenv",
        "httpx",
        "pydantic",
        "requests",
        "openai-whisper",
        "torch",
        "mnemo-sdk[all]",
        "mem0ai",
    )
    .env({"BUILD_VERSION": "9"})
    .add_local_dir(".", remote_path="/root")
)


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("dreamscribe-secrets")],
    timeout=300,
    scaledown_window=60,
    memory=8192,
)
@modal.asgi_app()
def fastapi_app():
    import sys
    sys.path.insert(0, "/root")
    from main import app as fastapi_application

    return fastapi_application
# rebuild Thu, Apr  2, 2026  6:33:39 PM

"""
Run this script to create/update the Modal secret with keys from .env file.
This avoids hardcoding secrets in source.

Usage:
    py create_secret.py
"""
import subprocess
import sys
import os
from pathlib import Path


def load_env(env_path: Path) -> dict:
    """Read .env file into dict (no python-dotenv dependency)."""
    if not env_path.exists():
        return {}
    out = {}
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def main():
    env_file = Path(__file__).parent / ".env"
    secrets = load_env(env_file)

    if not secrets:
        print("ERROR: backend/.env not found or empty.")
        print("Create backend/.env from .env.example with your real keys first.")
        sys.exit(1)

    required = [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_KEY",
        "ANTHROPIC_API_KEY",
        "HF_TOKEN",
        "MNEMO_TENANT_ID",
        "MNEMO_API_URL",
    ]
    missing = [k for k in required if k not in secrets]
    if missing:
        print(f"ERROR: missing keys in backend/.env: {', '.join(missing)}")
        sys.exit(1)

    args = [sys.executable, "-m", "modal", "secret", "create", "dreamscribe-secrets", "--force"]
    for k in required:
        args.append(f"{k}={secrets[k]}")

    result = subprocess.run(args, capture_output=True, text=True)
    print(result.stdout)
    if result.returncode != 0:
        print("ERROR:", result.stderr)
    else:
        print("Secret created successfully!")


if __name__ == "__main__":
    main()

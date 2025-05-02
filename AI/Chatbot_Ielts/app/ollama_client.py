import subprocess
from fastapi import HTTPException

OLLAMA_CMD = "ollama"
MODEL_NAME = "deepseek"

async def query_ollama(prompt: str) -> str:
    """
    Send prompt to Ollama CLI and return the generated response.
    Assumes `ollama serve` is running locally and model name is configured.
    """
    try:
        completed = subprocess.run(
            [OLLAMA_CMD, "predict", MODEL_NAME, prompt],
            capture_output=True,
            text=True,
            check=True
        )
        return completed.stdout.strip()
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Ollama error: {e.stderr}")
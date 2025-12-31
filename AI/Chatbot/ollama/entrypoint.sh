#!/bin/sh

echo "Starting Ollama server..."
echo "Railway PORT: ${PORT:-not set (using default 11434)}"

ollama serve &

echo "Waiting for Ollama server to be ready..."
timeout=60
elapsed=0
until ollama list >/dev/null 2>&1; do
  if [ $elapsed -ge $timeout ]; then
    echo "Error: Ollama server failed to start within ${timeout} seconds"
    exit 1
  fi
  sleep 1
  elapsed=$((elapsed + 1))
done

echo "Ollama server is ready!"

echo "Pulling model from HuggingFace..."
MODEL_NAME="${OLLAMA_MODEL:-hf.co/Zkare/Chatbot_Ielts_Assistant_v2:Q4_K_M}"
ollama pull "$MODEL_NAME"

if [ $? -eq 0 ]; then
  echo "Model pulled successfully: $MODEL_NAME"
else
  echo "Warning: Failed to pull model $MODEL_NAME, but continuing..."
fi

echo "Ollama service is running. Model: $MODEL_NAME"
wait

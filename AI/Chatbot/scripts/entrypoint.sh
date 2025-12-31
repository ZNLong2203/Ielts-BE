#!/bin/sh

ollama serve &

echo "Waiting for Ollama server to be ready..."
until ollama list >/dev/null 2>&1; do
  sleep 1
done

echo "Pulling model..."
ollama pull hf.co/Zkare/Chatbot_Ielts_Assistant_v2:Q4_K_M

# Giữ container sống
wait

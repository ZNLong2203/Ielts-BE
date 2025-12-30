FROM ollama/ollama:latest

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV OLLAMA_HOST=0.0.0.0
ENV OLLAMA_KEEP_ALIVE=24h
ENV OLLAMA_NUM_PARALLEL=2
ENV OLLAMA_MAX_LOADED_MODELS=1
ENV OLLAMA_MODEL=hf.co/Zkare/Chatbot_Ielts_Assistant_v2:Q4_K_M

EXPOSE 11434

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD ollama list || exit 1

ENTRYPOINT ["sh", "/entrypoint.sh"]

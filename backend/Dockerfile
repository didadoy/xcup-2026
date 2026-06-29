# Backend del Mundial 2026 para Hugging Face Spaces (SDK: docker).
# HF Spaces expone el puerto 7860 (ver app_port en README.md).
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# El backend reescribe en runtime trained_ratings.json (en /app) y la caché
# data/state_cache.json + results.csv (en /app/data). HF puede correr el
# contenedor como usuario no-root, así que dejamos /app escribible.
RUN mkdir -p /app/data && chmod -R 777 /app

EXPOSE 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]

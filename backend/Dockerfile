# -----------------------------------------------------------------------------
# ایمیج تولید سبک برای FastAPI — نسخه Python پایدار روی 3.12
# -----------------------------------------------------------------------------
FROM python:3.12-slim

WORKDIR /app

# libpq برای Postgres؛ libgomp برای onnxruntime/rembg
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

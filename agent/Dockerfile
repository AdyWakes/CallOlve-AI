# CallOlve phone worker — always-on container (Azure Container Apps, etc.)
FROM python:3.12-slim

# System libs: Azure Speech SDK (libasound2, ca-certificates) + onnxruntime/silero (libgomp1)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libasound2 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Pre-download model weights (silero VAD, turn detector) into the image so the
# first call starts warm instead of downloading at runtime.
RUN python agent.py download-files || true

# The worker dials OUT to LiveKit; no inbound port is needed.
CMD ["python", "agent.py", "start"]

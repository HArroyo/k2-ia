FROM python:3.10-slim

# Instalar dependencias del sistema requeridas para OpenCV y utilidades
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    curl \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar e instalar requerimientos
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copiar código fuente del microservicio
COPY . .

# Crear directorio de snapshots
RUN mkdir -p /storage/snapshots /storage/forensic_videos

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]

FROM python:3.11-slim

WORKDIR /app

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Dépendances système pour compiler et faire tourner les libs ML/CV/OCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    gfortran \
    cmake \
    swig \
    pkg-config \
    python3-dev \
    libssl-dev \
    libffi-dev \
    libopencv-dev \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1 \
    libgtk-3-0 \
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    libfreetype6-dev \
    libharfbuzz-dev \
    libopenjp2-7-dev \
    libopenblas-dev \
    libblas-dev \
    liblapack-dev \
    libmagic1 \
    tesseract-ocr \
    tesseract-ocr-ara \
    tesseract-ocr-fra \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Mise à jour de pip
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Copie des requirements
COPY requirements.txt .

# Installation préférentielle des wheels précompilés (évite la compilation)
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt

# Copie du code
COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    git \
    curl \
    default-jre \
    && rm -rf /var/lib/apt/lists/*

# Instalar uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Crear entorno virtual e instalar marimo + PySpark
RUN uv venv /opt/venv && \
    uv pip install --python /opt/venv/bin/python marimo pyspark pandas numpy

ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHON="/opt/venv/bin/python"
ENV JAVA_HOME="/usr/lib/jvm/default-java"

# Puerto para marimo
EXPOSE 2718

# Crear directorio para notebooks
RUN mkdir -p /app/notebooks

# Iniciar marimo en modo headless
CMD ["marimo", "edit", "/app/notebooks", "--host", "0.0.0.0", "--port", "2718", "--headless", "--no-token"]

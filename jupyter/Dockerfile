FROM jupyter/pyspark-notebook:latest

USER root

# Instalar py4j que parece faltar en la imagen base
RUN pip install --no-cache-dir py4j

# Asegurar que py4j esté disponible
ENV PYTHONPATH="/usr/local/spark/python:/opt/conda/lib/python3.11/site-packages:${PYTHONPATH}"
ENV PYSPARK_PYTHON="/opt/conda/bin/python"
ENV PYSPARK_DRIVER_PYTHON="/opt/conda/bin/python"

USER jovyan

FROM jupyter/pyspark-notebook:latest

USER root

# Instalar dependencias necesarias
RUN pip install --no-cache-dir py4j grpcio grpcio-tools pyspark[connect]

# Crear directorio para logs de Spark (con permisos correctos)
RUN mkdir -p /usr/local/spark/logs /var/log/spark && \
    chown -R jovyan:users /usr/local/spark/logs /var/log/spark

# Configurar log4j para Spark
RUN echo 'log4j.rootCategory=INFO, file' > /usr/local/spark/conf/log4j.properties && \
    echo 'log4j.appender.file=org.apache.log4j.FileAppender' >> /usr/local/spark/conf/log4j.properties && \
    echo 'log4j.appender.file.File=/var/log/spark/pyspark.log' >> /usr/local/spark/conf/log4j.properties && \
    echo 'log4j.appender.file.layout=org.apache.log4j.PatternLayout' >> /usr/local/spark/conf/log4j.properties && \
    echo 'log4j.appender.file.layout.ConversionPattern=%d{yy/MM/dd HH:mm:ss} %p %c{1}: %m%n' >> /usr/local/spark/conf/log4j.properties

# Crear kernel spec para Spark
RUN mkdir -p /usr/local/share/jupyter/kernels/spark
COPY spark-kernel.json /usr/local/share/jupyter/kernels/spark/kernel.json

# Script de inicio para Spark Connect
COPY start-spark-connect.sh /usr/local/bin/start-spark-connect.sh
RUN chmod +x /usr/local/bin/start-spark-connect.sh

# Exponer puerto de Spark Connect
EXPOSE 15002

# Asegurar que py4j esté disponible
ENV PYTHONPATH="/usr/local/spark/python:/opt/conda/lib/python3.11/site-packages:${PYTHONPATH}"
ENV PYSPARK_PYTHON="/opt/conda/bin/python"
ENV PYSPARK_DRIVER_PYTHON="/opt/conda/bin/python"

USER jovyan

# Iniciar Jupyter y Spark Connect
CMD ["/bin/bash", "-c", "/usr/local/bin/start-spark-connect.sh & jupyter lab --ip=0.0.0.0 --port=8888 --no-browser --allow-root --ServerApp.token=mylake-token-123"]

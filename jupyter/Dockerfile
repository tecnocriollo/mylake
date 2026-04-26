FROM jupyter/pyspark-notebook:latest

USER root

# Instalar py4j que parece faltar en la imagen base
RUN pip install --no-cache-dir py4j

# Crear directorio para logs de Spark
RUN mkdir -p /var/log/spark && chown jovyan:users /var/log/spark

# Configurar log4j para Spark - redirigir logs a archivo
RUN echo 'log4j.rootCategory=INFO, file' > /usr/local/spark/conf/log4j.properties && \
    echo 'log4j.appender.file=org.apache.log4j.FileAppender' >> /usr/local/spark/conf/log4j.properties && \
    echo 'log4j.appender.file.File=/var/log/spark/pyspark.log' >> /usr/local/spark/conf/log4j.properties && \
    echo 'log4j.appender.file.layout=org.apache.log4j.PatternLayout' >> /usr/local/spark/conf/log4j.properties && \
    echo 'log4j.appender.file.layout.ConversionPattern=%d{yy/MM/dd HH:mm:ss} %p %c{1}: %m%n' >> /usr/local/spark/conf/log4j.properties

# Asegurar que py4j esté disponible
ENV PYTHONPATH="/usr/local/spark/python:/opt/conda/lib/python3.11/site-packages:${PYTHONPATH}"
ENV PYSPARK_PYTHON="/opt/conda/bin/python"
ENV PYSPARK_DRIVER_PYTHON="/opt/conda/bin/python"

USER jovyan

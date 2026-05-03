FROM eclipse-temurin:11-jre

USER root

# Instalar dependencias
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    netcat-openbsd \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Descargar Spark 3.5.0
ENV SPARK_VERSION=3.5.0
ENV HADOOP_VERSION=3
ENV SPARK_HOME=/opt/spark

RUN wget -q https://archive.apache.org/dist/spark/spark-${SPARK_VERSION}/spark-${SPARK_VERSION}-bin-hadoop${HADOOP_VERSION}.tgz \
    && tar xzf spark-${SPARK_VERSION}-bin-hadoop${HADOOP_VERSION}.tgz \
    && mv spark-${SPARK_VERSION}-bin-hadoop${HADOOP_VERSION} ${SPARK_HOME} \
    && rm spark-${SPARK_VERSION}-bin-hadoop${HADOOP_VERSION}.tgz

# Configurar environment
ENV PATH=${SPARK_HOME}/bin:${SPARK_HOME}/sbin:${PATH}
ENV PYSPARK_PYTHON=python3
ENV PYSPARK_DRIVER_PYTHON=python3

# Crear directorios
RUN mkdir -p /var/log/spark /tmp/spark-events \
    && chmod 777 /var/log/spark /tmp/spark-events

# Configurar Spark
COPY spark-defaults.conf ${SPARK_HOME}/conf/spark-defaults.conf
COPY log4j.properties ${SPARK_HOME}/conf/log4j.properties

# Puerto Spark Connect
EXPOSE 15002 4040 8080 8888

# Script de inicio
COPY start-spark.sh /usr/local/bin/start-spark.sh
RUN chmod +x /usr/local/bin/start-spark.sh

CMD ["/usr/local/bin/start-spark.sh"]

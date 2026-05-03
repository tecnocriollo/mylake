#!/bin/bash
set -e

# Configurar Spark Connect
export SPARK_HOME=/usr/local/spark
export PATH=$PATH:$SPARK_HOME/bin:$SPARK_HOME/sbin

# Verificar que el directorio de logs existe
mkdir -p /usr/local/spark/logs

# Iniciar Spark Connect server
$SPARK_HOME/sbin/start-connect-server.sh \
  --packages org.apache.spark:spark-connect_2.12:3.5.0 \
  --conf spark.connect.grpc.binding.host=0.0.0.0 \
  --conf spark.connect.grpc.binding.port=15002 \
  --conf spark.sql.adaptive.enabled=true

# Mantener el script corriendo
tail -f /usr/local/spark/logs/*.out || true

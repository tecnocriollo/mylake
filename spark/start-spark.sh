#!/bin/bash
set -e

# Iniciar Spark Connect Server
${SPARK_HOME}/sbin/start-connect-server.sh \
  --packages org.apache.spark:spark-connect_2.12:3.5.0 \
  --conf spark.connect.grpc.binding.host=0.0.0.0 \
  --conf spark.connect.grpc.binding.port=15002 \
  --conf spark.sql.adaptive.enabled=true \
  --conf spark.driver.memory=2g \
  --conf spark.executor.memory=2g

echo "Spark Connect server started on port 15002"

# Mantener el contenedor corriendo
tail -f /var/log/spark/*.log || sleep infinity

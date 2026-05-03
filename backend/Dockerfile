FROM golang:1.21-bookworm AS builder

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o /out/mylake .

FROM python:3.11-slim-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    default-jre-headless \
    && rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/default-java

COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

RUN uv venv /opt/venv && \
    uv pip install --python /opt/venv/bin/python pyspark grpcio protobuf marimo

ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHON="/opt/venv/bin/python"

COPY --from=builder /out/mylake /usr/local/bin/mylake

EXPOSE 8080

CMD ["/usr/local/bin/mylake"]

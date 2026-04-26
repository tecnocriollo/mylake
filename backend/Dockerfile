FROM golang:1.23-alpine

WORKDIR /app

RUN apk add --no-cache git

COPY . .

RUN go mod tidy
RUN go mod download

EXPOSE 8080

CMD ["go", "run", "main.go"]

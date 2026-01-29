FROM golang:1.23-alpine AS builder

WORKDIR /build

# Copy module files first for better caching
COPY go.mod .
COPY main.go .

# Download dependencies, generate go.sum, and build
RUN go mod tidy && \
    CGO_ENABLED=0 go build -o pocketbase .

# Runtime stage
FROM alpine:3.20

RUN apk add --no-cache ca-certificates

COPY --from=builder /build/pocketbase /usr/local/bin/pocketbase
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /pb

EXPOSE 8090

ENTRYPOINT ["/entrypoint.sh"]
CMD ["serve", "--http=0.0.0.0:8090"]

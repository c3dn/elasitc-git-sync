FROM golang:alpine AS builder

WORKDIR /build

COPY go.mod .
COPY main.go .

RUN go mod tidy && \
    CGO_ENABLED=0 go build -o pocketbase .

# Runtime stage
FROM alpine:3.20

RUN apk add --no-cache ca-certificates

# Add Python runtime and git for detection-rules CLI
RUN apk add --no-cache python3 py3-pip git

# Install Python dependencies for sync service
COPY sync_service/requirements.txt /pb/sync_service/requirements.txt
RUN pip3 install --break-system-packages --no-cache-dir -r /pb/sync_service/requirements.txt

# Install detection-rules CLI from GitHub
RUN pip3 install --break-system-packages --no-cache-dir \
    "detection-rules @ git+https://github.com/elastic/detection-rules.git" || \
    echo "WARNING: detection-rules CLI install failed, API fallback will be used"

COPY --from=builder /build/pocketbase /pb/pocketbase
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Bake hooks and migrations next to the binary
COPY pb_hooks /pb/pb_hooks
COPY pb_migrations /pb/pb_migrations

# Copy sync service
COPY sync_service /pb/sync_service

WORKDIR /pb

EXPOSE 8090
EXPOSE 8091

ENTRYPOINT ["/entrypoint.sh"]
CMD ["serve", "--http=0.0.0.0:8090"]

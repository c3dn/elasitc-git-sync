FROM golang:alpine AS builder

WORKDIR /build

COPY go.mod .
COPY main.go .

RUN go mod tidy && \
    CGO_ENABLED=0 go build -o pocketbase .

# Runtime stage
FROM alpine:3.20

RUN apk add --no-cache ca-certificates

COPY --from=builder /build/pocketbase /pb/pocketbase
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Bake hooks and migrations next to the binary
COPY pb_hooks /pb/pb_hooks
COPY pb_migrations /pb/pb_migrations

WORKDIR /pb

EXPOSE 8090

ENTRYPOINT ["/entrypoint.sh"]
CMD ["serve", "--http=0.0.0.0:8090"]

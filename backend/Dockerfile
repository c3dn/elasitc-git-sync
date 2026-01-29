FROM golang:1.23-alpine AS builder

WORKDIR /build

COPY main.go .

RUN go mod init elastic-git-sync && \
    go get github.com/pocketbase/pocketbase@latest && \
    go mod tidy && \
    CGO_ENABLED=0 go build -o pocketbase .

# Runtime stage
FROM alpine:3.20

RUN apk add --no-cache ca-certificates

COPY --from=builder /build/pocketbase /usr/local/bin/pocketbase
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8090

ENTRYPOINT ["/entrypoint.sh"]
CMD ["serve", "--http=0.0.0.0:8090"]

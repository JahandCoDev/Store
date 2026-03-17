# ── Build Stage ──────────────────────────────────────────────────────────────
FROM golang:1.25-alpine AS builder

RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o voice-router .

# ── Runtime Stage ─────────────────────────────────────────────────────────────
FROM scratch

# Copy timezone data and certs from builder
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

COPY --from=builder /app/voice-router /voice-router
COPY --from=builder /app/HoldAudio.ogg /HoldAudio.ogg

EXPOSE 8080

ENTRYPOINT ["/voice-router"]

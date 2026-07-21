# Self-contained build of tee-proxy. Clones both tee-proxy and tee-node
# (its dependency) from GitHub so no local sibling repos are needed.

ARG TEE_PROXY_VERSION=develop
ARG TEE_NODE_VERSION=develop

FROM golang:1.25.1-alpine AS builder

RUN apk add --no-cache git

ARG TEE_PROXY_VERSION
ARG TEE_NODE_VERSION

WORKDIR /app
RUN git clone --depth 1 --branch ${TEE_PROXY_VERSION} https://github.com/flare-foundation/tee-proxy.git
RUN git clone --depth 1 --branch ${TEE_NODE_VERSION} https://github.com/flare-foundation/tee-node.git

WORKDIR /app/tee-proxy

# develop already wires actionQueues in NewExternal; no sed patch needed.

RUN for i in 1 2 3 4 5 6 7 8 9 10 11 12; do \
      GOPROXY=https://proxy.golang.org,https://goproxy.io,direct \
      GOSUMDB=off \
      go mod download && \
      CGO_ENABLED=0 GOOS=linux go build -a -o main ./cmd/proxy && break || \
      (echo "proxy build retry $i" && rm -rf /go/pkg/mod/cache/download/github.com/ethereum 2>/dev/null; sleep 15); \
    done; \
    test -f main

# Final stage
FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/tee-proxy/main .
COPY --from=builder /app/tee-proxy/config.example.toml ./config/config.toml

RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 6661
EXPOSE 6662

CMD ["./main"]

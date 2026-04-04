#!/usr/bin/env bash
set -euo pipefail

# Installs/updates 1Password Connect into the `ecom` namespace and refreshes
# the Kubernetes secret needed by the Postgres pod.
#
# Required:
#   OP_CONNECT_TOKEN                - Connect API token for workloads and sync.
#   OP_CONNECT_CREDENTIALS_FILE     - Path to 1password-credentials.json
#
# Example:
#   export OP_CONNECT_TOKEN="..."
#   export OP_CONNECT_CREDENTIALS_FILE="$HOME/Downloads/1password-credentials.json"
#   ./k8s/onepassword/install.sh

NAMESPACE="ecom"
CONNECT_RELEASE="onepassword-connect"
CONNECT_TOKEN_SECRET="onepassword-connect-token"
CONNECT_HOST="http://onepassword-connect:8080"
APP_SECRETS_ITEM="${OP_APP_SECRETS_ITEM:-App-Secrets}"

: "${OP_CONNECT_TOKEN:?OP_CONNECT_TOKEN is required}"
: "${OP_CONNECT_CREDENTIALS_FILE:?OP_CONNECT_CREDENTIALS_FILE is required}"

if [[ ! -f "$OP_CONNECT_CREDENTIALS_FILE" ]]; then
  echo "Credentials file not found: $OP_CONNECT_CREDENTIALS_FILE" >&2
  exit 1
fi

echo "==> Adding/updating 1Password Helm repo"
helm repo add 1password https://1password.github.io/connect-helm-charts >/dev/null 2>&1 || true
helm repo update 1password >/dev/null

echo "==> Installing/upgrading Connect"
helm upgrade --install "$CONNECT_RELEASE" 1password/connect \
  --namespace "$NAMESPACE" \
  --values k8s/onepassword/values-connect-operator.yaml \
  --set-file connect.credentials="$OP_CONNECT_CREDENTIALS_FILE"

echo "==> Syncing Connect token secret for workloads"
kubectl -n "$NAMESPACE" create secret generic "$CONNECT_TOKEN_SECRET" \
  --from-literal=token="$OP_CONNECT_TOKEN" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "==> Syncing postgres-secret from 1Password Connect"
OP_CONNECT_HOST="$CONNECT_HOST" \
OP_CONNECT_TOKEN="$OP_CONNECT_TOKEN" \
OP_CONNECT_VAULT="${OP_CONNECT_VAULT:-Ecom}" \
OP_CONNECT_ITEM="$APP_SECRETS_ITEM" \
OP_K8S_SECRET_NAMESPACE="$NAMESPACE" \
OP_K8S_SECRET_NAME="postgres-secret" \
OP_K8S_SECRET_KEYS="POSTGRES_DB,POSTGRES_USER,POSTGRES_PASSWORD" \
node admin/scripts/sync-k8s-secret-from-connect.mjs

echo "==> Done"

kubectl -n "$NAMESPACE" get pods | grep -E "onepassword|NAME" || true

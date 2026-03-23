#!/usr/bin/env bash
set -euo pipefail

# Installs/updates 1Password Connect + Operator + Injector into the `ecom` namespace.
#
# Required:
#   OP_CONNECT_TOKEN                - Connect API token for the operator.
#   OP_CONNECT_CREDENTIALS_FILE     - Path to 1password-credentials.json
#
# Example:
#   export OP_CONNECT_TOKEN="..."
#   export OP_CONNECT_CREDENTIALS_FILE="$HOME/Downloads/1password-credentials.json"
#   ./k8s/onepassword/install.sh

NAMESPACE="ecom"
CONNECT_RELEASE="onepassword-connect"
INJECTOR_RELEASE="onepassword-injector"

: "${OP_CONNECT_TOKEN:?OP_CONNECT_TOKEN is required}"
: "${OP_CONNECT_CREDENTIALS_FILE:?OP_CONNECT_CREDENTIALS_FILE is required}"

if [[ ! -f "$OP_CONNECT_CREDENTIALS_FILE" ]]; then
  echo "Credentials file not found: $OP_CONNECT_CREDENTIALS_FILE" >&2
  exit 1
fi

echo "==> Ensuring namespace + label"
kubectl apply -f k8s/ecom-namespace.yaml

echo "==> Adding/updating 1Password Helm repo"
helm repo add 1password https://1password.github.io/connect-helm-charts >/dev/null 2>&1 || true
helm repo update 1password >/dev/null

echo "==> Installing/upgrading Connect + Operator"
helm upgrade --install "$CONNECT_RELEASE" 1password/connect \
  --namespace "$NAMESPACE" \
  --values k8s/onepassword/values-connect-operator.yaml \
  --set-file connect.credentials="$OP_CONNECT_CREDENTIALS_FILE" \
  --set-string operator.token.value="$OP_CONNECT_TOKEN"

echo "==> Installing/upgrading Secrets Injector"
helm upgrade --install "$INJECTOR_RELEASE" 1password/secrets-injector \
  --namespace "$NAMESPACE" \
  --values k8s/onepassword/values-injector.yaml

echo "==> Done"

kubectl -n "$NAMESPACE" get pods | grep -E "onepassword|injector|NAME" || true

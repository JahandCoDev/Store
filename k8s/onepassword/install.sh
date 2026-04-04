#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
NAMESPACE="${OP_K8S_NAMESPACE:-ecom}"
RELEASE_NAME="${OP_HELM_RELEASE_NAME:-onepassword-operator}"
SERVICE_ACCOUNT_TOKEN_REF="${OP_SERVICE_ACCOUNT_TOKEN_REF:-op://Ecom/zbehhh3yyogaf4yqr4okiakezm/credential}"
GCP_SERVICE_ACCOUNT_REF="${OP_GCP_SERVICE_ACCOUNT_REF:-op://Ecom/gcp-service-account/gcp-service-account.json}"
VALUES_FILE="$SCRIPT_DIR/values-service-account-operator.yaml"
ITEMS_FILE="$SCRIPT_DIR/onepassword-items.yaml"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

resolve_service_account_token() {
  if [[ -n "${OP_SERVICE_ACCOUNT_TOKEN:-}" ]]; then
    printf '%s' "$OP_SERVICE_ACCOUNT_TOKEN"
    return
  fi

  if ! op whoami >/dev/null 2>&1; then
    echo "1Password CLI is not signed in. Run 'op signin' or export OP_SERVICE_ACCOUNT_TOKEN first." >&2
    exit 1
  fi

  op read "$SERVICE_ACCOUNT_TOKEN_REF"
}

sync_gcp_secret() {
  local tmpfile
  tmpfile="$(mktemp)"
  trap 'rm -f "$tmpfile"' EXIT

  op read "$GCP_SERVICE_ACCOUNT_REF" > "$tmpfile"

  kubectl -n "$NAMESPACE" create secret generic gcp-sa-key \
    --from-file=key.json="$tmpfile" \
    --dry-run=client -o yaml | kubectl apply -f -
}

wait_for_secret() {
  local name="$1"
  local attempts="${2:-30}"
  local delay_secs="${3:-2}"
  local i

  for ((i = 1; i <= attempts; i++)); do
    if kubectl -n "$NAMESPACE" get secret "$name" >/dev/null 2>&1; then
      return 0
    fi
    sleep "$delay_secs"
  done

  echo "Timed out waiting for Kubernetes secret $NAMESPACE/$name to be created" >&2
  exit 1
}

main() {
  require_cmd helm
  require_cmd kubectl
  require_cmd op

  local service_account_token
  service_account_token="$(resolve_service_account_token)"

  helm repo add 1password https://1password.github.io/connect-helm-charts >/dev/null 2>&1 || true
  helm repo update 1password >/dev/null

  helm upgrade --install "$RELEASE_NAME" 1password/connect \
    --namespace "$NAMESPACE" \
    --create-namespace \
    --values "$VALUES_FILE" \
    --set-string operator.authMethod=service-account \
    --set-string operator.serviceAccountToken.value="$service_account_token"

  kubectl apply -f "$ITEMS_FILE"
  wait_for_secret app-configs
  wait_for_secret telephony-configs
  sync_gcp_secret

  kubectl -n "$NAMESPACE" get pods | grep -E 'onepassword|NAME' || true
  kubectl -n "$NAMESPACE" get onepassworditems || true
  kubectl -n "$NAMESPACE" get secret app-configs telephony-configs gcp-sa-key || true
}

main "$@"
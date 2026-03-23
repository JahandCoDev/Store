#!/usr/bin/env bash
set -euo pipefail

NAMESPACE=${NAMESPACE:-ecom}
SECRET_NAME=${SECRET_NAME:-registry-credentials}
REGISTRY_SERVER=${REGISTRY_SERVER:-registry.jahandco.dev}
REGISTRY_USERNAME=${REGISTRY_USERNAME:-}
REGISTRY_PASSWORD=${REGISTRY_PASSWORD:-}
REGISTRY_EMAIL=${REGISTRY_EMAIL:-}

if [[ -z "$REGISTRY_USERNAME" || -z "$REGISTRY_PASSWORD" ]]; then
  echo "ERROR: REGISTRY_USERNAME and REGISTRY_PASSWORD are required" >&2
  echo "Example:" >&2
  echo "  export REGISTRY_USERNAME=..." >&2
  echo "  export REGISTRY_PASSWORD=..." >&2
  echo "  ./k8s/registry/create-registry-credentials.sh" >&2
  exit 1
fi

email_args=()
if [[ -n "$REGISTRY_EMAIL" ]]; then
  email_args+=(--docker-email="$REGISTRY_EMAIL")
fi

kubectl -n "$NAMESPACE" create secret docker-registry "$SECRET_NAME" \
  --docker-server="$REGISTRY_SERVER" \
  --docker-username="$REGISTRY_USERNAME" \
  --docker-password="$REGISTRY_PASSWORD" \
  "${email_args[@]}" \
  --dry-run=client -o yaml \
  | kubectl apply -f -

echo "OK: ensured secret '$SECRET_NAME' exists in namespace '$NAMESPACE'"

cat <<EOF

Next checks (if pods still fail to pull):
- See exact error:
    kubectl -n $NAMESPACE describe pod <pod>
- If you see 'x509: certificate signed by unknown authority':
    your node/container runtime must trust the registry's TLS cert.
- If you see 'manifest unknown':
    the tag being pulled doesn't exist in $REGISTRY_SERVER (push step/tag mismatch).
EOF

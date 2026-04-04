# 1Password Service Account + Operator

This repo uses the 1Password Kubernetes Operator authenticated with a 1Password service account.

The operator syncs these items from vault `Ecom` into Kubernetes Secrets in namespace `ecom`:

- `app-configs` from item `app-configs`
- `telephony-configs` from item `telephony-configs`

The telephony GCP credentials remain a dedicated Kubernetes secret named `gcp-sa-key` because the app mounts a file key named `key.json` at runtime.

There is intentionally no checked-in `Secret` YAML for `app-configs` or `telephony-configs` in this repo. Those are runtime Kubernetes `Secret` objects created by the 1Password Operator from the `OnePasswordItem` resources after you apply them.

## Install / Upgrade

Run Helm directly or use the helper script in this directory.

Prerequisites:

- `helm`
- `kubectl`
- `op`
- an active `op` sign-in session, or `OP_SERVICE_ACCOUNT_TOKEN` already exported

The helper script defaults to these 1Password references:

- service account token: `op://Ecom/zbehhh3yyogaf4yqr4okiakezm/credential`
- telephony GCP file: `op://Ecom/gcp-service-account/gcp-service-account.json`

Install or upgrade everything:

```bash
./k8s/onepassword/install.sh
```

That script will:

1. install the 1Password Operator with `service-account` auth
2. apply the `OnePasswordItem` resources for `app-configs` and `telephony-configs`
3. wait for the operator to materialize the `app-configs` and `telephony-configs` Kubernetes `Secret` objects
4. sync the GCP service account JSON into the `gcp-sa-key` Kubernetes secret with key `key.json`

If you prefer running Helm manually:

```bash
helm repo add 1password https://1password.github.io/connect-helm-charts
helm repo update 1password

export OP_SERVICE_ACCOUNT_TOKEN="$(op read 'op://Ecom/zbehhh3yyogaf4yqr4okiakezm/credential')"

helm upgrade --install onepassword-operator 1password/connect \
  --namespace ecom \
  --create-namespace \
  --values k8s/onepassword/values-service-account-operator.yaml \
  --set-string operator.authMethod=service-account \
  --set-string operator.serviceAccountToken.value="$OP_SERVICE_ACCOUNT_TOKEN"

kubectl apply -f k8s/onepassword/onepassword-items.yaml
```

## Secret Mapping

- `app-configs` is consumed by admin, storefront, telephony, and postgres
- `telephony-configs` is consumed by telephony
- `gcp-sa-key` is consumed only by telephony as a mounted JSON file

`minio-s3-secret` remains managed by the existing Kubernetes secret manifest and is not sourced from 1Password.

## Notes

- `app-configs` and `telephony-configs` are the current 1Password item names in vault `Ecom`.
- The operator keeps synced Kubernetes Secrets updated automatically.
- The GCP JSON secret is synced separately because telephony expects a mounted file named `key.json`.
- To verify the runtime objects after install, run `kubectl -n ecom get onepassworditems,secrets`.
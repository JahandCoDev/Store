# 1Password Connect + Operator

This repo uses a 1Password Connect server together with the Kubernetes Operator.

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
- either an active `op` sign-in session or `OP_SERVICE_ACCOUNT_TOKEN` exported

The helper script defaults to these 1Password references:

- bootstrap service account token: `op://Ecom/zbehhh3yyogaf4yqr4okiakezm/credential`
- Connect API token: `op://Ecom/7tmdg2x3ei2urr45bdezrifmuy/credential`
- Connect credentials file: `op://Ecom/ufvzicfeacywisx5cwccngg6by/1password-credentials.json`
- telephony GCP file: `op://Ecom/gcp-service-account/gcp-service-account.json`

Install or upgrade everything:

```bash
./k8s/onepassword/install.sh
```

That script will:

1. install 1Password Connect and the Kubernetes Operator with `connect` auth
2. apply the `OnePasswordItem` resources for `app-configs` and `telephony-configs`
3. wait for the operator to materialize the `app-configs` and `telephony-configs` Kubernetes `Secret` objects
4. sync the GCP service account JSON into the `gcp-sa-key` Kubernetes secret with key `key.json`

If you prefer running Helm manually:

```bash
helm repo add 1password https://1password.github.io/connect-helm-charts
helm repo update 1password

export OP_CONNECT_TOKEN="$(op read 'op://Ecom/7tmdg2x3ei2urr45bdezrifmuy/credential')"

helm upgrade --install onepassword-connect 1password/connect \
  --namespace ecom \
  --create-namespace \
  --values k8s/onepassword/values-connect-operator.yaml \
  --set-file connect.credentials=/path/to/1password-credentials.json \
  --set-string operator.authMethod=connect \
  --set-string operator.token.value="$OP_CONNECT_TOKEN"

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
- Operator-driven restarts are enabled so deployments that consume updated synced secrets are restarted automatically.
- The GCP JSON secret is synced separately because telephony expects a mounted file named `key.json`.
- To verify the runtime objects after install, run `kubectl -n ecom get onepassworditems,secrets`.
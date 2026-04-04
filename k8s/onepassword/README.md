# 1Password Connect

This repo now loads application secrets directly from the in-cluster 1Password Connect API at container startup using the `@1password/connect` SDK.

That applies to:

- `admin`
- `storefront`
- `telephony`

The only remaining Kubernetes secret synced from 1Password is `postgres-secret`, because the plain `postgres` container cannot call the JavaScript SDK itself.

## Install / Upgrade (Helm)

1. Create or reuse your 1Password Connect server workflow and have:
   - `1password-credentials.json`
   - a Connect API token

2. Run the installer:

```bash
export OP_CONNECT_TOKEN="<your-connect-token>"
export OP_CONNECT_CREDENTIALS_FILE="/path/to/1password-credentials.json"
./k8s/onepassword/install.sh
```

This installs Connect into the `ecom` namespace, creates the workload token secret `onepassword-connect-token`, and refreshes `postgres-secret` from `Ecom/App-Secrets`.

## Runtime Mapping

- `admin` loads runtime fields from `Ecom/App-Secrets`
- `storefront` loads runtime fields from `Ecom/App-Secrets`
- `telephony` loads runtime fields from `Ecom/App-Secrets` and `Ecom/Telephony-Config`
- `postgres-secret` is synced from `Ecom/App-Secrets` with keys:
   - `POSTGRES_DB`
   - `POSTGRES_USER`
   - `POSTGRES_PASSWORD`

`minio-s3-secret` remains managed by the existing Kubernetes secret manifest and is not sourced from 1Password.

## Notes

- App containers authenticate with:
   - `OP_CONNECT_HOST=http://onepassword-connect:8080`
   - `OP_CONNECT_TOKEN` from the `onepassword-connect-token` Kubernetes secret
- The startup script is `scripts/start-with-connect.mjs` inside each app image.
- Telephony can materialize Google credentials from `App-Secrets` into a local JSON file before boot. Supported field aliases include:
   - `GOOGLE_APPLICATION_CREDENTIALS_JSON`
   - `GOOGLE_SERVICE_ACCOUNT_JSON`
   - `GCP_SERVICE_ACCOUNT_JSON`
   - `GCP_SA_KEY_JSON`
- Telephony also accepts an attached file named `gcp-key.json`, `key.json`, or `google-application-credentials.json`.
- `install.sh` runs `node admin/scripts/sync-k8s-secret-from-connect.mjs`, so `admin/node_modules` must be installed locally before using that helper.

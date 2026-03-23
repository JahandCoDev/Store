# 1Password (Connect + Operator + Injector)

This repo already uses `OnePasswordItem` resources in `k8s/onepassword-items.yaml`.
To make those work, you need:

- **1Password Connect** (in-cluster API + sync)
- **1Password Kubernetes Operator** (reconciles `OnePasswordItem` → Kubernetes `Secret`)
- **1Password Secrets Injector** (optional mutating webhook for `op://...` env values)

## Install / Upgrade (Helm)

1. Create a 1Password Connect server workflow and download:
   - `1password-credentials.json`
   - a Connect API token

2. Run the installer:

```bash
export OP_CONNECT_TOKEN="<your-connect-token>"
export OP_CONNECT_CREDENTIALS_FILE="/path/to/1password-credentials.json"
./k8s/onepassword/install.sh
```

This installs into the `ecom` namespace and labels it `secrets-injection=enabled`.

## Notes

- The Operator will watch only the `ecom` namespace (see `operator.watchNamespace`).
- The Injector does nothing unless you annotate a workload with `operator.1password.io/inject`.
- Injector also requires the target container to specify `command` (per 1Password docs).
- Each injected container must have credentials for the 1Password CLI:
   - Connect: `OP_CONNECT_HOST` + `OP_CONNECT_TOKEN`
   - OR Service Accounts: `OP_SERVICE_ACCOUNT_TOKEN`

## Example: Admin uses the Injector

The `admin` deployment in `k8s/admin.yaml` is wired to use the injector:

- Pod template annotations:
   - `operator.1password.io/inject: "admin"`
   - `operator.1password.io/version: "2"`
- Explicit `command`/`args` so the webhook can mutate startup.
- `NEXTAUTH_SECRET` is loaded from 1Password using:
   - `NEXTAUTH_SECRET=op://ProductionSecrets/Ecom-Secrets/NEXTAUTH_SECRET`
   - `OP_CONNECT_HOST=http://onepassword-connect:8080`
   - `OP_CONNECT_TOKEN` from the `onepassword-token` Kubernetes secret.

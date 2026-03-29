Seed
kubectl exec -n ecom deploy/admin -c admin -- sh -lc 'ADMIN_EMAIL="admin@jahandco.dev" ADMIN_PASSWORD="change-me-now" ADMIN_FIRST_NAME="Jah" ADMIN_LAST_NAME="Owner" npx prisma db seed --config prisma.config.ts'

Datadog private action runner HTTP token credential file:

Create a JSON file on the runner at:

/etc/dd-action-runner/config/credentials/http_token.json

with this shape:

```json
{
	"auth_type": "Token Auth",
	"credentials": [
		{
			"tokenName": "DDADMINAPPTOKEN",
			"tokenValue": "<your-admin-service-token>"
		},
		{
			"tokenName": "X_SHOP_ID",
			"tokenValue": "jahandco-shop"
		}
	]
}
```

Do not point Datadog at a file that only contains the raw token value. The private action runner expects a JSON credential file and will fail to parse a plain-text token file.

Kubernetes examples for mounting this into a private action runner:

- [k8s/datadog-par.yaml](k8s/datadog-par.yaml)
- [k8s/datadog-private-runner-admin-http-token.md](k8s/datadog-private-runner-admin-http-token.md)

- This example duplicates the admin token into a dedicated runner credential secret.
- The repo already stores `DD_ADMIN_APP_TOKEN` in `postgres-secret`, so if you want to avoid duplication the next step is an init container that renders `http_token.json` from that existing secret into an `emptyDir` volume.
- Do not mount a plain-text token file at this path. The Datadog runner expects the JSON structure shown above.
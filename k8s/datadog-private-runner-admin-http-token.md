# Datadog Private Action Runner Admin Credential Mount

Use this when your Datadog private HTTP connection needs to call the admin app with:

- `Authorization: Bearer {{ DDADMINAPPTOKEN }}`
- `X-Shop-Id: {{ X_SHOP_ID }}`

## Secret

Apply the secret manifest after replacing the placeholder token value:

```bash
kubectl apply -f k8s/datadog-par.yaml
```

The mounted file path Datadog should use is:

```text
/etc/dd-action-runner/config/credentials/http_token.json
```

## Deployment Mount

Add this volume to the private action runner pod spec:

```yaml
volumes:
  - name: admin-http-token-credentials
    secret:
      secretName: datadog-private-runner-admin-http-token
      items:
        - key: http_token.json
          path: http_token.json
```

Add this volume mount to the private action runner container:

```yaml
volumeMounts:
  - name: admin-http-token-credentials
    mountPath: /etc/dd-action-runner/config/credentials/http_token.json
    subPath: http_token.json
    readOnly: true
```

Use `subPath` so you do not hide any other files already present under `/etc/dd-action-runner/config/credentials`.

## Datadog Connection Values

For the Datadog private HTTP connection:

- Authentication type: `Token Auth`
- Credential file path: `/etc/dd-action-runner/config/credentials/http_token.json`

Then reference the credential values in headers:

```text
Authorization: Bearer {{ DDADMINAPPTOKEN }}
X-Shop-Id: {{ X_SHOP_ID }}
```

## Notes

- This example duplicates the admin token into a dedicated runner credential secret.
- The repo already stores `DD_ADMIN_APP_TOKEN` in `postgres-secret`, so if you want to avoid duplication the next step is an init container that renders `http_token.json` from that existing secret into an `emptyDir` volume.
- Do not mount a plain-text token file at this path. The Datadog runner expects the JSON structure shown above.
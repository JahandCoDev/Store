# Private Registry Pull Credentials

Your workloads in this repo pull images from:

- `registry.jahandco.dev/store/admin:<tag>`
- `registry.jahandco.dev/store/storefront:<tag>`
- `registry.jahandco.dev/store/telephony:<tag>`

The Kubernetes Deployments reference this pull secret:

- `registry-credentials` (in namespace `ecom`)

## Create / Update the pull secret

This repo does **not** commit registry credentials.

Run:

```bash
export REGISTRY_USERNAME="..."
export REGISTRY_PASSWORD="..."
# optional:
export REGISTRY_EMAIL="..."

./k8s/registry/create-registry-credentials.sh
```

## Debug ImagePullBackOff quickly

1. Get the real error from Kubernetes:

```bash
kubectl -n ecom describe pod <pod-name>
```

2. Common causes:

- `unauthorized: authentication required`
  - `registry-credentials` is missing, wrong, or not referenced.
- `manifest unknown`
  - the tag doesn’t exist in the registry (push step/tag mismatch).
- `x509: certificate signed by unknown authority`
  - your Kubernetes nodes/container runtime don’t trust the registry’s TLS certificate.

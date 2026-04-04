#!/usr/bin/env node

import { execFileSync } from "node:child_process";

import { OnePasswordConnect } from "@1password/connect";

function trim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseList(value) {
  return trim(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getRequiredEnv(name) {
  const value = trim(process.env[name]);
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function main() {
  const serverURL = getRequiredEnv("OP_CONNECT_HOST");
  const token = getRequiredEnv("OP_CONNECT_TOKEN");
  const namespace = trim(process.env.OP_K8S_SECRET_NAMESPACE) || "ecom";
  const secretName = getRequiredEnv("OP_K8S_SECRET_NAME");
  const vaultTitle = trim(process.env.OP_CONNECT_VAULT) || "Ecom";
  const itemTitle = getRequiredEnv("OP_CONNECT_ITEM");
  const keys = parseList(process.env.OP_K8S_SECRET_KEYS);

  if (keys.length === 0) {
    throw new Error("OP_K8S_SECRET_KEYS must contain at least one comma-separated key");
  }

  const client = OnePasswordConnect({ serverURL, token, keepAlive: true, timeout: 15000 });
  const vault = await client.getVault(vaultTitle);
  const item = await client.getItemByTitle(vault.id, itemTitle);

  const fieldMap = new Map();
  for (const field of item.fields ?? []) {
    const label = trim(field.label);
    if (!label || field.value === undefined || field.value === null || field.value === "") continue;
    fieldMap.set(label, String(field.value));
  }

  const createArgs = [
    "create",
    "secret",
    "generic",
    secretName,
    "--namespace",
    namespace,
  ];

  for (const key of keys) {
    const value = fieldMap.get(key);
    if (!value) {
      throw new Error(`1Password item ${itemTitle} is missing required field ${key}`);
    }

    createArgs.push("--from-literal", `${key}=${value}`);
  }

  createArgs.push("--dry-run=client", "-o", "yaml");

  const yaml = execFileSync("kubectl", createArgs, { encoding: "utf8" });
  execFileSync("kubectl", ["apply", "-f", "-"], {
    input: yaml,
    stdio: ["pipe", "inherit", "inherit"],
  });

  console.log(
    `[1password] Synced Kubernetes secret ${namespace}/${secretName} from vault ${vaultTitle} item ${itemTitle}`
  );
}

main().catch((error) => {
  console.error(`[1password] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
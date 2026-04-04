#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { OnePasswordConnect } from "@1password/connect";

const DEFAULT_VAULT = "Ecom";
const DEFAULT_GCP_FILE_PATH = "/tmp/gcp-key.json";
const protectedEnvKeys = new Set(Object.keys(process.env));
const GCP_FIELD_ALIASES = [
  "GOOGLE_APPLICATION_CREDENTIALS_JSON",
  "GOOGLE_SERVICE_ACCOUNT_JSON",
  "GOOGLE_SERVICE_ACCOUNT_KEY",
  "GCP_SERVICE_ACCOUNT_JSON",
  "GCP_SERVICE_ACCOUNT_KEY",
  "GCP_SA_KEY_JSON",
  "GCP_KEY_JSON",
  "key.json",
];
const GCP_FILE_ALIASES = new Set([
  "gcp-key.json",
  "key.json",
  "google-application-credentials.json",
]);

function trim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseList(value) {
  return trim(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseCommand() {
  const args = process.argv.slice(2);
  const separatorIndex = args.indexOf("--");
  const commandArgs = separatorIndex >= 0 ? args.slice(separatorIndex + 1) : args;

  if (commandArgs.length === 0) {
    throw new Error("No command provided. Usage: node scripts/start-with-connect.mjs -- <command> [args...]");
  }

  return commandArgs;
}

function shouldHydrateFromConnect() {
  return Boolean(trim(process.env.OP_CONNECT_HOST) && trim(process.env.OP_CONNECT_TOKEN));
}

function setEnvIfMissing(name, value) {
  const key = trim(name);
  if (!key || value === undefined || value === null || value === "") return false;
  if (protectedEnvKeys.has(key)) return false;
  process.env[key] = String(value);
  return true;
}

function getConfiguredItems() {
  const configured = parseList(process.env.OP_CONNECT_ITEMS);
  return configured.length > 0 ? configured : ["App-Secrets"];
}

function getClient() {
  return OnePasswordConnect({
    serverURL: trim(process.env.OP_CONNECT_HOST),
    token: trim(process.env.OP_CONNECT_TOKEN),
    keepAlive: true,
    timeout: Number.parseInt(process.env.OP_CONNECT_TIMEOUT_MS ?? "15000", 10),
  });
}

async function loadItems(client, vaultTitle, itemTitles) {
  const vault = await client.getVault(vaultTitle);
  const items = [];

  for (const itemTitle of itemTitles) {
    items.push(await client.getItemByTitle(vault.id, itemTitle));
  }

  return items;
}

function applyFields(items) {
  let appliedCount = 0;

  for (const item of items) {
    for (const field of item.fields ?? []) {
      if (setEnvIfMissing(field.label, field.value)) {
        appliedCount += 1;
      }
    }
  }

  return appliedCount;
}

function looksLikeJson(value) {
  const text = trim(value);
  return text.startsWith("{") && text.endsWith("}");
}

async function maybeWriteGcpCredentials(client, vaultTitle, items) {
  if (trim(process.env.OP_CONNECT_ENABLE_GCP_FILE).toLowerCase() !== "true") return;

  const existingPath = trim(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  if (existingPath && existsSync(existingPath)) return;

  let credentialsJson = "";

  if (looksLikeJson(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    credentialsJson = trim(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  }

  if (!credentialsJson) {
    for (const alias of GCP_FIELD_ALIASES) {
      if (looksLikeJson(process.env[alias])) {
        credentialsJson = trim(process.env[alias]);
        break;
      }
    }
  }

  if (!credentialsJson) {
    for (const item of items) {
      for (const field of item.fields ?? []) {
        if (!GCP_FIELD_ALIASES.includes(trim(field.label))) continue;
        if (!looksLikeJson(field.value)) continue;
        credentialsJson = trim(field.value);
        break;
      }

      if (credentialsJson) break;
    }
  }

  if (!credentialsJson) {
    for (const item of items) {
      for (const file of item.files ?? []) {
        const fileName = trim(file.name).toLowerCase();
        if (!GCP_FILE_ALIASES.has(fileName)) continue;

        const itemQuery = trim(item.title) || trim(item.id);
        if (!itemQuery || !file.id) continue;

        credentialsJson = trim(await client.getFileContent(vaultTitle, itemQuery, file.id));
        if (credentialsJson) break;
      }

      if (credentialsJson) break;
    }
  }

  if (!credentialsJson) {
    throw new Error(
      "OP_CONNECT_ENABLE_GCP_FILE=true but no GCP service account JSON field or attachment was found in the configured 1Password items."
    );
  }

  const targetPath = trim(process.env.OP_CONNECT_GCP_FILE_PATH) || DEFAULT_GCP_FILE_PATH;
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, `${credentialsJson}\n`, { encoding: "utf8" });
  process.env.GOOGLE_APPLICATION_CREDENTIALS = targetPath;
}

async function hydrateSecrets() {
  if (!shouldHydrateFromConnect()) {
    console.log("[1password] OP_CONNECT_HOST or OP_CONNECT_TOKEN is not set; skipping Connect hydration.");
    return;
  }

  const vaultTitle = trim(process.env.OP_CONNECT_VAULT) || DEFAULT_VAULT;
  const itemTitles = getConfiguredItems();
  const client = getClient();
  const items = await loadItems(client, vaultTitle, itemTitles);
  const appliedCount = applyFields(items);

  await maybeWriteGcpCredentials(client, vaultTitle, items);

  console.log(
    `[1password] Hydrated ${appliedCount} field(s) from vault ${vaultTitle} item(s): ${itemTitles.join(", ")}`
  );
}

function runCommand(commandArgs) {
  const child = spawn(commandArgs[0], commandArgs.slice(1), {
    stdio: "inherit",
    env: process.env,
  });

  child.on("error", (error) => {
    console.error(`[1password] Failed to start child process: ${error.message}`);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 1);
  });
}

async function main() {
  const commandArgs = parseCommand();
  await hydrateSecrets();
  runCommand(commandArgs);
}

main().catch((error) => {
  console.error(`[1password] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
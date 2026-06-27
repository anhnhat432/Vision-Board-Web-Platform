#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const injectedSecretJson = process.env.GITHUB_SECRET_READINESS_JSON;

const REQUIRED_GATES = [
  {
    gate: "production_smoke",
    label: "Production smoke",
    secrets: ["PROD_SMOKE_EMAIL", "PROD_SMOKE_PASSWORD"],
  },
  {
    gate: "account_delete",
    label: "Account deletion staging",
    secrets: ["ACCOUNT_DELETE_E2E_EMAIL", "ACCOUNT_DELETE_E2E_PASSWORD"],
  },
  {
    gate: "lww_sync",
    label: "LWW sync staging",
    secrets: ["LWW_E2E_EMAIL", "LWW_E2E_PASSWORD"],
  },
];

const OPTIONAL_GATES = [
  {
    gate: "email_verification",
    label: "Email verification staging",
    secrets: ["EMAIL_VERIFICATION_E2E_EMAIL", "EMAIL_VERIFICATION_E2E_PASSWORD"],
    absentMessage: "generated disposable signup path available if staging Firebase allows signup",
  },
];

function readSecretListJson() {
  if (injectedSecretJson) return injectedSecretJson;

  const ghCandidates = process.platform === "win32" ? ["gh", "gh.cmd", "gh.exe"] : ["gh"];
  let result = null;
  let commandNotFound = true;

  for (const candidate of ghCandidates) {
    const nextResult = spawnSync(candidate, ["secret", "list", "--json", "name,updatedAt"], {
      encoding: "utf8",
    });

    if (nextResult.error?.code === "ENOENT") {
      continue;
    }

    commandNotFound = false;
    result = nextResult;
    break;
  }

  if (commandNotFound || !result) {
    throw new Error("Could not find GitHub CLI (`gh`) in PATH. Install GitHub CLI or run from a shell where `gh` is available.");
  }

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    throw new Error(
      [
        "Could not read GitHub secret names with `gh secret list --json name,updatedAt`.",
        "Run `gh auth login` and retry from the repository root.",
        stderr ? `gh stderr: ${stderr}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return result.stdout;
}

function parseSecretNames(rawJson) {
  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    throw new Error(`Could not parse GitHub secret list JSON: ${error instanceof Error ? error.message : error}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error("GitHub secret list JSON must be an array.");
  }

  const names = new Set();
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    if (typeof entry.name === "string" && entry.name.trim()) {
      names.add(entry.name.trim());
    }
  }

  return names;
}

function inspectRequiredGate(gate, names) {
  const missing = gate.secrets.filter((secret) => !names.has(secret));
  return {
    ...gate,
    missing,
    ready: missing.length === 0,
  };
}

function inspectOptionalGate(gate, names) {
  const present = gate.secrets.filter((secret) => names.has(secret));
  const missing = gate.secrets.filter((secret) => !names.has(secret));

  if (present.length === 0) {
    return {
      ...gate,
      status: "optional_absent",
      missing,
      ready: true,
      note: gate.absentMessage,
    };
  }

  if (missing.length === 0) {
    return {
      ...gate,
      status: "fixed_account_ready",
      missing,
      ready: true,
      note: "fixed disposable credentials configured",
    };
  }

  return {
    ...gate,
    status: "partial",
    missing,
    ready: false,
    note: "configure both secrets or remove both to use generated signup",
  };
}

function formatGateResult(result) {
  if (result.ready) {
    const note = result.note ? ` (${result.note})` : "";
    return `PASS ${result.label}: ready${note}`;
  }

  return `FAIL ${result.label}: missing ${result.missing.join(", ")}`;
}

function main() {
  const names = parseSecretNames(readSecretListJson());
  const required = REQUIRED_GATES.map((gate) => inspectRequiredGate(gate, names));
  const optional = OPTIONAL_GATES.map((gate) => inspectOptionalGate(gate, names));
  const results = [...required, ...optional];
  const failures = results.filter((result) => !result.ready);

  console.log("GitHub Actions secret readiness");
  console.log("Only secret names were inspected. Secret values were not read.");
  for (const result of results) {
    console.log(formatGateResult(result));
  }

  if (failures.length > 0) {
    console.log("");
    console.log("Missing required proof secrets:");
    for (const failure of failures) {
      console.log(`- ${failure.label}: ${failure.missing.join(", ")}`);
    }
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 2;
}

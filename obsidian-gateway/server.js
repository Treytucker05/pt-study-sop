"use strict";

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

const HOST = "127.0.0.1";
const PORT = 8787;

const DEFAULT_VAULT = "C:/Users/treyt/OneDrive/Desktop/pt-study-sop/PT School Semester 2";
const VAULT_ROOT = path.resolve(process.env.OBSIDIAN_VAULT || DEFAULT_VAULT);
const AUTH_TOKEN = process.env.OBSIDIAN_TOKEN || "";

const ALLOWLIST = [
  "Inbox/",
  "Daily/",
  "Notes/",
  "Classes/",
  "Labs/",
  "Exams/",
];

app.use(express.json({ limit: "2mb" }));

function logEvent(endpoint, requestedPath, status) {
  const ts = new Date().toISOString();
  const pathLabel = requestedPath ? requestedPath : "-";
  console.log(`[${ts}] ${endpoint} path=${pathLabel} status=${status}`);
}

function requireAuth(req, res, next) {
  if (!AUTH_TOKEN) {
    logEvent(`${req.method} ${req.path}`, "-", 500);
    return res
      .status(500)
      .json({ ok: false, error: "Server misconfigured: OBSIDIAN_TOKEN not set" });
  }

  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/);
  if (!match || match[1] !== AUTH_TOKEN) {
    logEvent(`${req.method} ${req.path}`, "-", 401);
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  return next();
}

function validateRelativePath(input) {
  if (typeof input !== "string") {
    return { ok: false, status: 400, error: "path must be a string" };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, status: 400, error: "path is required" };
  }

  if (trimmed.includes("..")) {
    return { ok: false, status: 400, error: "path must not contain '..'" };
  }

  if (trimmed.startsWith("/") || trimmed.startsWith("\\")) {
    return { ok: false, status: 400, error: "path must be relative" };
  }

  if (/^[A-Za-z]:/.test(trimmed)) {
    return { ok: false, status: 400, error: "drive-letter paths are not allowed" };
  }

  const normalized = trimmed.replace(/\\/g, "/");
  const allowlisted = ALLOWLIST.some((prefix) => normalized.startsWith(prefix));
  if (!allowlisted) {
    return {
      ok: false,
      status: 403,
      error: `path must start with one of: ${ALLOWLIST.join(" ")}`,
    };
  }

  const resolved = path.resolve(VAULT_ROOT, normalized);
  if (resolved === VAULT_ROOT || !resolved.startsWith(VAULT_ROOT + path.sep)) {
    return { ok: false, status: 403, error: "path escapes vault root" };
  }

  return { ok: true, normalized, resolved };
}

app.get("/health", (req, res) => {
  logEvent("GET /health", "-", 200);
  res.json({ ok: true });
});

app.post("/obsidian/append", requireAuth, async (req, res) => {
  const body = req.body || {};
  const content = body.content;

  if (typeof content !== "string") {
    logEvent("POST /obsidian/append", body.path, 400);
    return res.status(400).json({ ok: false, error: "content must be a string" });
  }

  const validation = validateRelativePath(body.path);
  if (!validation.ok) {
    logEvent("POST /obsidian/append", body.path, validation.status);
    return res.status(validation.status).json({ ok: false, error: validation.error });
  }

  try {
    await fs.promises.mkdir(path.dirname(validation.resolved), { recursive: true });
    const appendedBytes = Buffer.byteLength(content, "utf8");
    await fs.promises.appendFile(validation.resolved, content, { encoding: "utf8" });

    logEvent("POST /obsidian/append", validation.normalized, 200);
    return res.json({
      ok: true,
      path: validation.normalized,
      appended_bytes: appendedBytes,
    });
  } catch (err) {
    logEvent("POST /obsidian/append", validation.normalized, 500);
    return res.status(500).json({ ok: false, error: "Failed to append" });
  }
});

app.use((req, res) => {
  logEvent(`${req.method} ${req.path}`, "-", 404);
  res.status(404).json({ ok: false, error: "Not found" });
});

app.use((err, req, res, next) => {
  if (!err) {
    return next();
  }

  let status = err.status || 500;
  let message = "Server error";

  if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Invalid JSON";
  } else if (err.type === "entity.too.large") {
    status = 400;
    message = "Payload too large";
  }

  logEvent(`${req.method} ${req.path}`, "-", status);
  return res.status(status).json({ ok: false, error: message });
});

app.listen(PORT, HOST, () => {
  console.log(`Obsidian gateway listening on http://${HOST}:${PORT}`);
  console.log(`Vault root: ${VAULT_ROOT}`);
});

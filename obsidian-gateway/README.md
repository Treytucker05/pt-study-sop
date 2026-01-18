# Obsidian Gateway (Append-only)

Windows-first, no-Docker gateway that lets Zapier (and Custom GPT Webhooks) append Markdown content into an Obsidian vault via an ngrok HTTPS tunnel.

Flow:
Custom GPT -> Zapier Webhooks POST -> https://treymcp.ngrok.app/obsidian/append -> local server -> append to Markdown file in vault

## Prereqs
- Node.js (LTS recommended)
- ngrok (authenticated with a reserved domain)

## Setup
1) Install dependencies:
   - `npm install`
2) Set your token and vault root:
   - Edit `start_server.bat` and replace the placeholder token.
   - Optional: set `OBSIDIAN_VAULT` if your vault lives elsewhere.
   - `.env.example` is provided for reference. The server does NOT load `.env` by default.
3) Start the server:
   - Run `start_server.bat`
4) Start ngrok:
   - Run `start_ngrok.bat`

## Endpoints
- `GET /health` -> `{ "ok": true }`
- `POST /obsidian/append`
  - JSON body: `{ "path": "Inbox/Capture.md", "content": "\n- item\n" }`
  - Requires header: `Authorization: Bearer <TOKEN>`
  - Appends UTF-8 content to the file (creates directories/files as needed)

## Environment variables
- `OBSIDIAN_VAULT` (default: `C:\Users\treyt\OneDrive\Desktop\pt-study-sop\PT School Semester 2`)
- `OBSIDIAN_TOKEN` (required)

## Path safety and allowlist
- Rejects any path containing `..`
- Blocks absolute paths and drive-letter paths
- Only allows files under these top-level folders:
  - `Inbox/`, `Daily/`, `Notes/`, `Classes/`, `Labs/`, `Exams/`

## Test commands

PowerShell:
```powershell
Invoke-RestMethod -Method Get -Uri http://127.0.0.1:8787/health

$headers = @{ Authorization = "Bearer YOUR_TOKEN"; "Content-Type" = "application/json" }
$body = @{ path = "Inbox/Capture.md"; content = "`n- item`n" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8787/obsidian/append -Headers $headers -Body $body

$body2 = @{ path = "Daily/2026-01-17.md"; content = "`n- study log`n" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8787/obsidian/append -Headers $headers -Body $body2
```

curl:
```bash
curl http://127.0.0.1:8787/health

curl -X POST http://127.0.0.1:8787/obsidian/append \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"path\":\"Inbox/Capture.md\",\"content\":\"\\n- item\\n\"}"

curl -X POST http://127.0.0.1:8787/obsidian/append \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"path\":\"Daily/2026-01-17.md\",\"content\":\"\\n- study log\\n\"}"
```

## Zapier config (Webhooks by Zapier)
- Method: POST
- URL: `https://treymcp.ngrok.app/obsidian/append`
- Headers:
  - `Authorization: Bearer <TOKEN>`
  - `Content-Type: application/json`
- Example JSON body:
  - `{ "path": "Inbox/Capture.md", "content": "\n- new capture\n" }`
  - `{ "path": "Daily/2026-01-17.md", "content": "\n- daily log\n" }`

## Troubleshooting
- ngrok domain already in use:
  - Make sure you are logged in to ngrok and the reserved domain is in your account.
  - Stop other ngrok sessions using the same domain.
- Windows permissions / OneDrive sync conflicts:
  - Run the server with sufficient permissions.
  - Avoid editing the same file simultaneously in Obsidian and via the gateway.
- 401 Unauthorized:
  - Your `Authorization` header or `OBSIDIAN_TOKEN` does not match.
- 403 Forbidden:
  - The path is outside the allowlist or fails path safety rules.

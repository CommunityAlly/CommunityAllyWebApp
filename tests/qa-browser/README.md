# QA browser automation

Playwright script that logs in to https://qa.condoally.com/ and saves screenshots as QA evidence.
It uses the system Microsoft Edge (or Chrome), so no browser download is needed.

## Setup (once per machine)

```
cd tests/qa-browser
npm install
```

## Usage

`QA_SITE_PASSWORD` must be set in the environment. The script never prints it.

```
# Log in and screenshot the page the site lands on
node qa-shot.mjs

# Screenshot specific pages (repeat --path), full page, to a chosen folder
node qa-shot.mjs --path "#!/Home" --path "#!/Calendar" --full-page --out ./shots
```

Options: `--path <hash route>`, `--out <dir>` (defaults to `$PAPERCLIP_RUN_SCRATCH_DIR`), `--headed`, `--full-page`.
Optional env: `QA_SITE_USERNAME` (defaults to the shared QA test account), `QA_SITE_URL`.

Exit code is non-zero on login failure, including when the account asks for an MFA code.

Paperclip deletes `$PAPERCLIP_RUN_SCRATCH_DIR` when the run ends, so upload screenshots as attachments
before finishing the heartbeat (or pass `--out` to keep them).

On Windows, run it from PowerShell; the Git Bash tool may not have `node` on PATH.

Do not paste the password into commands, comments, or logs. Only read it from the env var.

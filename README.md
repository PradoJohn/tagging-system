# Spray Tag (tagging-system)

A small React app for generating spray **REI (Restricted Entry Interval)** tags. Enter the REI hours, spray finish time, spray duration, and field number, then click **Generate Tag**. The tag text (REI and re-entry date/time) is copied to the clipboard, and each entry is saved to the **History** view for the current session.

The production site is deployed on **Netlify** (see `netlify.toml`). Pushing to the connected GitHub branch triggers a new deploy, so test locally before pushing.

---

## First-time setup (Windows)

These steps were tested on a Windows work laptop with VS Code. Steps 5–6 cover issues that are common on corporate machines. Skip them if you don't hit those errors.

### 1. Install Node.js

1. Go to [nodejs.org](https://nodejs.org) → **Get Node.js**.
2. Choose the **LTS** version, **Windows**, **x64**, and download the **Windows Installer (.msi)**.
3. Run the installer with the default options. Leave **"Automatically install the necessary tools"** unchecked.
4. **Close all VS Code windows and reopen VS Code** so it picks up the new PATH.
5. Verify in the VS Code terminal (``Ctrl + ` ``):

   ```powershell
   node -v
   npm -v
   ```

> **`node` still not recognized after installing?** Check whether it's installed:
> `Test-Path "C:\Program Files\nodejs\node.exe"`
> If this returns `True`, VS Code is using an old PATH. Close every VS Code window and reopen, or restart the computer. As a temporary fix for the current terminal only:
> `$env:Path += ";C:\Program Files\nodejs;$env:APPDATA\npm"`

### 2. Install Git

1. Download **Git for Windows (64-bit Setup)** from [git-scm.com/downloads/win](https://git-scm.com/downloads/win).
2. Install with the default options, then restart VS Code.
3. Verify the install and set your identity (one time):

   ```powershell
   git --version
   git config --global user.name "Your Name"
   git config --global user.email "you@example.com"
   ```

### 3. Clone the repository

Clone the repo to a local folder such as `C:\` or `C:\dev`. **Do not clone into OneDrive.** `node_modules` contains tens of thousands of files, and OneDrive syncing them slows everything down and causes file-lock errors.

In VS Code: **Ctrl + Shift + P → Git: Clone → Clone from GitHub**, sign in, pick the repository, choose the folder, then **Open**.

Or from the terminal:

```powershell
cd C:\
git clone https://github.com/<owner>/tagging-system.git
cd tagging-system
```

### 4. Allow npm to run in PowerShell

If you see **"npm.ps1 cannot be loaded because running scripts is disabled on this system"**, run this once:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

If company policy blocks that, use `npm.cmd` / `pnpm.cmd` instead of `npm` / `pnpm`, or switch the VS Code terminal to **Command Prompt** (the **˅** next to **+** in the terminal panel).

### 5. Fix certificate errors on the company network

If npm fails with **`UNABLE_TO_GET_ISSUER_CERT_LOCALLY`**, the company network is inspecting HTTPS traffic with its own certificate. Tell Node to trust the Windows certificate store (requires Node 22.15+ / 24+):

```powershell
setx NODE_USE_SYSTEM_CA 1        # permanent, applies to new terminals
$env:NODE_USE_SYSTEM_CA = "1"    # applies to the current terminal
```

If that doesn't fix it, export the company's root certificate from your browser (open `https://registry.npmjs.org` → padlock → certificate → top certificate in the chain → Export as **Base-64 .cer**) and point npm at it:

```powershell
npm config set cafile "C:\certs\corp-root.cer"
```

> ⚠️ Do **not** use `npm config set strict-ssl false`. It disables certificate checking entirely.

### 6. Install pnpm

This project uses **pnpm** (it has a `pnpm-lock.yaml`). Install it globally and allow its setup scripts to run:

```powershell
npm install -g --allow-scripts=pnpm pnpm
pnpm -v
```

### 7. Install project dependencies

From the project folder:

```powershell
pnpm install
```

You may see a warning about **ignored build scripts** for some packages. That is safe to ignore for this project.

### 8. Run the app

```powershell
pnpm start
```

The app opens at **http://localhost:3000**. Press **Ctrl + C** in the terminal to stop it.

---

## Day-to-day use

After the first-time setup, you only need to:

```powershell
cd C:\tagging-system   # or wherever you cloned it
pnpm start
```

Rerun `pnpm install` only when dependencies change, for example after a `git pull` that modified `package.json`, or if you get a "module not found" error.

## Project structure

```
tagging-system/
├── public/
│   └── index.html        # HTML template
├── src/
│   ├── index.js          # Entry point
│   ├── App.js            # Main view; toggles between tag generator and history
│   ├── TimeDisplay.js    # Tag generator form and clipboard copy
│   ├── History.js        # Session history table
│   ├── index.css         # Global styles
│   └── style.css         # App styles
├── netlify.toml          # Netlify deploy config
├── package.json
└── pnpm-lock.yaml
```

## Available scripts

| Command        | What it does                                 |
| -------------- | -------------------------------------------- |
| `pnpm start`   | Runs the app locally at `localhost:3000`     |
| `pnpm build`   | Creates a production build in `build/`       |
| `pnpm test`    | Runs tests                                   |

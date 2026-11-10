# X13 Volunteer Compute Pilot v0.1

Status: opt-in local compute demo, **not** a connected volunteer computing network.

- [Browser page](./index.html): click Start after consenting. Runs a bounded arithmetic Web Worker, shows progress, stops with Stop or closing the tab.
- [PC test script](./downloads/x13_pc_worker.py): Python 3.10+ for Windows/Linux, explicit YES prompt, approximate 2/5/10% one-thread duty cycle, max 1–60 minutes, Ctrl+C stop.
- **Android APK:** not built or published. Native app will require explicit opt-in, visible ongoing status, thermal/battery controls and pause/revoke.

## Changes and updates

This folder is part of the `shanxservices-site` GitHub repository. The homepage links to `/compute/`, so future tested releases can update the files without changing that address. Preserve releases, version numbers and test results; do not auto-enable workloads.

## Safety and scope

The browser worker and PC script run local deterministic arithmetic only. No server contact, files, personal data, mining, persistence, hidden operation or remote commands. This pilot does **not** send work to X13.

Percent selections estimate the duty cycle of a **single worker**, not measured total device CPU. Browsers may throttle/suspend background pages. Incognito is user-selected; this code does not open or hide incognito windows.

Before real volunteer computing: add an authenticated HTTPS coordinator, limited allowlisted task types, sandboxing, job/result verification, signed updates, per-user revocation and clear usage/privacy disclosures.

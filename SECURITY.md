# Security policy

## Supported platform

Arcadium v0.6.1 is validated and distributed for Windows x64. Linux and macOS builds are not part of
the supported release surface yet.

## Reporting a vulnerability

Do not disclose credentials, local paths or proof-of-concept data in a public issue. Report security
problems privately to the repository owner through GitHub before opening a public discussion.

## Current controls

- Native commands validate paths, extensions, argument size and control characters.
- Emulator processes are created directly, without a command shell.
- Remote metadata uses HTTPS, response size limits, timeouts and provider host validation.
- API credentials stay in the Rust process and local `.env`, which is ignored by Git.
- The webview uses a restrictive CSP and explicit Tauri capabilities.
- GitHub Actions are pinned to immutable commit SHAs.
- npm and Cargo dependency audits are performed before releases.
- Dependabot monitors npm, Cargo and GitHub Actions weekly.

## Temporary RustSec exception

`RUSTSEC-2026-0194` and `RUSTSEC-2026-0195` affect `quick-xml 0.39.4`, currently pulled only through
`wayland-scanner 0.31.10` for Linux/Wayland build tooling. This code is not compiled into or executed
by the supported Windows x64 application. The upstream crate currently requires `quick-xml 0.39`, so
there is no compatible fixed release to select. The exception must be removed as soon as
`wayland-scanner` accepts `quick-xml >=0.41`.

The remaining RustSec maintenance warnings are inherited from Tauri's unsupported Linux GTK3 build
graph and are not present in the Windows target used for this release.

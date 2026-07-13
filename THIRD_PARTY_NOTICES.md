# Third-Party Notices

This document summarizes third-party software and data sources relevant to L2TV.

## Distributed Electron Application

The Windows Electron build of L2TV includes Electron and its bundled runtime components.

### Electron

- Package: `electron`
- Version used by this repository: `41.3.0`
- License: MIT
- Website: https://www.electronjs.org/
- Source: https://github.com/electron/electron

The distributed archive includes:

- `LICENSE.electron.txt`

### Chromium, Node.js, and Bundled Runtime Components

Electron includes Chromium, Node.js, and other third-party components. Their notices are bundled in the distributed archive as:

- `LICENSES.chromium.html`

Do not remove this file from distributed builds.

## Build-Time Tools

These packages are used to build L2TV from source. They are not part of L2TV's own source license.

### electron-builder

- Package: `electron-builder`
- Version used by this repository: `26.8.1`
- License: MIT
- Source: https://github.com/electron-userland/electron-builder

### 7zip-bin

- Package: `7zip-bin`
- Version used by this repository: `5.2.0`
- License: MIT for the npm package

L2TV uses this package to create release archives. The 7-Zip executable itself is not distributed inside the L2TV application folder.

### @electron/fuses

- Package: `@electron/fuses`
- Version used by this repository: `1.8.0`
- License: MIT
- Source: https://github.com/electron/fuses

L2TV uses this build-time package to disable unnecessary Electron runtime entry points in the packaged executable.

## Data Sources and External Services

L2TV can read or refer to public BMS-related data sources, including difficulty tables and IR services. These are not owned by L2TV.

- Lunatic Rave 2 / OpenLR2 local database files
- Public BMS difficulty tables selected by the user
- LR2IR Archive data used when preparing FORCE RATE constants
- Stellaverse IR player information, when enabled by the user

Rights to BMS charts, songs, difficulty tables, IR services, and related data belong to their respective creators and operators.

L2TV is not an official application of Lunatic Rave 2, OpenLR2, BMS-IR, Stellaverse IR, or any difficulty table operator.

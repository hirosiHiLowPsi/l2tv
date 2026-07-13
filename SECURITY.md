# Security Policy

## Supported version

Security fixes are applied to the latest L2TV release only.

## Reporting a vulnerability

Please use GitHub Private vulnerability reporting for issues that could expose local files, LR2/OpenLR2 databases, player information, or execute unintended operations. Do not include database files, access tokens, personal IDs, or exploit details in a public issue.

Include the L2TV version, Windows version, reproduction steps, and the smallest non-sensitive sample needed to reproduce the issue. The maintainer will confirm receipt and coordinate disclosure after a fix is available.

## Data and network boundaries

- Local LR2/OpenLR2 databases are opened read-only.
- Stellaverse IR access is disabled by default.
- When enabled, L2TV sends the selected player ID to `https://ir.stellabms.xyz/` to retrieve public profile, rank, and score information.
- Database files, local database paths, and the complete local score database are not uploaded to Stellaverse IR.
- Custom difficulty-table URLs are restricted from accessing loopback, private, link-local, multicast, and reserved network targets.
- Database paths, display settings, and the latest analysis are stored unencrypted in the current Windows user's app-data area and can be removed with the in-app clear-data command.

## Release verification

Official releases are distributed as portable 7z archives. Each build produces a matching `.sha256` file. Verify the archive against that checksum before running the unsigned executable.

Release builds apply Electron security fuses and are checked by launching the completed executable with an isolated temporary profile. RunAsNode, NODE_OPTIONS, CLI inspection, non-ASAR loading, and unsigned embedded ASAR content are disabled.

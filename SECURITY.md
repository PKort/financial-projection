# Security Policy

## Supported versions

This project is under active development. Security fixes are applied to the current default branch. Older commits, forks and deployments are not maintained by this repository.

## Reporting a vulnerability

Do not disclose vulnerabilities, credentials or personal financial data in a public issue.

Use GitHub's private security-advisory reporting feature when it is enabled for the repository. If private reporting is unavailable, contact the repository owner through a private channel listed on their GitHub profile.

Include the affected component and commit, reproduction steps, potential impact and suggested remediation if known. Allow maintainers reasonable time to investigate and release a correction before public disclosure.

## Deployment responsibilities

Operators should:

- replace all example and seeded passwords;
- keep application and container dependencies updated;
- expose the application only through HTTPS;
- restrict database and backend ports;
- configure a trusted CORS origin;
- protect and regularly test database backups;
- treat browser tokens and financial records as sensitive data.

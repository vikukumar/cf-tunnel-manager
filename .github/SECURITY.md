# Security Policy

## Supported Versions

The following versions of Cloudflare Tunnel UI are currently supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |
| < 1.0   | :x:                |

We recommend always running the latest release.

---

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

We use [GitHub Private Security Advisories](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability) for private, coordinated disclosure.

### Steps to Report

1. Navigate to the **[Security tab](https://github.com/vikukumar/cf-tunnel-manager/security)** of this repository.
2. Click **"Report a vulnerability"**.
3. Fill in the vulnerability details, including:
   - Type of vulnerability (e.g., authentication bypass, injection, SSRF)
   - Affected versions
   - Step-by-step reproduction instructions
   - Potential impact assessment
   - Any suggested fix or mitigation (optional but appreciated)

### What to Expect

| Timeframe | Action |
|-----------|--------|
| **24 hours** | Acknowledgement of your report |
| **72 hours** | Initial assessment and severity classification |
| **14 days** | Patch development begins for critical/high severity |
| **90 days** | Public disclosure (coordinated with reporter) |

We follow responsible disclosure practices. We will keep you informed throughout the process and credit you in the advisory unless you prefer to remain anonymous.

---

## Scope

The following are **in scope** for security reports:

- Authentication bypass or privilege escalation
- Server-side request forgery (SSRF) via the API
- Injection attacks (SQL, command, template)
- Exposed credentials or tokens in logs / API responses
- Cross-site scripting (XSS) in the web UI
- Insecure default configurations
- Container escape or privilege elevation in the Docker image
- Dependency vulnerabilities with direct exploitability

The following are **out of scope**:

- Vulnerabilities in the upstream Cloudflare services or `cloudflared` daemon
- Issues that require physical access to the host
- Social engineering attacks
- DoS/DDoS attacks against a self-hosted instance
- Reports that have no actionable remediation

---

## Security Best Practices

When deploying this application, we recommend:

- Run the container as a non-root user (default: `nonroot`)
- Place the application behind a reverse proxy with TLS termination
- Use Cloudflare Access or another SSO provider to protect the web UI
- Rotate your Cloudflare API token regularly and use the minimum required permissions
- Enable security monitoring/alerting on the host running the container

---

## Acknowledgements

We appreciate security researchers who help improve this project. Confirmed reporters will be credited in the relevant security advisory.

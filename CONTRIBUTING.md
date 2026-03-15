# Contributing to Cloudflare Tunnel UI

Thank you for taking the time to contribute!

---

## Commit Message Convention

This project uses **[Conventional Commits](https://www.conventionalcommits.org/)** to drive fully-automatic semantic versioning.
Every commit that lands on `main` is analysed by [release-please](https://github.com/googleapis/release-please), which:

1. Opens/updates a **"Release PR"** with the next version and a generated changelog.
2. When that PR is merged → creates the git tag → triggers the release workflow (GoReleaser + Docker).

### Format

```
<type>[optional scope][optional !]: <short description>

[optional body]

[optional footer(s)]
```

### Types and their SemVer impact

| Type | Description | Version bump |
|------|-------------|-------------|
| `fix` | A bug fix | **patch** `1.0.0 → 1.0.1` |
| `feat` | A new feature | **minor** `1.0.0 → 1.1.0` |
| `feat!` or `fix!` | Breaking change (append `!` **or** add `BREAKING CHANGE:` footer) | **major** `1.0.0 → 2.0.0` |
| `perf` | Performance improvement | patch |
| `refactor` | Code restructure (no feature/fix) | patch |
| `docs` | Documentation only | patch |
| `chore` | Build/dependency/config changes | no release |
| `ci` | CI workflow changes | no release |
| `test` | Adding/fixing tests | no release |
| `style` | Code style/formatting | no release |

### Examples

```bash
# Patch — 1.0.0 → 1.0.1
git commit -m "fix: prevent route modal from rendering inside table"

# Minor — 1.0.0 → 1.1.0
git commit -m "feat(routes): support Unix socket path in Add Route modal"

# Major — 1.0.0 → 2.0.0  (breaking: use ! suffix)
git commit -m "feat!: rename config env vars to CF_ prefix"

# Major — via footer (alternative style)
git commit -m "feat(auth): replace token with OAuth flow

BREAKING CHANGE: CF_API_TOKEN is no longer supported, use CF_OAUTH_CLIENT_ID/SECRET"

# No version bump
git commit -m "chore: update golangci-lint to v1.58"
git commit -m "ci: speed up docker build with cache-from"
```

### Scopes (optional but helpful)

Common scopes used in this project:

| Scope | Area |
|-------|------|
| `routes` | Application/network route management |
| `tunnel` | Tunnel CRUD and overview |
| `logs` | Live log streaming |
| `auth` | Authentication / Cloudflare Access |
| `api` | Backend API handlers |
| `ui` | Frontend components |
| `docker` | Container image |
| `ci` | Workflows |
| `deps` | Dependency updates |

---

## Development Workflow

```bash
# 1. Fork + clone
git clone https://github.com/vikukumar/cf-tunnel-manager.git
cd cf-tunnel-manager

# 2. Create a feature branch
git checkout -b feat/my-feature

# 3. Build everything
make build

# 4. Run dev servers
make dev          # starts Go server + Vite HMR

# 5. Run tests
make test

# 6. Lint
make lint

# 7. Open a PR targeting main
```

### Branch naming

| Pattern | Use |
|---------|-----|
| `feat/<short-description>` | New feature |
| `fix/<short-description>` | Bug fix |
| `chore/<short-description>` | Maintenance |
| `docs/<short-description>` | Documentation |

---

## Release Process (automated)

You do **not** need to manually bump versions or create tags. The process is:

1. Commit with proper Conventional Commit messages.
2. Push to `main` (directly or via merged PR).
3. The **release-please** workflow creates/updates a release PR.
4. Review and **merge the release PR** — this creates the `vX.Y.Z` tag automatically.
5. The **release** workflow fires: GoReleaser builds binaries, Docker images are pushed to GHCR.

### Version bumping rules recap

```
fix:   → PATCH   1.0.0 → 1.0.1
feat:  → MINOR   1.0.0 → 1.1.0
feat!: → MAJOR   1.0.0 → 2.0.0
```

Multiple commits before a release PR is merged are **accumulated**: the highest-impact type wins (major > minor > patch).

---

## Code Style

- **Go**: follow `gofmt`/`golangci-lint` rules. Run `make lint` before pushing.
- **TypeScript/React**: `pnpm exec tsc --noEmit` must pass. No unused imports.
- **Tailwind**: Use existing design tokens (`text-[#F6821F]`, `rounded-xl`, etc.).

---

## PR Checklist

Before submitting a PR, make sure:

- [ ] `make build` passes
- [ ] `make test` passes  
- [ ] `make lint` passes
- [ ] Commit messages follow Conventional Commits
- [ ] PR description is filled out

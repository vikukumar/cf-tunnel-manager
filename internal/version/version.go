// Package version holds build-time version information injected via -ldflags.
package version

// These variables are set at build time. Default values are used during
// development so the binary always reports something meaningful.
var (
	// Version is the semantic version string, e.g. "v1.2.3".
	Version = "dev"
	// Commit is the short git SHA of the build.
	Commit = "unknown"
	// BuildDate is the UTC timestamp of the build, e.g. "2026-03-15T12:00:00Z".
	BuildDate = "unknown"
	// GoVersion is set automatically at init time from runtime/debug.
	GoVersion = "unknown"
)

// Info returns a human-readable single-line version string.
func Info() string {
	return Version + " (commit=" + Commit + " built=" + BuildDate + " go=" + GoVersion + ")"
}

# Codex Project Rules

## Release Executables

When a Codex-managed project builds a portable Windows executable, place or copy the final `.exe` in the outermost project folder whenever the build system allows it.

For nested app folders, keep any internal build folders needed by the toolchain, but make the user-facing executable available at the workspace root.

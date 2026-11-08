#!/usr/bin/env python3
"""
Generates codebase.md packed representation of all relevant source and config files for AI ingestion.
"""

import os
import sys

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

EXCLUDE_DIRS = {
    ".git",
    "node_modules",
    "dist",
    "target",
    "release",
    ".gradle",
    "build",
    "staging",
    ".idea",
    "captures",
    ".cxx",
    ".externalNativeBuild",
}

EXCLUDE_EXTS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".ico",
    ".icns",
    ".jar",
    ".apk",
    ".exe",
    ".zip",
    ".so",
    ".dll",
    ".bin",
    ".db",
    ".log",
    ".hprof",
    ".keystore",
    ".jks",
    ".lock",
    ".svg",
}

EXCLUDE_FILES = {
    "codebase.md",
    "package-lock.json",
    "Cargo.lock",
    "local.properties",
    "gradlew",
    "gradlew.bat",
}

LANG_MAP = {
    ".rs": "rust",
    ".ts": "typescript",
    ".tsx": "tsx",
    ".js": "javascript",
    ".jsx": "jsx",
    ".json": "json",
    ".toml": "toml",
    ".kts": "kotlin",
    ".kt": "kotlin",
    ".xml": "xml",
    ".css": "css",
    ".html": "html",
    ".ps1": "powershell",
    ".yml": "yaml",
    ".yaml": "yaml",
    ".md": "markdown",
    ".properties": "properties",
    ".pro": "properties",
    ".manifest": "xml",
    ".gitignore": "gitignore",
    ".editorconfig": "ini",
}


def should_skip_path(rel_path: str) -> bool:
    norm = rel_path.replace("\\", "/")
    if "/gen/android/app/src/main/assets" in norm:
        return True
    if "/gen/android/app/src/main/java/com/telecloud/app/generated" in norm:
        return True
    if "/gen/schemas" in norm:
        return True
    if norm.startswith("src-tauri/codebase.md"):
        return True
    return False


def build_tree(paths: list[str]) -> str:
    tree = {}
    for p in paths:
        parts = p.split("/")
        curr = tree
        for part in parts:
            if part not in curr:
                curr[part] = {}
            curr = curr[part]

    lines = []

    def render(node, prefix=""):
        keys = sorted(node.keys())
        for i, k in enumerate(keys):
            is_last = i == len(keys) - 1
            connector = "└── " if is_last else "├── "
            sub_prefix = "    " if is_last else "│   "
            lines.append(f"{prefix}{connector}{k}")
            render(node[k], prefix + sub_prefix)

    render(tree)
    return "\n".join(lines)


def main():
    collected = []
    for root, dirs, files in os.walk(REPO_ROOT):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for f in sorted(files):
            if f in EXCLUDE_FILES:
                continue
            ext = os.path.splitext(f)[1].lower()
            if ext in EXCLUDE_EXTS:
                continue
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, REPO_ROOT).replace("\\", "/")
            if should_skip_path(rel_path):
                continue
            collected.append(rel_path)

    collected.sort()

    tree_str = build_tree(collected)
    output_path = os.path.join(REPO_ROOT, "codebase.md")

    with open(output_path, "w", encoding="utf-8") as out:
        out.write("# TeleCloud (Telegram Drive) Codebase\n\n")
        out.write("> **Packed for AI Processing and Analysis**\n")
        out.write(f"> **Total Files:** {len(collected)}\n")
        out.write(
            "> **Architecture:** Tauri v2 + React 18 + TypeScript + Vite + Tailwind CSS + Rust Core + Android Native Transfers\n\n"
        )
        out.write("## Overview\n")
        out.write(
            "TeleCloud is a cloud storage solution backed by the Telegram Bot API & MTProto client. "
            "It features client-side SQLite VFS metadata tracking, chunked upload/download streaming, "
            "AES-GCM encryption, Android foreground service persistence, file previews, and a Windows installer.\n\n"
        )
        out.write("## Directory Structure\n\n")
        out.write("```text\n")
        out.write(tree_str)
        out.write("\n```\n\n---\n\n")

        for rel_path in collected:
            full_path = os.path.join(REPO_ROOT, rel_path)
            ext = os.path.splitext(rel_path)[1].lower()
            lang = LANG_MAP.get(ext, "")
            if not lang and (rel_path.endswith(".env") or ".env." in rel_path):
                lang = "bash"

            try:
                with open(full_path, "r", encoding="utf-8", errors="ignore") as fp:
                    content = fp.read()

                fence = "````" if "```" in content else "```"
                out.write(f"## File: `{rel_path}`\n\n")
                out.write(f"{fence}{lang}\n")
                out.write(content)
                if not content.endswith("\n"):
                    out.write("\n")
                out.write(f"{fence}\n\n")
            except Exception as e:
                out.write(f"## File: `{rel_path}`\n\n")
                out.write(f"> Error reading file: {e}\n\n")

    size_kb = os.path.getsize(output_path) / 1024
    print(f"Generated {output_path}: {len(collected)} files, {size_kb:.2f} KB")


if __name__ == "__main__":
    main()

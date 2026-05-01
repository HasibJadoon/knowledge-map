#!/usr/bin/env python3
from __future__ import annotations

from _common import SOURCE_CONFIGS, ensure_dirs, git_clone_or_update, git_rev, write_json


def main() -> None:
    ensure_dirs()
    manifest = []
    for key in ("qdev", "nqcm"):
        config = SOURCE_CONFIGS[key]
        git_clone_or_update(config)
        manifest.append(
            {
                "key": key,
                "source_id": config.source_id,
                "source_name": config.source_name,
                "repo_url": config.repo_url,
                "branch": config.branch,
                "repo_dir": str(config.repo_dir),
                "git_rev": git_rev(config),
            }
        )
    write_json(SOURCE_CONFIGS["qdev"].repo_dir.parent.parent / "output" / "clone_manifest.json", manifest)
    print("Cloned/updated source repositories:")
    for item in manifest:
        print(f"- {item['source_name']} @ {item['git_rev']}")


if __name__ == "__main__":
    main()

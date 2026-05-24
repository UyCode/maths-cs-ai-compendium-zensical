# Maths, CS & AI Compendium - Zensical

This is a Windows-safe Zensical conversion of
[HenryNdubuaku/maths-cs-ai-compendium](https://github.com/HenryNdubuaku/maths-cs-ai-compendium).

The upstream repository contains chapter directories with `:` in their names,
which cannot be checked out on Windows. This project imports the Git blobs into
`docs/` and rewrites those paths to use ` - ` instead.

## Commands

```powershell
uv sync
uv run zensical serve
uv run zensical build --clean
```

## Regenerate From Upstream Clone

```powershell
node scripts\import-from-git.mjs ..\maths-cs-ai-compendium
uv run zensical build --clean
```

The importer preserves the original Markdown/media files, rewrites internal
links, emits `zensical.toml`, and keeps a converted `mkdocs.yml` for reference.

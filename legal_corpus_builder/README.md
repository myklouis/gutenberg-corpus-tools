# Legal Corpus Builder

This folder contains a downloader for a legal, open/public-domain corpus in:

- theology_religion
- philosophy
- psychology

It uses Project Gutenberg metadata through Gutendex and downloads plain-text files only when the catalog exposes a text format.

## Quick Start

From the workspace root, run:

```powershell
node outputs/legal_corpus_builder/download_open_corpus.mjs --out outputs/legal_corpus --limit 30
```

Or on Windows, double-click:

```text
outputs/legal_corpus_builder/run_download.cmd
```

## Full Matching Set

Use `--limit 0` to fetch all Gutendex matches for the configured search terms:

```powershell
node outputs/legal_corpus_builder/download_open_corpus.mjs --out outputs/legal_corpus --limit 0
```

That can take a while and may collect broad/adjacent works because catalog search is keyword-based.

For a broad run that still finishes sooner, cap each search term to a fixed number of catalog pages:

```powershell
node outputs/legal_corpus_builder/download_open_corpus.mjs --out outputs/legal_corpus --limit 0 --pages 5
```

## Output

The downloader creates:

- `outputs/legal_corpus/theology_religion/`
- `outputs/legal_corpus/philosophy/`
- `outputs/legal_corpus/psychology/`
- `outputs/legal_corpus/metadata.json`
- `outputs/legal_corpus/metadata.csv`
- `outputs/legal_corpus/download_failures.json`
- `outputs/legal_corpus/SUMMARY.md`

## Legal Note

Project Gutenberg texts are public domain or distributed under Project Gutenberg terms. Public domain status can vary by country, so verify jurisdiction-specific redistribution rules before sharing the corpus.

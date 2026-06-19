# Gutenberg Full Library Download

Project Gutenberg publishes official bulk access options. Use these instead of crawling the website.

## Recommended: All Plain Text Books

Project Gutenberg provides a weekly-updated archive of all `.txt` files:

```powershell
powershell -ExecutionPolicy Bypass -File .\gutenberg_full_library\download_all_txt_windows.ps1
```

This downloads:

- `txt-files.tar.zip`: the complete Project Gutenberg plain-text archive
- `pg_catalog.csv.gz`: catalog metadata

By default, files are saved under:

```text
gutenberg_all_txt
```

The archive is about 10 GB compressed. Plan for tens of GB after extraction. The Windows downloader uses `curl.exe` with resume support, so re-running it continues an interrupted archive download instead of starting over.

To download but skip extraction:

```powershell
powershell -ExecutionPolicy Bypass -File .\gutenberg_full_library\download_all_txt_windows.ps1 -SkipExtract
```

To choose another destination:

```powershell
powershell -ExecutionPolicy Bypass -File .\gutenberg_full_library\download_all_txt_windows.ps1 -OutDir D:\gutenberg_all_txt
```

## True Full Mirror: All Formats / All Files

For a full private mirror, Project Gutenberg recommends `rsync`. This is the right route if you want HTML, plain text, zip archives, audio, EPUB, Kindle/generated formats, and updates.

From WSL, Linux, or macOS:

```bash
bash gutenberg_full_library/mirror_gutenberg_rsync.sh /mnt/d/gutenberg-mirror
```

That script mirrors:

- the main collection into `gutenberg`
- generated EPUB/Kindle/etc. content into `gutenberg-generated`

This can be very large. Project Gutenberg notes the mirror collection has millions of files, so use a drive with plenty of space.

## Sources

- Robot access guidance: https://www.gutenberg.org/policy/robot_access.html
- Mirroring guidance: https://www.gutenberg.org/help/mirroring.html
- Offline catalogs and all-text archive: https://www.gutenberg.org/ebooks/offline_catalogs.html

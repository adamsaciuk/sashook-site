# sashook-site

The public site served at https://sashook.co by GitHub Pages.

This repository holds only the published pages. Their source lives in the private
`sashook-web` repository: `node tools/export-static.ts <folder>` exports them, and
the folder's contents are copied here. GitHub Pages hosts plain pages only, so the
booking and trade forms point to a contact page until the site moves to its own host.

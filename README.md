# Stripe Receipt Downloader

Chrome extension to download receipt PDFs from Stripe invoice pages with auto-prefixed filenames.

## Install

```bash
cd icons
./generate-icons.sh
```

Load unpacked extension from `chrome://extensions/`

## Usage

1. Open a Stripe invoice page (`invoice.stripe.com/i/*`)
2. Click the extension icon
3. Click "Download Receipt"

Filename format: `{vendor}-{YYYYMMDD}-{original}.pdf`

- **vendor**: Auto-detected from page content (cursor/openai/stripe)
- **YYYYMMDD**: Invoice issue date (fallback to current date)

## License

MIT

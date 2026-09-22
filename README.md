# okCal

A free calorie and weight tracker. No account, no ads, no subscription, no tracking.

## Principles

- **Your data lives on your phone.** Everything is stored locally. Use Export / Import to back up or move it.
- **No backend.** okCal has no servers of its own, so there is nothing to pay for and nothing to sell.
- **Bring your own key.** AI food logging (photo / text) is optional and uses your own OpenAI API key, stored only on your device and sent only to OpenAI.
- **Free forever.** If you like it and feel like it, you can donate. Nothing is locked behind it.

## Food data

- Bundled offline databases (US and PT)
- Open Food Facts for barcodes and search (no key needed)
- Optional OpenAI for photo / text estimates

## Development

```bash
npm install
npx expo start
```

To show a donate button in Settings, set `DONATION_URL` in `constants/links.ts`.

## License

MIT — see [LICENSE](LICENSE). Contributions welcome.

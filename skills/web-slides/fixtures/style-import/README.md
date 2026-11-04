# Style-import fixtures

Small, generated, license-safe inputs (CC0, made for this repo) used to test the style import scripts:

- `images/`: three 320×200 mood-board PNGs (deep teal night + coral + amber, one paper-light card)
- `svg/`: one each of `background` (wave), `frame` (corner frame), `decorative` (orbit), `icon` (spark)

```bash
cd template
npm run style:images -- ../fixtures/style-import/images --out /tmp/style-test --css /tmp/style-test/brand.css
npm run style:svg -- ../fixtures/style-import/svg --no-copy --out /tmp/style-test --css /tmp/style-test/brand.css
```

Never add third-party screenshots, logos or downloaded assets here.

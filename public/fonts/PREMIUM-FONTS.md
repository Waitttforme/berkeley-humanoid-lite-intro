# Exhibition fonts

- Chinese: use installed PingFang SC when available; otherwise use the bundled Noto Sans SC variable subset. PingFang is not distributed by this repository.
- Latin: bundled Inter variable subset.
- Licenses: `OFL-Noto-Sans-SC.txt` and `OFL-Inter.txt` (SIL Open Font License 1.1).

Upstream source files:

- https://github.com/google/fonts/blob/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf
- https://github.com/google/fonts/blob/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf

The WOFF2 subsets retain variable weight axes and cover current application and report text. To add new Chinese text, rebuild the subset using `scripts/subset-premium-fonts.py` with upstream TTF paths (requires Python fontTools and Brotli), then run `npm run qa:premium`. Unsupported future characters fall back to system fonts.

The browser loads these assets from the site's own base path. There is no runtime dependency on an external font CDN.

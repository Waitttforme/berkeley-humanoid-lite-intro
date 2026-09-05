"""Build licensed variable WOFF2 subsets from upstream Google Fonts TTFs.

Usage: python scripts/subset-premium-fonts.py <NotoSansSC.ttf> <Inter.ttf>
Source font licenses live beside the generated assets in public/fonts.
"""
import pathlib
import sys
from fontTools import subset
from fontTools.ttLib import TTFont

root = pathlib.Path(__file__).resolve().parents[1]
text = ''.join(path.read_text(encoding='utf-8') for path in (root / 'src').rglob('*') if path.suffix in {'.js', '.jsx', '.css'})
# Cover all current UI text, ASCII, Chinese punctuation and currency symbols.
codepoints = set(map(ord, text)) | set(range(32, 127)) | set(range(0x3000, 0x3040)) | set(range(0xff00, 0xff60))
for source, name, points in [(sys.argv[1], 'noto-sans-sc-premium.woff2', codepoints), (sys.argv[2], 'inter-premium.woff2', set(range(32, 256)) | {0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2026, 0x2192})]:
    font = TTFont(source)
    options = subset.Options()
    options.flavor = 'woff2'
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=points)
    subsetter.subset(font)
    font.flavor = 'woff2'
    destination = root / 'public' / 'fonts' / name
    font.save(destination)
    chinese = {c for c in codepoints if 0x4e00 <= c <= 0x9fff}
    if name.startswith('noto'):
        missing = chinese - set(font.getBestCmap())
        if missing:
            raise SystemExit('Missing Chinese glyphs: ' + ''.join(map(chr, sorted(missing))))
    print(name, destination.stat().st_size, 'bytes', len(font.getBestCmap()), 'glyph mappings')

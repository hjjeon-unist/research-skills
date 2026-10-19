#!/usr/bin/env python3
"""Render validated JSON as one offline HTML file (Python standard library)."""
import argparse
import base64
import copy
import html
import json
from pathlib import Path
import re
import sys
from validate_atlas import load_dataset, media_bytes

ASSETS = Path(__file__).resolve().parents[1] / 'assets'


def build(dataset, output):
    dataset, output = Path(dataset), Path(output)
    if dataset.resolve() == output.resolve():
        raise ValueError('output must not overwrite the input dataset')
    if output.suffix.lower() != '.html':
        raise ValueError('output must use the .html extension')
    data = copy.deepcopy(load_dataset(dataset))
    for collection, key in [('papers', 'figure'), ('researchers', 'portrait')]:
        for item in data[collection]:
            if key in item:
                media = item[key]
                raw, mime = media_bytes(media, dataset.parent, item['id'])
                media['src'] = 'data:' + mime + ';base64,' + base64.b64encode(raw).decode('ascii')
                del media['path']
    # Keep JSON inert inside script[type=application/json], including hostile titles.
    payload = json.dumps(data, ensure_ascii=True).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
    values = {'TITLE': html.escape(data['title']), 'LANG': html.escape(data['language'], quote=True),
              'CSS': (ASSETS / 'atlas.css').read_text(encoding='utf-8'),
              'JS': (ASSETS / 'atlas.js').read_text(encoding='utf-8') + '\n' + (ASSETS / 'language.js').read_text(encoding='utf-8'), 'DATA': payload}
    template = (ASSETS / 'atlas.html').read_text(encoding='utf-8')
    rendered = re.sub(r'@@(TITLE|LANG|CSS|JS|DATA)@@', lambda match: values[match[1]], template)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(rendered, encoding='utf-8')
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('dataset', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    try:
        result = build(args.dataset, args.output)
    except (ValueError, OSError) as exc:
        print(f'Build failed: {exc}', file=sys.stderr)
        return 1
    print(f'Built {result} ({result.stat().st_size:,} bytes)')
    return 0


if __name__ == '__main__':
    sys.exit(main())

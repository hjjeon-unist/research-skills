#!/usr/bin/env python3
"""Validate atlas v1 data and local assets; does not verify scientific claims."""
import argparse
import datetime as dt
import json
from pathlib import Path, PureWindowsPath
import re
import sys
from urllib.parse import urlsplit

PAPER_TYPES = {'antecedent', 'original', 'extension', 'application', 'replication', 'critique', 'alternative'}
EDGE_TYPES = PAPER_TYPES - {'original'}
PERSON_TYPES = {'coauthor', 'supervision', 'collaboration'}
MAX_IMAGE = 8 * 1024 * 1024
MAX_TOTAL = 32 * 1024 * 1024
MAX_JSON = 8 * 1024 * 1024


def require(condition, where, message):
    if not condition:
        raise ValueError(f'{where}: {message}')


def obj(value, where, required, optional=()):
    require(isinstance(value, dict), where, 'must be an object')
    missing = set(required) - value.keys()
    unknown = value.keys() - set(required) - set(optional)
    require(not missing, where, f'missing fields: {sorted(missing)}')
    require(not unknown, where, f'unknown fields: {sorted(unknown)}')


def string(value, where):
    require(isinstance(value, str) and bool(value.strip()), where, 'must be nonempty text')


def strings(value, where, nonempty=False):
    require(isinstance(value, list), where, 'must be an array')
    require(not nonempty or bool(value), where, 'must not be empty')
    for i, item in enumerate(value):
        string(item, f'{where}[{i}]')


def date(value, where):
    string(value, where)
    require(bool(re.fullmatch(r'\d{4}-\d{2}-\d{2}', value)), where, 'use YYYY-MM-DD')
    try:
        dt.date.fromisoformat(value)
    except ValueError:
        raise ValueError(f'{where}: invalid calendar date') from None


def url(value, where):
    string(value, where)
    require(not re.search(r'[\s\\\x00-\x1f\x7f]', value), where, 'URL contains whitespace or unsafe characters')
    try:
        parsed = urlsplit(value)
        valid = parsed.scheme in {'http', 'https'} and bool(parsed.hostname) and not parsed.username and not parsed.password
        _ = parsed.port
    except ValueError:
        valid = False
    require(valid, where, 'use a public HTTP(S) URL without credentials')


def collection(value, where, nonempty=False):
    require(isinstance(value, list), where, 'must be an array')
    require(not nonempty or bool(value), where, 'must not be empty')
    ids = set()
    for i, item in enumerate(value):
        label = f'{where}[{i}]'
        require(isinstance(item, dict), label, 'must be an object')
        ident = item.get('id')
        require(isinstance(ident, str) and re.fullmatch(r'[a-z][a-z0-9-]*', ident), label, 'invalid id')
        require(ident not in ids, label, f'duplicate id: {ident}')
        ids.add(ident)
    return ids


def refs(value, where, available, nonempty=True):
    strings(value, where, nonempty)
    require(len(value) == len(set(value)), where, 'duplicate references')
    require(set(value) <= available, where, f'unknown references: {sorted(set(value) - available)}')


def evidence(value, where, source_ids):
    obj(value, where, ['text', 'sources'])
    string(value['text'], where + '.text')
    refs(value['sources'], where + '.sources', source_ids)


def evidence_list(value, where, source_ids):
    require(isinstance(value, list), where, 'must be an array')
    for i, item in enumerate(value):
        evidence(item, f'{where}[{i}]', source_ids)


def media_bytes(media, base, where):
    obj(media, where, ['path', 'alt', 'caption', 'source_url', 'credit', 'license', 'reuse_confirmed'])
    for key in ['path', 'alt', 'caption', 'credit', 'license']:
        string(media[key], f'{where}.{key}')
    url(media['source_url'], where + '.source_url')
    require(media['reuse_confirmed'] is True, where, 'reuse must be confirmed before embedding')
    name = media['path']
    relative = Path(name)
    win = PureWindowsPath(name)
    require(not relative.is_absolute() and not win.is_absolute() and not win.drive, where, 'absolute asset path rejected')
    require('..' not in relative.parts and '..' not in win.parts and ':' not in name and '\\' not in name, where, 'use a relative path with forward slashes and no traversal')
    root = Path(base).resolve()
    target = (root / relative).resolve()
    require(target.is_relative_to(root), where, 'asset escapes dataset directory')
    require(target.is_file(), where, 'asset file not found')
    require(target.stat().st_size <= MAX_IMAGE, where, 'asset exceeds 8 MiB')
    raw = target.read_bytes()
    ext = target.suffix.lower()
    mime = None
    if ext == '.png' and raw.startswith(b'\x89PNG\r\n\x1a\n'):
        mime = 'image/png'
    elif ext in {'.jpg', '.jpeg'} and raw.startswith(b'\xff\xd8\xff'):
        mime = 'image/jpeg'
    elif ext == '.gif' and raw[:6] in {b'GIF87a', b'GIF89a'}:
        mime = 'image/gif'
    elif ext == '.webp' and raw[:4] == b'RIFF' and raw[8:12] == b'WEBP':
        mime = 'image/webp'
    require(mime is not None, where, 'expected a PNG, JPEG, GIF, or WebP signature and extension')
    return raw, mime


def validate(data, base):
    obj(data, 'atlas', ['version', 'title', 'summary', 'language', 'as_of', 'scope', 'sources', 'papers', 'researchers', 'edges', 'researcher_edges'], ['demo', 'topic', 'translations'])
    require(type(data['version']) is int and data['version'] == 1, 'version', 'only version 1 is supported')
    for key in ['title', 'summary', 'language']:
        string(data[key], key)
    require(bool(re.fullmatch(r'[a-zA-Z]{2,8}(?:-[a-zA-Z0-9]{1,8})*', data['language'])), 'language', 'invalid language tag')
    if 'demo' in data:
        require(type(data['demo']) is bool, 'demo', 'must be boolean')
    if 'topic' in data:
        string(data['topic'], 'topic')
    if 'translations' in data:
        obj(data['translations'], 'translations', [], ['en', 'ko'])
        for language, catalog in data['translations'].items():
            require(isinstance(catalog, dict), 'translations.' + language, 'must be a text dictionary')
            require(len(catalog) <= 10000, 'translations.' + language, 'too many entries')
            for original, translated in catalog.items():
                string(original, 'translation source')
                string(translated, 'translation value')
                require(original == original.strip(), 'translation source', 'trim surrounding whitespace')
                require(len(original) <= 20000 and len(translated) <= 20000, 'translation', 'text exceeds 20000 characters')
                require(original not in {'__proto__', 'constructor', 'prototype'}, 'translation source', 'reserved key')
    date(data['as_of'], 'as_of')
    scope = data['scope']
    obj(scope, 'scope', ['inclusion', 'exclusions', 'gaps', 'queries'], ['review_type'])
    for key in ['inclusion', 'exclusions', 'gaps', 'queries']:
        strings(scope[key], 'scope.' + key)
    if 'review_type' in scope:
        string(scope['review_type'], 'scope.review_type')
    source_ids = collection(data['sources'], 'sources', True)
    paper_ids = collection(data['papers'], 'papers', True)
    person_ids = collection(data['researchers'], 'researchers')
    for source in data['sources']:
        where = 'source.' + source['id']
        obj(source, where, ['id', 'title', 'url', 'accessed', 'read'], ['locator'])
        string(source['title'], where + '.title')
        url(source['url'], where + '.url')
        date(source['accessed'], where + '.accessed')
        require(source['read'] in ['full-text', 'abstract', 'metadata', 'profile'], where, 'invalid read level')
        if 'locator' in source:
            string(source['locator'], where + '.locator')
    total = 0
    for paper in data['papers']:
        where = 'paper.' + paper['id']
        obj(paper, where, ['id', 'title', 'year', 'venue', 'authors', 'category', 'core', 'url', 'question', 'contribution', 'mechanism', 'findings', 'limitations', 'sources', 'researcher_ids', 'team_context'], ['figure'])
        for key in ['title', 'venue', 'question', 'contribution']:
            string(paper[key], where + '.' + key)
        require(type(paper['year']) is int and 1000 <= paper['year'] <= 3000, where, 'invalid year')
        require(paper['category'] in sorted(PAPER_TYPES), where, 'invalid category')
        require(type(paper['core']) is bool, where, 'core must be boolean')
        strings(paper['authors'], where + '.authors', True)
        url(paper['url'], where + '.url')
        refs(paper['sources'], where + '.sources', source_ids)
        refs(paper['researcher_ids'], where + '.researcher_ids', person_ids, False)
        mechanism = paper['mechanism']
        obj(mechanism, where + '.mechanism', ['input', 'output', 'objective'], ['architecture', 'loss'])
        for key, value in mechanism.items():
            string(value, where + '.mechanism.' + key)
        for key in ['findings', 'limitations']:
            evidence_list(paper[key], where + '.' + key, source_ids)
        context = paper['team_context']
        obj(context, where + '.team_context', [], ['before', 'current', 'after'])
        for key, value in context.items():
            evidence(value, where + '.team_context.' + key, source_ids)
        if 'figure' in paper:
            total += len(media_bytes(paper['figure'], base, where + '.figure')[0])
    for person in data['researchers']:
        where = 'researcher.' + person['id']
        obj(person, where, ['id', 'name', 'context', 'affiliation_at_study', 'roles', 'sources'], ['portrait'])
        for key in ['name', 'context', 'affiliation_at_study']:
            string(person[key], where + '.' + key)
        refs(person['sources'], where + '.sources', source_ids)
        evidence_list(person['roles'], where + '.roles', source_ids)
        if 'portrait' in person:
            total += len(media_bytes(person['portrait'], base, where + '.portrait')[0])
    require(total <= MAX_TOTAL, 'media', 'total embedded assets exceed 32 MiB')
    for key, ids, types in [('edges', paper_ids, EDGE_TYPES), ('researcher_edges', person_ids, PERSON_TYPES)]:
        collection(data[key], key)
        for edge in data[key]:
            where = key + '.' + edge['id']
            obj(edge, where, ['id', 'from', 'to', 'type', 'explanation', 'confidence', 'sources'])
            for end in ['from', 'to']:
                string(edge[end], where + '.' + end)
                require(edge[end] in ids, where, 'unknown endpoint: ' + edge[end])
            require(edge['from'] != edge['to'], where, 'self-edge rejected')
            require(edge['type'] in sorted(types), where, 'invalid relationship type')
            require(edge['confidence'] in ['documented', 'inferred'], where, 'invalid confidence')
            if key == 'researcher_edges':
                require(edge['confidence'] == 'documented', where, 'personal relationships require documentation')
            string(edge['explanation'], where + '.explanation')
            refs(edge['sources'], where + '.sources', source_ids)
    return data


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, 'JSON', f'duplicate key: {key}')
        result[key] = value
    return result


def load_dataset(filename):
    source = Path(filename)
    require(source.stat().st_size <= MAX_JSON, 'JSON', 'dataset exceeds 8 MiB')
    data = json.loads(source.read_text(encoding='utf-8-sig'), object_pairs_hook=unique_object)
    return validate(data, source.parent)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('dataset', type=Path)
    args = parser.parse_args()
    try:
        data = load_dataset(args.dataset)
    except (ValueError, OSError) as exc:
        print(f'Invalid atlas: {exc}', file=sys.stderr)
        return 1
    print(f"Valid atlas: {len(data['papers'])} papers, {len(data['researchers'])} researchers, {len(data['edges'])} paper edges")
    return 0


if __name__ == '__main__':
    sys.exit(main())

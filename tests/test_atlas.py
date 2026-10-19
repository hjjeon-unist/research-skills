"""Meaningful validation/build invariants. All test inputs are synthetic."""
import base64
import copy
import json
from pathlib import Path
import re
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / 'build-research-atlas'
sys.path.insert(0, str(SKILL / 'scripts'))
from build_atlas import build
from validate_atlas import load_dataset, validate

PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=')


class AtlasTests(unittest.TestCase):
    def setUp(self):
        self.data = load_dataset(SKILL / 'examples/demo.json')
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def write(self, data=None):
        path = self.root / 'data.json'
        path.write_text(json.dumps(data or self.data, ensure_ascii=False), encoding='utf-8')
        return path

    def media(self, path='pixel.png'):
        return {'path':path,'alt':'Synthetic pixel','caption':'Synthetic test image',
                'source_url':'https://example.org/test','credit':'Synthetic fixture',
                'license':'MIT','reuse_confirmed':True}

    def test_demo_build_roundtrip_and_offline(self):
        result = build(self.write(), self.root/'atlas.html').read_text(encoding='utf8')
        payload = re.search(r'<script type="application/json" id="atlas-data">(.*?)</script>', result, re.S)[1]
        self.assertEqual(json.loads(payload), self.data)
        self.assertNotRegex(result, r'<(?:script|link)[^>]+(?:src|href)="https?://')
        self.assertNotIn('@@DATA@@', result)

    def test_hostile_text_cannot_break_out_of_data_script(self):
        self.data['title'] = '</script><script>globalThis.bad=true</script> 한글 & "quotes"'
        self.data['papers'][0]['question'] = '@@JS@@'
        result = build(self.write(), self.root/'atlas.html').read_text(encoding='utf8')
        self.assertNotIn('<script>globalThis.bad=true</script>', result)
        payload = re.search(r'id="atlas-data">(.*?)</script>',result,re.S)[1]
        self.assertEqual(json.loads(payload)['title'],self.data['title'])
        self.assertEqual(json.loads(payload)['papers'][0]['question'],'@@JS@@')

    def test_dangling_and_duplicate_ids(self):
        for change in [lambda d:d['edges'][0].update(to='missing'),
                       lambda d:d['papers'].append(copy.deepcopy(d['papers'][0])),
                       lambda d:d['papers'][0]['findings'][0].update(sources=['missing'])]:
            data=copy.deepcopy(self.data);change(data)
            with self.assertRaises(ValueError): validate(data,self.root)

    def test_unsafe_urls_are_rejected(self):
        for bad in ['javascript:alert(1)','data:text/html,test','https://user:pass@example.org','https:\\evil.test','file:///private','https://example.org/\nunsafe']:
            with self.subTest(url=bad):
                self.data['sources'][0]['url']=bad
                with self.assertRaises(ValueError):validate(self.data,self.root)

    def test_local_media_embeds_without_local_path(self):
        (self.root/'pixel.png').write_bytes(PNG)
        self.data['papers'][0]['figure']=self.media()
        result=build(self.write(),self.root/'atlas.html').read_text(encoding='utf8')
        self.assertIn('data:image/png;base64,',result)
        self.assertNotIn('"path":',result)
        self.assertNotIn(str(self.root),result)

    def test_media_traversal_active_format_and_permission(self):
        (self.root/'active.svg').write_text('<svg onload="alert(1)"></svg>')
        (self.root/'pixel.png').write_bytes(PNG)
        for bad in ['../pixel.png','C:/private/pixel.png','/private/pixel.png','active.svg','https://example.org/pixel.png']:
            with self.subTest(path=bad):
                self.data['papers'][0]['figure']=self.media(bad)
                with self.assertRaises(ValueError):validate(self.data,self.root)
        self.data['papers'][0]['figure']=self.media()
        self.data['papers'][0]['figure']['reuse_confirmed']=False
        with self.assertRaises(ValueError):validate(self.data,self.root)

    def test_unverified_supervision_rejected(self):
        self.data['researcher_edges'][0]['confidence']='inferred'
        with self.assertRaises(ValueError):validate(self.data,self.root)

    def test_malformed_types_unknown_fields_and_dates(self):
        for change in [lambda d:d.update(version=True),lambda d:d.update(papers='invalid'),
                       lambda d:d.update(as_of='2026-02-30'),lambda d:d.update(private_notes='not for publication'),
                       lambda d:d['papers'][0].update(core='yes'),lambda d:d['papers'][0].update(authors=[])]:
            data=copy.deepcopy(self.data);change(data)
            with self.assertRaises(ValueError):validate(data,self.root)

    def test_duplicate_json_keys(self):
        path=self.root/'duplicate.json';path.write_text('{"version":1,"version":2}')
        with self.assertRaisesRegex(ValueError,'duplicate key'):load_dataset(path)

    def test_failed_build_preserves_existing_output(self):
        output=self.root/'existing.html';output.write_text('Existing result')
        self.data['edges'][0]['to']='missing'
        with self.assertRaises(ValueError):build(self.write(),output)
        self.assertEqual(output.read_text(),'Existing result')

    def test_source_cannot_be_overwritten(self):
        path=self.write()
        with self.assertRaises(ValueError):build(path,path)

    def test_empty_optional_collections_are_valid(self):
        self.data['researchers']=[];self.data['researcher_edges']=[];self.data['edges']=[]
        for paper in self.data['papers']:paper['researcher_ids']=[]
        validate(self.data,self.root)


if __name__ == '__main__':
    unittest.main()

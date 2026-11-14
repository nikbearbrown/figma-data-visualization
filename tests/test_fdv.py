import copy, hashlib, importlib.util, json, subprocess, tempfile, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
module=importlib.util.spec_from_file_location('fdv',ROOT/'scripts/fdv.py')
fdv=importlib.util.module_from_spec(module);module.loader.exec_module(fdv)

class IntegrityTests(unittest.TestCase):
 def setUp(self): self.spec=json.loads((ROOT/'examples/program-operations.json').read_text())
 def test_demo_reconciles(self):
  result=fdv.check(self.spec);self.assertTrue(result['ok']);self.assertEqual(result['computed']['on-time']['value'],84)
 def test_pooled_rate_and_missing(self):
  result=fdv.compute({'aggregation':'rate','numerator':'n','denominator':'d'},[{'n':9,'d':10},{'n':1,'d':100},{'n':None,'d':2}])
  self.assertAlmostEqual(result['value'],1000/110);self.assertEqual(result['missing'],1)
 def test_missing_zero_and_zero_denominator(self):
  self.assertIsNone(fdv.compute({'aggregation':'sum','field':'v'},[{'v':None}])['value'])
  self.assertEqual(fdv.compute({'aggregation':'sum','field':'v'},[{'v':0}])['value'],0)
  self.assertIsNone(fdv.compute({'aggregation':'rate','numerator':'n','denominator':'d'},[{'n':0,'d':0}])['value'])
 def test_invalid_numbers_and_overflow(self):
  for value in (True,'5',float('nan'),float('inf'),10**1000):
   with self.subTest(value=str(value)[:20]),self.assertRaises(ValueError):fdv.compute({'aggregation':'sum','field':'v'},[{'v':value}])
  with self.assertRaises(ValueError):fdv.compute({'aggregation':'sum','field':'v'},[{'v':1e308},{'v':1e308}])
 def test_invalid_rate(self):
  for n,d in ((-1,1),(3,2),(True,1)):
   with self.assertRaises(ValueError):fdv.compute({'aggregation':'rate','numerator':'n','denominator':'d'},[{'n':n,'d':d}])
 def test_changes(self):
  self.assertEqual(fdv.changes(84,80,'percent'),{'absolute':4,'relative_percent':5,'absolute_unit':'percentage points'})
  self.assertIsNone(fdv.changes(1,0,'percent')['relative_percent'])
 def test_malformed_nested_values_return_findings(self):
  mutations=[lambda s:s.update(as_of=[]),lambda s:s.update(refreshed_at=42),lambda s:s['metrics'][0].update(id=[]),lambda s:s['metrics'][0].update(numerator={}),lambda s:s['panels'][0].update(question_id={}),lambda s:s['panels'][0].update(metric_id=[]),lambda s:s['panels'][0]['series'][0].update(date=1),lambda s:s['filters'][0].update(scope=[{}]),lambda s:s['theme'].update(font_family=[]),lambda s:s.update(timezone='../unknown')]
  for mutate in mutations:
   s=copy.deepcopy(self.spec);mutate(s)
   with self.subTest(mutation=mutate):self.assertFalse(fdv.check(s)['ok'])
 def test_unsupported_and_duplicate(self):
  for mutate in [lambda s:s['panels'][0].update(chart='pie'),lambda s:s['metrics'][0].update(aggregation='median'),lambda s:s['panels'].append(copy.deepcopy(s['panels'][0]))]:
   s=copy.deepcopy(self.spec);mutate(s);self.assertFalse(fdv.check(s)['ok'])
 def test_time_order_and_zone(self):
  self.assertEqual(fdv.timestamp('2026-11-01'),fdv.timestamp('2026-11-01T00:00:00Z'))
  self.assertEqual(fdv.timestamp('2026-11-01T01:00:00+01:00'),fdv.timestamp('2026-11-01'))
  with self.assertRaises(ValueError):fdv.timestamp('2026-11-01T00:00:00')
  s=self.spec;s['panels'][2]['series'][1]['date']=s['panels'][2]['series'][0]['date'];self.assertFalse(fdv.check(s)['ok'])
 def test_missing_states_and_contrast(self):
  self.spec['states'].remove('denied');self.spec['theme']['text']='#FFFFFF';self.assertFalse(fdv.check(self.spec)['ok'])
 def test_source_documents_and_rule_ids(self):
  manifest=json.loads((ROOT/'references/sources/manifest.json').read_text())
  for source in manifest['sources']:
   content=(ROOT/source['file']).read_bytes();self.assertEqual(len(content),source['bytes']);self.assertEqual(hashlib.sha256(content).hexdigest(),source['sha256'])
  rows=json.loads((ROOT/'references/rules.json').read_text());self.assertEqual(len(rows),242)
  self.assertEqual({r['id'] for r in rows},{f'A{i}' for i in range(1,101)}|{f'R{i}' for i in range(1,143)})
 def test_audit_coverage_and_low_contrast(self):
  data={'receipt':{'pageId':'p','frameIds':['f'],'nodeIds':['p','f','t']},'nodes':[{'id':'p','type':'PAGE'},{'id':'f','type':'FRAME'},{'id':'t','type':'TEXT','fontSize':16,'foreground':'#FFFFFF','background':'#FFFFFF'}]}
  self.assertEqual(fdv.audit(data)['findings'][0]['level'],'failure')
  data['nodes'].pop()
  with self.assertRaises(ValueError):fdv.audit(data)
  with self.assertRaises(ValueError):fdv.audit({'nodes':[{'id':'x','type':'TEXT'}]})
 def test_missing_and_unmeasured(self):
  d={'receipt':{'pageId':'p','frameIds':['f'],'nodeIds':['f','t']},'nodes':[{'id':'f','missing':True},{'id':'t','type':'TEXT'}]}
  r=fdv.audit(d);self.assertEqual(len(r['findings']),1);self.assertEqual(len(r['unmeasured']),1)
 def test_cli_generate_and_no_overwrite(self):
  with tempfile.TemporaryDirectory() as d:
   workspace=Path(d)/'example'
   def run(*args):return subprocess.run([str(ROOT/'fdv'),*map(str,args)],capture_output=True,text=True)
   self.assertEqual(run('init',workspace).returncode,0);self.assertNotEqual(run('init',workspace).returncode,0)
   for cmd in ('figma','handoff'):
    path=workspace/(cmd+'.txt');r=run(cmd,workspace/'dashboard.json','--out',path);self.assertEqual(r.returncode,0,r.stderr)
    before=path.read_bytes();self.assertNotEqual(run(cmd,workspace/'dashboard.json','--out',path).returncode,0);self.assertEqual(path.read_bytes(),before)
   receipt=workspace/'receipt.json';receipt.write_text(json.dumps({'pageId':'p','frameIds':['f'],'nodeIds':['p','f']}))
   self.assertEqual(run('measure',receipt,'--out',workspace/'measure.js').returncode,0)
if __name__=='__main__':unittest.main()

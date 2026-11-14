#!/usr/bin/env python3
"""Local design-spec checks and Figma execution-body generation. No network access."""
import argparse, datetime as dt, json, math, re, sys
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
STATES={'default','loading','empty','no-source-data','error','partial','stale','denied'}
def read(path):return json.loads(Path(path).read_text())
def number(x):
 try:return type(x) in (int,float) and math.isfinite(x)
 except OverflowError:return False
def text(x):return isinstance(x,str) and bool(x.strip())
def timestamp(value):
 if not isinstance(value,str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?',value):raise ValueError('Use YYYY-MM-DD or an offset datetime with seconds')
 if re.fullmatch(r'\d{4}-\d{2}-\d{2}',value):return dt.datetime.fromisoformat(value).replace(tzinfo=dt.timezone.utc).timestamp()
 parsed=dt.datetime.fromisoformat(value.replace('Z','+00:00'))
 if parsed.tzinfo is None:raise ValueError('Datetime needs timezone offset')
 return parsed.timestamp()
def luminance(h):
 c=[int(h[i:i+2],16)/255 for i in (1,3,5)]
 c=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c]
 return sum(v*w for v,w in zip(c,(.2126,.7152,.0722)))
def contrast(a,b):
 a,b=sorted((luminance(a),luminance(b)));return (b+.05)/(a+.05)
def compute(metric,records):
 agg=metric.get('aggregation');missing=0;values=[];n=d=0
 for key in (('numerator','denominator') if agg=='rate' else ('field',) if agg in ('sum','mean') else ()):
  if not text(metric.get(key)):raise ValueError('Metric field references must be non-empty text')
 if agg=='count':return {'value':len(records),'missing':0,'observed':len(records)}
 if agg not in ('sum','mean','rate'):raise ValueError('Unsupported aggregation '+str(agg))
 for row in records:
  if agg=='rate':
   a,b=row.get(metric.get('numerator')),row.get(metric.get('denominator'))
   if a is None or b is None:missing+=1;continue
   if not number(a) or not number(b) or a<0 or b<0 or a>b:raise ValueError('Rates require finite 0 <= numerator <= denominator')
   n+=a;d+=b;values.append(a)
  else:
   a=row.get(metric.get('field'))
   if a is None:missing+=1;continue
   if not number(a):raise ValueError('Metric values must be finite numbers or null')
   values.append(a)
 value=(n/d*100 if d else None) if agg=='rate' else ((sum(values)/(len(values) if agg=='mean' else 1)) if values else None)
 if (value is not None and not number(value)) or not number(n) or not number(d):raise ValueError('Aggregate overflow; rescale source units')
 return {'value':value,'missing':missing,'observed':len(values),**({'numerator':n,'denominator':d} if agg=='rate' else {})}
def changes(value,previous,unit):
 if value is None or previous is None:return {'absolute':None,'relative_percent':None,'absolute_unit':'percentage points' if unit=='percent' else unit}
 return {'absolute':value-previous,'relative_percent':(value-previous)/abs(previous)*100 if previous else None,'absolute_unit':'percentage points' if unit=='percent' else unit}
def check(s):
 findings=[];computed={}
 def add(rule,target,message,level='failure'):findings.append({'rule':rule,'target':target,'level':level,'message':message})
 if not isinstance(s,dict):return {'ok':False,'findings':[{'rule':'A8','target':'spec','level':'failure','message':'Spec must be an object'}],'computed':{}}
 for k in ('title','audience','purpose','type','owner','period','as_of','refreshed_at','timezone','data_kind'):
  if not isinstance(s.get(k),str) or not s[k].strip():add('R1' if k in ('purpose','audience') else 'A74',k,'Required non-empty text')
 if s.get('type') not in ('operational','strategic','analytical','narrative','personal'):add('R4','type','Unknown dashboard type')
 if s.get('data_kind') not in ('synthetic','real'):add('A77','data_kind','Label as synthetic or real')
 for k in ('as_of','refreshed_at'):
  try:
   if not isinstance(s.get(k),str) or dt.datetime.fromisoformat(s[k].replace('Z','+00:00')).tzinfo is None:raise ValueError()
  except (ValueError,TypeError):add('A74',k,'Use an ISO 8601 timestamp with timezone offset')
 try:
  if not text(s.get('timezone')):raise ValueError()
  ZoneInfo(s['timezone'])
 except (ZoneInfoNotFoundError,ValueError):add('A74','timezone','Use a known IANA timezone')
 for k in ('questions','records','metrics','panels','states','filters'):
  if not isinstance(s.get(k),list):add('A8',k,'Required array')
 if any(f['message']=='Required array' for f in findings):return {'ok':False,'findings':findings,'computed':computed}
 if any(not isinstance(x,dict) for k in ('questions','records','metrics','panels','filters') for x in s[k]):
  add('A8','spec','Array entries must be objects');return {'ok':False,'findings':findings,'computed':computed}
 def ids(items,label):
  found=set()
  for x in items:
   k=x.get('id')
   if not isinstance(k,str) or not k or k in found:add('R10',label,'Missing or duplicate id')
   else:found.add(k)
  return found
 qs=ids(s['questions'],'questions');ms=ids(s['metrics'],'metrics');ps=ids(s['panels'],'panels');ids(s['filters'],'filters')
 if not qs or not ms or not ps:add('R3','spec','At least one question, metric and panel required')
 for q in s['questions']:
  if not text(q.get('text')):add('R3',q.get('id'), 'Question text required')
 for m in s['metrics']:
  mid=m.get('id','metric')
  if not text(mid):continue
  for k in ('name','formula','unit','grain','population','exclusions','source','owner','aggregation','definition_version','caveats','direction'):
   if not isinstance(m.get(k),str) or not m[k].strip():add('R9',mid,'Missing metric field: '+k)
  if m.get('direction') not in ('higher','lower','neutral','range'):add('R38',mid,'Direction must be higher, lower, neutral or range')
  if m.get('aggregation')=='rate' and m.get('unit')!='percent':add('A17',mid,'Rate output is percent; use unit percent')
  if m.get('aggregation') in ('sum','mean') and not m.get('field'):add('A8',mid,'A numeric field is required')
  if m.get('aggregation')=='rate' and (not m.get('numerator') or not m.get('denominator')):add('A9',mid,'Numerator and denominator fields required')
  try:computed[mid]=compute(m,s['records'])
  except (ValueError,TypeError,OverflowError) as e:add('A17',mid,str(e))
 for p in s['panels']:
  pid=p.get('id','panel');kind=p.get('chart')
  if not text(p.get('question_id')) or p['question_id'] not in qs:add('R3',pid,'Unknown question_id')
  if not text(p.get('metric_id')) or p['metric_id'] not in ms:add('R9',pid,'Unknown metric_id')
  for k in ('title','rationale','summary','definition'):
   if not isinstance(p.get(k),str) or not p[k].strip():add('R3',pid,'Missing panel '+k)
  if kind not in ('kpi','bar','line','table'):add('R51',pid,'Unsupported starter chart; supported: kpi, bar, line, table')
  series=p.get('series')
  if not isinstance(series,list) or not series or any(not isinstance(v,dict) for v in series):add('R36',pid,'Provide a non-empty series of objects');continue
  for v in series:
   if not isinstance(v.get('label'),str) or not v['label']:add('R91',pid,'Series label required')
   if 'value' not in v or (v['value'] is not None and not number(v['value'])):add('A16',pid,'Series values must be finite numbers or explicit null')
  values=[v['value'] for v in series if number(v.get('value'))]
  if values and not number(max(0,*values)-min(0,*values)):add('A16',pid,'Chart domain overflow; rescale units')
  if kind=='bar' and p.get('axis_min',0)!=0:add('R68',pid,'Magnitude bars must include zero; omit axis_min')
  if kind in ('line','kpi'):
   dates=[]
   for v in series:
    try:dates.append(timestamp(v.get('date')))
    except (ValueError,TypeError,OverflowError):add('R73',pid,'Every time point needs an ISO 8601 date')
   if dates and any(b<=a for a,b in zip(dates,dates[1:])):add('R73',pid,'Dates must increase strictly')
  if kind=='kpi':
   c=p.get('comparison',{})
   if not isinstance(c,dict) or not text(c.get('label')) or ('value' not in c) or (c['value'] is not None and not number(c['value'])):add('R31',pid,'A named, numeric-or-null comparison is required')
  if kind=='kpi' and text(p.get('metric_id')) and p['metric_id'] in computed and isinstance(p.get('comparison'),dict):
   current=computed[p['metric_id']]['value'];previous=p['comparison'].get('value')
   if number(current) and number(previous):
    delta=changes(current,previous,'')
    if any(v is not None and not number(v) for k,v in delta.items() if k!='absolute_unit'):add('A16',pid,'Comparison arithmetic overflow; rescale units')
  if 'target' in p:
   t=p['target']
   if not isinstance(t,dict) or not number(t.get('value')) or t.get('kind') not in ('target','specification','control-limit') or not text(t.get('rationale')):add('A83',pid,'Target requires numeric value, kind and rationale')
 for f in s['filters']:
  if not all(text(f.get(k)) for k in ('id','label','value','combination','reset')):add('A60',f.get('id'),'Filter needs label, value, scope, combination, reset')
  scope=f.get('scope')
  if scope!='all' and (not isinstance(scope,list) or not scope or any(not text(x) or x not in ps for x in scope)):add('A58',f.get('id'),'Unknown filter scope')
  if f.get('combination') not in ('AND','OR'):add('A60',f.get('id'),'Use AND or OR')
 if any(not isinstance(x,str) for x in s['states']) or not STATES.issubset(set(x for x in s['states'] if isinstance(x,str))):add('A76','states','Required states: '+', '.join(sorted(STATES)))
 theme=s.get('theme',{})
 if not isinstance(theme,dict):theme={}
 for k in ('background','surface','text','muted','accent','border','warning'):
  if not re.fullmatch(r'#[0-9a-fA-F]{6}',str(theme.get(k,''))):add('F4','theme','Invalid/missing color '+k)
 for k in ('font_family','font_style'):
  if not text(theme.get(k)):add('F2','theme','Specify '+k)
 if not any(f['target']=='theme' for f in findings):
  for ink in ('text','muted','warning'):
   for bg in ('surface','background'):
    ratio=contrast(theme[ink],theme[bg])
    if ratio<4.5:add('A66','theme',f'{ink}/{bg} contrast {ratio:.2f}:1 below 4.5:1')
  if contrast(theme['accent'],theme['surface'])<3:add('A67','theme','Chart mark/surface contrast below 3:1')
 return {'ok':not any(f['level']=='failure' for f in findings),'scope':'specification checks only; not production certification','findings':findings,'computed':computed}
def validate_receipt(data):
 if not isinstance(data,dict) or not text(data.get('pageId')):raise ValueError('Receipt needs pageId')
 for key in ('frameIds','nodeIds'):
  ids=data.get(key)
  if not isinstance(ids,list) or not ids or any(not text(x) for x in ids) or len(set(ids))!=len(ids):raise ValueError('Receipt needs unique non-empty '+key)
 if not set(data['frameIds']).issubset(data['nodeIds']):raise ValueError('Frames must be included in nodeIds')
def audit(data):
 if not isinstance(data,dict):raise ValueError('Measurements must be an object')
 validate_receipt(data.get('receipt'))
 nodes=data.get('nodes');findings=[];unmeasured=[]
 if not isinstance(nodes,list) or not nodes or any(not isinstance(n,dict) or not text(n.get('id')) for n in nodes):raise ValueError('No valid measurement nodes supplied')
 expected=set(data['receipt']['nodeIds']);actual=[n['id'] for n in nodes]
 if len(set(actual))!=len(actual) or set(actual)!=expected:raise ValueError('Measurement coverage differs from receipt nodeIds')
 for n in nodes:
  if n.get('missing'):
   findings.append({'rule':'F7','id':n['id'],'level':'failure','message':'Recorded node missing'});continue
  if not text(n.get('type')):raise ValueError('Measurement type missing')
  if n.get('outsideParent'):findings.append({'rule':'F9','id':n['id'],'level':'concern','message':'Bounds exceed parent; inspect clipping and intended overflow'})
  if n['type']=='TEXT':
   fg,bg=n.get('foreground'),n.get('background')
   if all(isinstance(c,str) and re.fullmatch(r'#[0-9a-fA-F]{6}',c) for c in (fg,bg)) and number(n.get('fontSize')):
    ratio=contrast(fg,bg);minimum=3 if n['fontSize']>=24 else 4.5
    if ratio<minimum:findings.append({'rule':'A66','id':n['id'],'level':'failure','message':f'Solid text contrast {ratio:.2f}:1 below {minimum}:1'})
   else:unmeasured.append({'id':n['id'],'check':'contrast','reason':n.get('contrastReason','Mixed, non-solid, translucent or unresolved colors')})
  for reason in n.get('unmeasured',[]):unmeasured.append({'id':n['id'],'check':reason})
 return {'findings':findings,'unmeasured':unmeasured,'runtime_accessibility':'not tested','scope':'Receipt coverage and supplied Figma measurements only; receipt authenticity not independently verified'}
def write_new(path,text):
 p=Path(path);p.parent.mkdir(parents=True,exist_ok=True)
 with p.open('x') as f:f.write(text)
def main():
 ap=argparse.ArgumentParser(description=__doc__);sub=ap.add_subparsers(dest='command')
 sub.add_parser('help');a=sub.add_parser('init');a.add_argument('directory')
 a=sub.add_parser('rules');a.add_argument('query',nargs='?',default='')
 for cmd in ('check','figma','handoff','measure','audit'):
  a=sub.add_parser(cmd);a.add_argument('file')
  if cmd in ('figma','handoff','measure'):a.add_argument('--out',required=True)
 args=ap.parse_args()
 if args.command in (None,'help'):ap.print_help();print('\ninit DIR | rules [ID or text] | check SPEC | figma SPEC --out SCRIPT\nmeasure RECEIPT --out SCRIPT | audit MEASUREMENTS | handoff SPEC --out MARKDOWN');return 0
 if args.command=='init':
  p=Path(args.directory);p.mkdir(parents=True,exist_ok=False);write_new(p/'dashboard.json',(ROOT/'examples/program-operations.json').read_text());print(p/'dashboard.json');return 0
 if args.command=='rules':
  rows=read(ROOT/'references/rules.json');q=args.query
  exact=[r for r in rows if r['id'].lower()==q.lower()]
  for r in exact or [r for r in rows if q.lower() in (r['id']+' '+r['text']).lower()]:print(r['id']+': '+r['text']+'\n  '+r['source']+':'+str(r['line']))
  return 0
 data=read(args.file)
 if args.command=='measure':
  validate_receipt(data)
  write_new(args.out,'const receipt = '+json.dumps(data)+';\n'+(ROOT/'figma/measure.js').read_text());print(args.out);return 0
 if args.command=='audit':
  result=audit(data)
  print(json.dumps(result,indent=2));return 1 if any(f['level']=='failure' for f in result['findings']) else 0
 result=check(data)
 if args.command=='check' or not result['ok']:
  print(json.dumps(result,indent=2));return 0 if result['ok'] else 1
 if args.command=='figma':
  payload={**data,'computed':result['computed']}
  write_new(args.out,(ROOT/'figma/render.js').read_text()+'\nreturn await buildDashboard(figma, '+json.dumps(payload,ensure_ascii=False)+');\n');print(args.out)
 if args.command=='handoff':
  text='# Dashboard handoff — DRAFT\n\n'+data['title']+'\n\nAudience: '+data['audience']+'\n\nDecision: '+data['purpose']+'\n\n'
  for p in data['panels']:text+='- '+p['id']+': '+p['title']+' → '+p['question_id']+' / '+p['metric_id']+' ('+p['chart']+')\n'
  text+='\n## Required evidence\n\n- [ ] Actual Figma file/page/node links and write receipt\n- [ ] Component/token mapping and screenshots\n- [ ] Independent source-to-metric reconciliation and panel-series parity\n- [ ] Visible periods, freshness, filters, uncertainty and all states\n- [ ] Real keyboard, screen-reader, touch, zoom/reflow testing\n- [ ] Server permissions, privacy, exports, refresh and race-condition tests\n- [ ] Task-based testing with target users\n- [ ] User decision, exceptions, owner, review date and implementer\n\nSpecification checks passed; production verification remains pending. See rulebook A88–A100 and R119–R142.\n'
  write_new(args.out,text);print(args.out)
 return 0
if __name__=='__main__':
 try:sys.exit(main())
 except (ValueError,KeyError,TypeError,OSError) as e:print('fdv: '+str(e),file=sys.stderr);sys.exit(2)

const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {createFigma}=require('./figma-double');
const root=path.join(__dirname,'..');const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const render=new AsyncFunction('figma','spec',fs.readFileSync(path.join(root,'figma/render.js'),'utf8')+'\nreturn await buildDashboard(figma,spec);');
const measure=new AsyncFunction('figma','receipt',fs.readFileSync(path.join(root,'figma/measure.js'),'utf8'));
function demo(){const s=JSON.parse(fs.readFileSync(path.join(root,'examples/program-operations.json')));s.computed={'on-time':{value:84,observed:4,missing:0,numerator:84,denominator:100}};return s;}
test('creates native nodes, all receipt IDs, bound paints and one page switch',async()=>{
 const f=createFigma(),before=new Set(f.nodes.keys()),r=await render(f,demo());
 assert.equal(r.frameIds.length,8);assert.equal(f.calls.filter(c=>c[0]==='page').length,1);assert.equal(f.calls[0][0],'font');
 assert.deepEqual(new Set(r.nodeIds),new Set([...f.nodes.keys()].filter(id=>!before.has(id))));
 assert.equal(r.variableIds.length,9);assert.equal(r.componentIds.length,1);
 assert.ok([...f.nodes.values()].some(n=>n.type==='INSTANCE'));
 for(const n of f.nodes.values())for(const paint of [...n.fills,...n.strokes])assert.ok(paint.boundVariables.color);
 const rows=await measure(f,r);assert.equal(rows.nodes.length,r.nodeIds.length);assert.equal(rows.nodes.filter(n=>n.missing).length,0);
 assert.ok(rows.nodes.some(n=>n.type==='TEXT'&&n.foreground&&n.background));
});
test('unavailable font makes no mutations',async()=>{const f=createFigma({fonts:false});const size=f.nodes.size;await assert.rejects(()=>render(f,demo()),/Unavailable font/);assert.equal(f.nodes.size,size);});
test('negative, zero and null bars retain shared zero baseline without invented marks',async()=>{
 const s=demo();s.panels=[{...s.panels[1],series:[{label:'loss',value:-20},{label:'gain',value:40},{label:'zero',value:0},{label:'unknown',value:null}]}];
 const f=createFigma(),r=await render(f,s),bars=r.chartEvidence.filter(e=>e.state==='default');
 assert.equal(bars.length,4);assert.ok(bars[0].x<bars[0].zero);assert.ok(bars[1].x>bars[1].zero);assert.equal(bars[2].x,bars[2].zero);assert.equal(bars[3].x,null);
 const marks=[...f.nodes.values()].filter(n=>n.name.startsWith('bar /'));assert.equal(marks.length,6);assert.ok(marks.every(n=>n.width>0&&Number.isFinite(n.width)));
 assert.equal(marks[0].width*2,marks[1].width);
});
test('irregular time spacing proportional and nulls break paths',async()=>{
 const s=demo();s.panels=[{...s.panels[2],series:[{label:'a',date:'2026-01-01',value:2},{label:'b',date:'2026-01-02',value:3},{label:'missing',date:'2026-01-03',value:null},{label:'d',date:'2026-01-05',value:4}]}];
 const f=createFigma(),r=await render(f,s),points=r.chartEvidence.filter(e=>e.state==='default');
 assert.equal(points[2].x-points[0].x,4*(points[1].x-points[0].x));
 assert.equal([...f.nodes.values()].filter(n=>n.name.startsWith('series segment')).length,3); // One per value-bearing state, no bridge across null.
});
test('missing data and denied states never draw plausible zero',async()=>{
 const s=demo();s.panels=[{...s.panels[2],series:[{label:'a',date:'2026-01-01',value:null}]}];
 const f=createFigma(),r=await render(f,s);assert.equal(r.chartEvidence.length,0);
 for(const id of r.frameIds){const n=f.nodes.get(id);if(n.name.startsWith('denied'))assert.equal(n.findOne(x=>/point \/|bar \/|time plot/.test(x.name)),null);}
 assert.ok([...f.nodes.values()].some(n=>n.characters==='No observed trend values — no line drawn'));
});
test('single constant point remains finite and long labels wrap in fixed widths',async()=>{
 const s=demo();s.panels=[{...s.panels[2],title:'A long title '.repeat(100),series:[{label:'long '.repeat(1000),date:'2026-01-01',value:0}]}];
 const f=createFigma(),r=await render(f,s);assert.ok(r.chartEvidence.every(e=>Number.isFinite(e.x)&&e.y===120));
 for(const n of f.nodes.values())if(n.type==='TEXT')assert.equal(n.textAutoResize,'HEIGHT');
 const instance=[...f.nodes.values()].find(n=>n.type==='INSTANCE');assert.equal(instance.primaryAxisSizingMode,'AUTO');assert.ok(instance.height>100);
});
test('measure reports missing IDs, unresolved paints and translucency',async()=>{
 const f=createFigma(),r=await render(f,demo());const missing=r.frameIds[0];f.nodes.delete(missing);
 const text=[...f.nodes.values()].find(n=>n.type==='TEXT');text.fills=[{type:'GRADIENT_LINEAR'}];
 const output=await measure(f,r);assert.equal(output.nodes.find(n=>n.id===missing).missing,true);assert.ok(output.nodes.find(n=>n.id===text.id).contrastReason);
 assert.equal(output.nodes.length,r.nodeIds.length);
});
test('generated CLI body executes and can be measured and audited end to end against contract double',async()=>{
 const os=require('node:os'),cp=require('node:child_process');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fdv-contract-'));
 try{
  cp.execFileSync(path.join(root,'fdv'),['figma',path.join(root,'examples/program-operations.json'),'--out',path.join(dir,'draw.js')]);
  const f=createFigma();const receipt=await new AsyncFunction('figma',fs.readFileSync(path.join(dir,'draw.js'),'utf8'))(f);
  fs.writeFileSync(path.join(dir,'receipt.json'),JSON.stringify(receipt));
  cp.execFileSync(path.join(root,'fdv'),['measure',path.join(dir,'receipt.json'),'--out',path.join(dir,'measure.js')]);
  const result=await new AsyncFunction('figma',fs.readFileSync(path.join(dir,'measure.js'),'utf8'))(f);
  fs.writeFileSync(path.join(dir,'measurements.json'),JSON.stringify(result));
  const audited=JSON.parse(cp.execFileSync(path.join(root,'fdv'),['audit',path.join(dir,'measurements.json')],{encoding:'utf8'}));
  assert.equal(audited.findings.filter(x=>x.level==='failure').length,0);assert.equal(audited.runtime_accessibility,'not tested');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

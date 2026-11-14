/* MCP execution body. CLI appends the validated spec and invocation.
 * Creates one new page; inspect partial writes before any retry. */
async function buildDashboard(figma, spec) {
  const font = {family: spec.theme.font_family, style: spec.theme.font_style};
  const available = await figma.listAvailableFontsAsync();
  if (!available.some(f => f.fontName.family === font.family && f.fontName.style === font.style)) {
    throw new Error(`Unavailable font: ${font.family} ${font.style}; no page created`);
  }
  await figma.loadFontAsync(font);
  const page = figma.createPage();
  page.name = `${spec.title} · ${spec.data_kind} · FDV`;
  await figma.setCurrentPageAsync(page);
  const collection = figma.variables.createVariableCollection(`${spec.title} / dashboard`);
  const variables = {};
  const rgb = hex => ({r:parseInt(hex.slice(1,3),16)/255, g:parseInt(hex.slice(3,5),16)/255, b:parseInt(hex.slice(5,7),16)/255});
  for (const role of ['background','surface','text','muted','accent','border','warning']) {
    const variable = figma.variables.createVariable(role, collection, 'COLOR');
    variable.setValueForMode(collection.defaultModeId, {...rgb(spec.theme[role]),a:1});
    variables[role] = variable;
  }
  for (const [role,value] of [['font-family',font.family],['font-style',font.style]]) {
    const variable = figma.variables.createVariable(role, collection, 'STRING');
    variable.setValueForMode(collection.defaultModeId,value); variables[role]=variable;
  }
  const paint = role => figma.variables.setBoundVariableForPaint({type:'SOLID',color:rgb(spec.theme[role])},'color',variables[role]);
  const fill = (node,role) => {node.fills=[paint(role)];};
  const layout = (node,parent,name,width,role='surface') => {
    parent.appendChild(node); node.name=name;
    node.layoutMode='VERTICAL';node.resize(width,100);
    node.primaryAxisSizingMode='AUTO';node.counterAxisSizingMode='FIXED';
    node.itemSpacing=12;node.paddingTop=20;node.paddingBottom=20;node.paddingLeft=20;node.paddingRight=20;
    node.clipsContent=false;fill(node,role);return node;
  };
  const frame = (parent,name,width,role) => layout(figma.createFrame(),parent,name,width,role);
  const text = (parent,value,width,size=16,role='text',name) => {
    const node=figma.createText(); parent.appendChild(node);
    node.name=name || String(value).slice(0,60);node.fontName=font;node.fontSize=size;
    node.setBoundVariable('fontFamily',variables['font-family']);
    node.setBoundVariable('fontStyle',variables['font-style']);
    node.characters=String(value);node.resize(width,Math.ceil(size*1.5));node.textAutoResize='HEIGHT';
    node.lineHeight={unit:'PERCENT',value:150};fill(node,role);return node;
  };
  const fmt = (value,unit) => value===null ? 'Not available' : `${value}${unit==='percent'?'%':unit?' '+unit:''}`;
  const segment = (parent,x1,y1,x2,y2,name,role='accent') => {
    const n=figma.createVector();parent.appendChild(n);n.name=name;
    const left=Math.min(x1,x2),top=Math.min(y1,y2);
    n.vectorPaths=[{windingRule:'NONE',data:`M ${x1-left} ${y1-top} L ${x2-left} ${y2-top}`}];
    n.x=left;n.y=top;
    n.fills=[];n.strokes=[paint(role)];n.strokeWeight=2;return n;
  };
  const header=layout(figma.createComponent(),page,'FDV / panel heading',680);
  header.x=1280;header.y=0;
  text(header,'Panel title',640,24,'text','title');text(header,'Question and interpretation',640,16,'muted','summary');
  const metricMap=Object.fromEntries(spec.metrics.map(m=>[m.id,m]));
  const frameIds=[];const chartEvidence=[];
  const stateMessages={loading:'Loading — no values available yet',empty:'No matching results — change or reset filters',
    'no-source-data':'Source has no observations for this period',error:'Data could not be loaded — retry required',
    denied:'Access denied — request access from the data owner',partial:'Partial data — values below are an illustrative retained snapshot; coverage needs verification',
    stale:'Stale data — retained snapshot, not current status',default:'Default snapshot'};
  for (const [stateIndex,state] of ['default','loading','empty','no-source-data','error','partial','stale','denied'].entries()) {
    const root=frame(page,`${state} / ${spec.title}`,1120,'background');root.x=stateIndex*1440;root.y=400;
    frameIds.push(root.id);
    text(root,spec.title,1080,32);
    text(root,`${spec.data_kind==='synthetic'?'SYNTHETIC DEMONSTRATION':'SUPPLIED DATA — SOURCE REVIEW REQUIRED'} · ${state}`,1080,16,'warning');
    text(root,`Audience: ${spec.audience}\nDecision: ${spec.purpose}\nPeriod: ${spec.period}\nObserved through: ${spec.as_of}\nRefreshed: ${spec.refreshed_at} · ${spec.timezone}\nOwner: ${spec.owner}`,1080,14,'muted');
    for (const f of spec.filters) text(root,`Filter annotation: ${f.label} = ${f.value} · Scope: ${Array.isArray(f.scope)?f.scope.join(', '):f.scope} · ${f.combination} · Reset: ${f.reset}`,1080,14);
    text(root,stateMessages[state],1080,18,['partial','stale','error','denied'].includes(state)?'warning':'text');
    if (!['default','partial','stale'].includes(state)) continue;
    for (const panel of spec.panels) {
      const metric=metricMap[panel.metric_id];const calculated=spec.computed[metric.id];
      const card=frame(root,`${panel.id} / ${panel.chart}`,1080);
      const instance=header.createInstance();card.appendChild(instance);instance.resize(1040,instance.height);instance.primaryAxisSizingMode='AUTO';
      for (const [name,value] of [['title',panel.title],['summary',panel.summary]]) {
        const n=instance.findOne(n=>n.name===name);n.fontName=font;n.characters=value;
        n.resize(1000,n.height);n.textAutoResize='HEIGHT';
      }
      text(card,`${panel.question_id} · ${panel.definition} · Unit: ${metric.unit}`,1040,14,'muted');
      if (panel.chart==='kpi') {
        text(card,fmt(calculated.value,metric.unit),1040,40);
        const previous=panel.comparison.value;const current=calculated.value;
        const delta=current===null||previous===null?null:current-previous;
        text(card,`${panel.comparison.label}: ${fmt(previous,metric.unit)} · Change: ${delta===null?'undefined':delta+' '+(metric.unit==='percent'?'percentage points':metric.unit)} · Relative change: ${delta===null||previous===0?'undefined':delta/Math.abs(previous)*100+'%'}`,1040,16);
        text(card,`Observed source rows: ${calculated.observed}; missing rows: ${calculated.missing}${'denominator' in calculated?`; pooled components: ${calculated.numerator} / ${calculated.denominator}`:''}`,1040,14,'muted');
      }
      if (panel.target) text(card,`${panel.target.kind}: ${fmt(panel.target.value,metric.unit)} · ${panel.target.rationale}`,1040,14,'warning');
      if (panel.chart==='bar') {
        const values=panel.series.filter(p=>p.value!==null).map(p=>p.value);
        const lo=Math.min(0,...values),hi=Math.max(0,...values);const span=hi-lo||1;
        const x=v=>20+(v-lo)/span*960;const zero=x(0);
        text(card,`Magnitude domain: ${lo} to ${hi} ${metric.unit} · Zero baseline shown`,1040,14,'muted');
        for (const point of panel.series) {
          text(card,`${point.label}: ${fmt(point.value,metric.unit)}`,1040,16);
          const plot=figma.createFrame();card.appendChild(plot);plot.name=`bar plot / ${point.label}`;plot.resize(1000,36);fill(plot,'surface');plot.clipsContent=false;
          segment(plot,zero,0,zero,36,'zero baseline','text');
          if (point.value!==null && point.value!==0) {
            const mark=figma.createRectangle();plot.appendChild(mark);mark.name=`bar / ${point.label}`;
            mark.x=Math.min(zero,x(point.value));mark.y=6;mark.resize(Math.abs(x(point.value)-zero),24);fill(mark,'accent');
          }
          chartEvidence.push({state,panelId:panel.id,kind:'bar',label:point.label,value:point.value,zero,x:point.value===null?null:x(point.value),domain:[lo,hi]});
        }
      }
      if (panel.chart==='line'||panel.chart==='kpi') {
        const points=panel.series;const times=points.map(p=>Date.parse(p.date.length===10?p.date+'T00:00:00Z':p.date));
        const values=points.filter(p=>p.value!==null).map(p=>p.value);
        if (values.length) {
          const lo=Math.min(...values),hi=Math.max(...values);const span=hi-lo||1;
          const x=t=>20+(t-times[0])/(times[times.length-1]-times[0]||1)*960;
          const y=v=>hi===lo?120:220-(v-lo)/span*200;
          text(card,`Time: ${points[0].date} to ${points[points.length-1].date} · Y domain: ${lo} to ${hi} ${metric.unit}${hi===lo?' (constant series)':''} · Nulls break paths`,1040,14,'muted');
          const plot=figma.createFrame();card.appendChild(plot);plot.name=`time plot / ${panel.id}`;plot.resize(1000,240);fill(plot,'surface');plot.clipsContent=false;
          segment(plot,20,220,980,220,'time axis','text');
          let prior=null;
          for (const [i,p] of points.entries()) {
            if (p.value===null) {prior=null;continue;}
            const pos={x:x(times[i]),y:y(p.value)};
            if (prior) segment(plot,prior.x,prior.y,pos.x,pos.y,`series segment / ${i}`);
            const mark=figma.createEllipse();plot.appendChild(mark);mark.name=`point / ${p.date}`;mark.resize(8,8);mark.x=pos.x-4;mark.y=pos.y-4;fill(mark,'accent');
            chartEvidence.push({state,panelId:panel.id,kind:'line',date:p.date,value:p.value,...pos});prior=pos;
          }
        } else text(card,'No observed trend values — no line drawn',1040,16,'warning');
      }
      // Exact text rows also make trend/category values accessible without hover.
      if (panel.chart!=='bar') for (const point of panel.series) text(card,`${point.date?point.date+' · ':''}${point.label}: ${fmt(point.value,metric.unit)}`,1040,16);
      text(card,`Source: ${metric.source}\nFormula: ${metric.formula}\nGrain: ${metric.grain} · Population: ${metric.population}\nExclusions: ${metric.exclusions}\nDefinition: ${metric.definition_version} · Metric owner: ${metric.owner}\nCaveats: ${metric.caveats}`,1040,14,'muted');
    }
  }
  const nodeIds=[];
  const visit=node=>{nodeIds.push(node.id);if ('children' in node) for (const child of node.children) visit(child);};visit(page);
  return {schemaVersion:1,pageId:page.id,nodeIds,frameIds,componentIds:[header.id],variableCollectionId:collection.id,
    variableIds:Object.values(variables).map(v=>v.id),computed:spec.computed,chartEvidence,
    capabilities:{nativeEditable:true,interactiveFilters:false,liveData:false,states:'illustrative static snapshots',liveVerified:false},
    warnings:['Inspect rendered text, clipping and chart bounds in Figma.','Series lineage and runtime accessibility require independent verification.','Creation is not idempotent; inspect partial writes before retrying.']};
}

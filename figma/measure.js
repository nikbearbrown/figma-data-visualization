/* Read-only MCP body. CLI prepends const receipt = <saved write receipt>. */
const page = await figma.getNodeByIdAsync(receipt.pageId);
if (page && page.type === 'PAGE') await figma.setCurrentPageAsync(page);
const hex = color => '#' + ['r','g','b'].map(k=>Math.round(color[k]*255).toString(16).padStart(2,'0')).join('');
const opaqueSolid = async node => {
  if (node.opacity !== undefined && node.opacity !== 1) return null;
  if (!Array.isArray(node.fills)) return null;
  const fills=node.fills.filter(p=>p.visible!==false);
  if (fills.length!==1 || fills[0].type!=='SOLID' || (fills[0].opacity!==undefined && fills[0].opacity!==1)) return null;
  const paint=fills[0];
  // Resolve bound colors in the consumer's actual mode, not a guessed fallback.
  let color=paint.color;
  if (paint.boundVariables && paint.boundVariables.color) {
    try {
      const variable=await figma.variables.getVariableByIdAsync(paint.boundVariables.color.id);
      if (!variable) return null;
      const resolved=variable.resolveForConsumer(node);
      if (resolved.resolvedType!=='COLOR') return null;
      color=resolved.value;
    } catch (_) {return null;}
  }
  if (!color || (color.a!==undefined && color.a!==1) || !['r','g','b'].every(k=>Number.isFinite(color[k])&&color[k]>=0&&color[k]<=1)) return null;
  return hex(color);
};
const overlap=(a,b)=>a&&b&&a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
const contrastContext=async node=>{
  if (node.visible===false) return {reason:'Hidden text'};
  let child=node,parent=node.parent,bg=null;
  while (parent && parent.type!=='DOCUMENT') {
    if ((parent.opacity!==undefined && parent.opacity!==1) || parent.visible===false || (Array.isArray(parent.effects)&&parent.effects.some(e=>e.visible!==false))) return {reason:'Ancestor opacity, visibility or effects need visual review'};
    if ('children' in parent && parent.children.some(other=>other!==child && other.visible!==false && overlap(other.absoluteBoundingBox,node.absoluteBoundingBox))) return {reason:'Overlapping sibling requires compositing review'};
    if (bg===null && 'fills' in parent) {
      const active=Array.isArray(parent.fills)?parent.fills.filter(p=>p.visible!==false):null;
      if (active===null || active.length) {
        bg=await opaqueSolid(parent);
        if (!bg) return {reason:'Non-solid, translucent, mixed or unresolved background needs review'};
      }
    }
    child=parent;parent=parent.parent;
  }
  return bg?{background:bg}:{reason:'No measured opaque background'};
};
const nodes=[];
for (const id of receipt.nodeIds) {
  const node=await figma.getNodeByIdAsync(id);
  if (!node) {nodes.push({id,missing:true});continue;}
  const out={id,type:node.type,name:node.name,unmeasured:[]};
  const bounds=node.absoluteBoundingBox,parentBounds=node.parent && node.parent.absoluteBoundingBox;
  if (bounds) out.bounds={x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height};
  else if (node.type!=='PAGE') out.unmeasured.push('bounds');
  if (bounds&&parentBounds) out.outsideParent=bounds.x<parentBounds.x-0.5||bounds.y<parentBounds.y-0.5||bounds.x+bounds.width>parentBounds.x+parentBounds.width+0.5||bounds.y+bounds.height>parentBounds.y+parentBounds.height+0.5;
  if (node.type==='TEXT') {
    if (typeof node.fontSize==='number') out.fontSize=node.fontSize;
    const context=await contrastContext(node);const fg=await opaqueSolid(node);
    if (fg&&context.background) {out.foreground=fg;out.background=context.background;}
    else out.contrastReason=context.reason||'Foreground mixed, unresolved or non-opaque; provide resolved evidence';
    if (node.hasMissingFont) out.unmeasured.push('missing font');
  }
  nodes.push(out);
}
return {schemaVersion:1,receipt:{pageId:receipt.pageId,frameIds:receipt.frameIds,nodeIds:receipt.nodeIds},nodes,
  scope:'Recorded nodes only; unresolved paints and compositing are unmeasured, never guessed. No runtime accessibility tests.'};

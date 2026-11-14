// A small behavioral contract double, not a Figma rendering emulator.
const assert=require('node:assert/strict');
function createFigma({fonts=true}={}) {
  let counter=0;const nodes=new Map(),variables=new Map(),loaded=new Set();
  const calls=[];let current;
  class Node {
    constructor(type) {this.id=`n${++counter}`;this.type=type;this.name=type;this.children=[];this.fills=[];this.strokes=[];this.opacity=1;this.visible=true;this.x=0;this.y=0;this._width=100;this._height=100;nodes.set(this.id,this);}
    appendChild(n) {assert.notEqual(this.type,'INSTANCE','Cannot add children to an instance');if(n.parent)n.parent.children=n.parent.children.filter(x=>x!==n);n.parent=this;this.children.push(n);}
    resize(w,h) {assert.ok(Number.isFinite(w)&&Number.isFinite(h)&&w>0&&h>0,'Finite positive dimensions');this._width=w;this._height=h;this.primaryAxisSizingMode='FIXED';}
    get width(){return this._width;}
    get height(){
      if(this.type==='TEXT'&&this.textAutoResize==='HEIGHT')return Math.max(1,Math.ceil((this._characters||'').length/(this.width/(this.fontSize*.55))))*this.fontSize*1.5;
      if(this.layoutMode==='VERTICAL'&&this.primaryAxisSizingMode==='AUTO')return (this.paddingTop||0)+(this.paddingBottom||0)+this.children.reduce((n,c)=>n+c.height,0)+Math.max(0,this.children.length-1)*(this.itemSpacing||0);
      return this._height;
    }
    set characters(v){assert.ok(loaded.has(JSON.stringify(this.fontName)),'Font loaded before text changes');this._characters=v;calls.push(['text',this.id]);}
    get characters(){return this._characters;}
    set layoutSizingHorizontal(v){assert.ok(this.parent,'Append before layout sizing');this._layoutSizingHorizontal=v;}
    setBoundVariable(field,v){assert.ok(loaded.size,'Font loaded before variable binding');this.boundVariables={...this.boundVariables,[field]:{type:'VARIABLE_ALIAS',id:v.id}};}
    findOne(predicate){for(const c of this.children){if(predicate(c))return c;const n=c.findOne(predicate);if(n)return n;}return null;}
    createInstance(){assert.equal(this.type,'COMPONENT');const copy=node=>{const n=new Node(node===this?'INSTANCE':node.type);for(const k of Object.keys(node)){if(!['id','type','parent','children'].includes(k))n[k]=structuredClone(node[k]);}for(const c of node.children){const child=copy(c);child.parent=n;n.children.push(child);}return n;};return copy(this);}
    get absoluteBoundingBox(){
      if(['PAGE','DOCUMENT'].includes(this.type))return null;
      const pb=this.parent&&this.parent.absoluteBoundingBox;let x=this.x,y=this.y;
      if(this.parent&&this.parent.layoutMode==='VERTICAL') {x=this.parent.paddingLeft||0;y=(this.parent.paddingTop||0)+this.parent.children.slice(0,this.parent.children.indexOf(this)).reduce((v,n)=>v+n.height+(this.parent.itemSpacing||0),0);}
      return {x:(pb?.x||0)+x,y:(pb?.y||0)+y,width:this.width,height:this.height};
    }
  }
  const document=new Node('DOCUMENT');current=new Node('PAGE');document.appendChild(current);
  const api={nodes,variablesMap:variables,calls,root:document,get currentPage(){return current;},
    async listAvailableFontsAsync(){return fonts?[{fontName:{family:'Inter',style:'Regular'}}]:[];},
    async loadFontAsync(font){loaded.add(JSON.stringify(font));calls.push(['font',font]);},
    async setCurrentPageAsync(page){assert.equal(page.type,'PAGE');current=page;calls.push(['page',page.id]);},
    async getNodeByIdAsync(id){return nodes.get(id)||null;},
    createPage(){const n=new Node('PAGE');document.appendChild(n);return n;},
    variables:{createVariableCollection(name){return {id:`c${++counter}`,name,defaultModeId:'mode:1'};},
      createVariable(name,collection,type){assert.ok(collection.id);const v={id:`v${++counter}`,name,resolvedType:type,setValueForMode(mode,value){assert.equal(mode,'mode:1');this.value=value;},resolveForConsumer(){return {resolvedType:this.resolvedType,value:this.value};}};variables.set(v.id,v);return v;},
      setBoundVariableForPaint(paint,field,variable){return {...paint,boundVariables:{[field]:{type:'VARIABLE_ALIAS',id:variable.id}}};},
      async getVariableByIdAsync(id){return variables.get(id)||null;}}
  };
  for(const [method,type] of Object.entries({createFrame:'FRAME',createComponent:'COMPONENT',createText:'TEXT',createVector:'VECTOR',createEllipse:'ELLIPSE',createRectangle:'RECTANGLE'}))api[method]=()=>{const n=new Node(type);current.appendChild(n);return n;};
  return api;
}
module.exports={createFigma};

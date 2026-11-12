const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../tenant-apps/storefront-web/node_modules/typescript');
const root = path.resolve(__dirname, '../tenant-apps/storefront-web');
const jsxRuntime = require('../tenant-apps/storefront-web/node_modules/react/jsx-runtime');
function loadSection(file, dataModule, dataMethod, liveRow) {
  let calls = 0;
  const source = fs.readFileSync(path.join(root,'sections',file),'utf8');
  const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports = {};
  const requireMock = id => {
    if(id==='react/jsx-runtime') return jsxRuntime;
    if(id==='@/lib/translation-engine') return {translate:s=>s};
    if(id===dataModule)return {[dataMethod]:async()=>{calls++;return [liveRow];}};
    if(id.startsWith('@/components/'))return {default:()=>null};
    throw new Error(`Unexpected import: ${id}`);
  };
  vm.runInNewContext(js,{exports,require:requireMock});
  return {render:exports.default,calls:()=>calls};
}
function cardNames(tree) {
  const names=[];
  const visit=node=>{if(Array.isArray(node)){node.forEach(visit);return;}if(!node||typeof node!=='object')return;if(node.props?.name)names.push(node.props.name);visit(node.props?.children);};
  visit(tree);return names;
}
(async()=>{
  let checked=0;
  for(const cfg of [
    {file:'ProductGrid.tsx',module:'@/services/productService',method:'listProducts',prop:'products',extra:{price:125,currency:'INR'}},
    {file:'CategoryGrid.tsx',module:'@/services/categoryService',method:'listCategories',prop:'categories',extra:{description:'A demo category'}},
  ]) {
    const demo={name:'Industry demo',slug:'industry-demo',...cfg.extra};
    const live={id:'live-id',name:'Real tenant catalog',slug:'real-tenant',...cfg.extra};
    for(const test of [
      {preview:true,demo:[demo],expected:'Industry demo',calls:0},
      {preview:false,demo:[demo],expected:'Real tenant catalog',calls:1},
      {preview:true,demo:[],expected:'Real tenant catalog',calls:1},
    ]) {
      const section=loadSection(cfg.file,cfg.module,cfg.method,live);
      const tree=await section.render({previewCatalog:test.preview,[cfg.prop]:test.demo});
      assert.deepEqual(cardNames(tree),[test.expected]);
      assert.equal(section.calls(),test.calls);checked++;
    }
  }
  console.log(`PASS: ${checked} preview/live-catalog behavior checks`);
})().catch(e=>{console.error(e);process.exitCode=1;});

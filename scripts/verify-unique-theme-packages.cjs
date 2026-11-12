const fs = require('node:fs');
const path = require('node:path');
const AdmZip = require('../backend/node_modules/adm-zip');
require('../backend/node_modules/ts-node').register({project:path.join(__dirname,'../backend/tsconfig.json'),transpileOnly:true});
const {readAndValidateThemeManifest,validateThemeTemplateFiles}=require('../backend/src/modules/themes/theme-manifest.util.ts');
const {validateThemeZipPackage}=require('../backend/src/modules/themes/theme-zip-validator.ts');
const root=path.resolve(__dirname,'..');
const source=path.resolve(root,process.argv[2] || 'exports/industry-theme-zips-v2');
const scratch=path.join(root,'assets/industry-theme-v2/qa-validation');
(async()=>{
  const results=[];
  const designIds=new Set();
  const layoutSignatures=new Set();
  for(const channel of ['web','app']) {
    const dir=path.join(source,channel);
    if(!fs.existsSync(dir))continue;
    for(const file of fs.readdirSync(dir).filter(n=>n.endsWith('.zip'))) {
      const target=path.join(scratch,channel,file.replace(/\.zip$/,''));
      new AdmZip(path.join(dir,file)).extractAllTo(target,true);
      const manifest=await readAndValidateThemeManifest(target);
      await validateThemeTemplateFiles(target,manifest);
      const result=await validateThemeZipPackage(target,manifest,{channel:channel==='web'?'WEB':'MOBILE'});
      const design=manifest.designSystem && typeof manifest.designSystem==='object' ? manifest.designSystem : null;
      if(!design || typeof design.id!=='string')throw new Error(`${file}: missing designSystem.id`);
      if(designIds.has(design.id))throw new Error(`${file}: duplicate design id ${design.id}`);
      designIds.add(design.id);
      const homePath=path.join(target,manifest.templates.home);
      const home=JSON.parse(fs.readFileSync(homePath,'utf8'));
      const signature=home.sections.map(s=>`${s.type}:${s.variant||'default'}`).join('|');
      if(layoutSignatures.has(signature))throw new Error(`${file}: duplicate structural signature`);
      layoutSignatures.add(signature);
      results.push({file:`${channel}/${file}`,designId:design.id,direction:design.direction,signature,...result});
      if(!result.valid)throw new Error(JSON.stringify(results[results.length-1]));
    }
  }
  if(!results.length)throw new Error('No packages to validate');
  if(!process.argv[2] && results.length!==94)throw new Error(`Expected 94 final packages, found ${results.length}`);
  if(designIds.size!==results.length||layoutSignatures.size!==results.length)throw new Error('Every package must have a unique design and structural signature');
  fs.writeFileSync(path.join(source,'backend-validation-report.json'),JSON.stringify({valid:true,checked:results.length,uniqueDesigns:designIds.size,uniqueStructuralSignatures:layoutSignatures.size,results},null,2)+'\n');
  console.log(JSON.stringify({valid:true,checked:results.length,uniqueDesigns:designIds.size,uniqueStructuralSignatures:layoutSignatures.size,warnings:results.reduce((n,r)=>n+r.warnings.length,0)}));
})().catch(e=>{console.error(e);process.exitCode=1;});

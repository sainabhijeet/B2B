// QA contact sheets only; source photos remain unchanged.
const fs=require('node:fs');
const path=require('node:path');
const sharp=require('../backend/node_modules/sharp');
const root=path.resolve(__dirname,'../assets/industry-theme-v2');
const jobs=JSON.parse(fs.readFileSync(path.join(root,'image-prompts.json'),'utf8'));
const escape=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
(async()=>{
 const industries=[...new Set(jobs.map(j=>j.industry))];
 const selected=process.argv[2]?industries.filter((_,i)=>i+1===Number(process.argv[2])):industries;
 const outputs=[];
 for(const industry of selected){
  const group=jobs.filter(j=>j.industry===industry);
  if(group.some(j=>!fs.existsSync(j.file)))continue;
  const layers=[];
  for(let i=0;i<group.length;i++){
   const j=group[i],left=(i%6)*240,top=Math.floor(i/6)*300;
   layers.push({input:await sharp(j.file).resize(228,228,{fit:'contain',background:'#fafafa'}).png().toBuffer(),left:left+6,top:top+6});
   const name=j.product.replace(/^\S+\s/,'');
   const words=name.split(' '),lines=[''];for(const word of words){if((lines[lines.length-1]+' '+word).length>25)lines.push(word);else lines[lines.length-1]+=(lines[lines.length-1]?' ':'')+word;}
   const label=`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="66"><text x="8" y="16" font-size="11" font-family="Arial" fill="#38554a">${j.channel}</text>${lines.slice(0,3).map((line,n)=>`<text x="8" y="${32+n*14}" font-size="12" font-family="Arial" fill="#13231c">${escape(line)}</text>`).join('')}</svg>`;
   layers.push({input:Buffer.from(label),left,top:top+234});
  }
  const file=path.join(root,'qa-contact-sheets',`${String(industries.indexOf(industry)+1).padStart(2,'0')}.jpg`);
  fs.mkdirSync(path.dirname(file),{recursive:true});
  await sharp({create:{width:1440,height:600,channels:3,background:'#ffffff'}}).composite(layers).jpeg({quality:88}).toFile(file);outputs.push({industry,file});
 }
 console.log(JSON.stringify(outputs));
})().catch(e=>{console.error(e);process.exitCode=1;});

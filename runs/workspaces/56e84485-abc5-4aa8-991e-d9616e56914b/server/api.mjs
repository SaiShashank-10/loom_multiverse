import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
export const defaults={organization:'',fullName:'',email:'',depot:'',capacityAlerts:true,hazardAlerts:true,recoveryAlerts:false,dailyDigest:false,capacity:80,exportFormat:'CSV',pollSeconds:30,archive:false};
export function validateRecord(input){
 const r={};
 for(const k of ['depot','category']) {if(typeof input[k]!=='string'||!input[k].trim()||input[k].length>120)throw new Error(k+' is required (120 characters maximum)');r[k]=input[k].trim();}
 for(const k of ['kg','recoveredKg','hazardousKg']){const n=Number(input[k]);if(!Number.isFinite(n)||n<0)throw new Error(k+' must be a non-negative number');r[k]=n;}
 if(r.kg<=0||r.recoveredKg>r.kg||r.hazardousKg>r.kg)throw new Error('Volume must be positive; recovered and hazardous mass cannot exceed volume');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date)||!Number.isFinite(Date.parse(input.date)))throw new Error('Valid date required');
 r.date=input.date;r.status=['Pending','Verified'].includes(input.status)?input.status:'Pending';return r;
}
export function createApi(file=path.resolve('data/ecostream.json')){
 let queue=Promise.resolve();
 const load=async()=>{try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;return {records:[],settings:{...defaults}};}};
 const save=async(data)=>{await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file+'.tmp',JSON.stringify(data,null,2));await fs.rename(file+'.tmp',file);};
 return (req,res,next=()=>{})=>{
 const url=new URL(req.url,'http://localhost');
 if(!url.pathname.startsWith('/api/'))return next();
 const handle=async()=>{
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
  const send=(status,data)=>{res.statusCode=status;res.end(JSON.stringify(data));};
  if(req.method==='GET'&&url.pathname==='/api/health')return send(200,{ok:true,storage:'local JSON'});
  const data=await load();
  if(req.method==='GET'&&url.pathname==='/api/state')return send(200,data);
  if(!['POST','PUT','DELETE'].includes(req.method))return send(404,{error:'Unknown API route'});
  const origin=req.headers.origin;if(origin&&new URL(origin).host!==req.headers.host)return send(403,{error:'Cross-origin writes are not allowed'});
  let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>100000)return send(413,{error:'Request too large'});}
  const input=raw?JSON.parse(raw):{};
  if(req.method==='POST'&&url.pathname==='/api/records')data.records.unshift({...validateRecord(input),id:randomUUID(),createdAt:new Date().toISOString()});
  else if(req.method==='DELETE'&&url.pathname.startsWith('/api/records/')) {const id=url.pathname.split('/').at(-1);if(!data.records.some(r=>r.id===id))return send(404,{error:'Record not found'});data.records=data.records.filter(r=>r.id!==id);}
  else if(req.method==='PUT'&&url.pathname==='/api/settings'){
   const settings={...data.settings};
   for(const [key,value] of Object.entries(defaults)){if(input[key]===undefined)continue;if(typeof input[key]!==typeof value)throw new Error('Invalid setting: '+key);if(typeof value==='string'&&input[key].length>200)throw new Error('Setting too long');settings[key]=input[key];}
   if(settings.capacity<1||settings.capacity>100||settings.pollSeconds<5||settings.pollSeconds>3600||!['CSV','JSON'].includes(settings.exportFormat))throw new Error('Invalid settings range');
   data.settings=settings;
  }else return send(404,{error:'Unknown API route'});
  await save(data);send(200,data);
 };
 queue=queue.then(handle).catch(e=>{if(!res.writableEnded){res.statusCode=e instanceof SyntaxError?400:/required|Invalid|must|cannot|too long|Valid date|Volume/.test(e.message)?400:500;res.end(JSON.stringify({error:res.statusCode===500?'Local storage failed; check server output':e.message}));}if(res.statusCode===500)console.error(e);});
 };
}


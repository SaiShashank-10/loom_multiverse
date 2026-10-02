import {createContext,useContext} from 'react';
export type RecordItem={id:string;date:string;depot:string;category:string;kg:number;recoveredKg:number;hazardousKg:number;status:string};
export const DataContext=createContext<any>(null);
export const useData=()=>useContext(DataContext);
export async function request(url:string,method='GET',body?:unknown){const response=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw new Error(data.error||'Request failed');return data;}
export function download(records:RecordItem[],format='CSV'){
 const quote=(v:unknown)=>{let s=String(v??'');if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 const keys=['id','date','depot','category','kg','recoveredKg','hazardousKg','status'];
 const text=format==='JSON'?JSON.stringify(records,null,2):[keys.join(','),...records.map(r=>keys.map(k=>quote((r as any)[k])).join(','))].join('\n');
 const url=URL.createObjectURL(new Blob([text],{type:format==='JSON'?'application/json':'text/csv'}));const a=document.createElement('a');a.href=url;a.download='ecostream-records.'+format.toLowerCase();a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}


import React,{useEffect,useState} from 'react';
import {BrowserRouter,NavLink,Routes,Route,Navigate} from 'react-router-dom';
import Dashboard from './components/EWasteRealTimeAnalyticsDashboard';
import Settings from './components/EWasteSettingsPreferences';
import Reports from './components/EWasteReportsAuditing';
import {DataContext,request} from './data';
export default function App(){
 const [state,setState]=useState<any>(null),[error,setError]=useState('');
 const reload=async()=>{try{setState(await request('/api/state'));setError('');}catch(e){setError(String(e));}};
 useEffect(()=>{reload();},[]);
 useEffect(()=>{if(!state)return;const timer=setInterval(reload,(state.settings.pollSeconds||30)*1000);return()=>clearInterval(timer);},[state?.settings.pollSeconds]);
 const mutate=async(url:string,method:string,body?:unknown)=>{const data=await request(url,method,body);setState(data);};
 return <BrowserRouter><header className="topbar"><NavLink className="brand" to="/dashboard"><span className="brand-icon">↻</span>EcoStream Live <small>v2.4 Core</small></NavLink><span className="status"><i/> Local workspace</span></header><div className="app-shell"><aside className="sidebar"><p className="eyebrow">OPERATIONS CONSOLE</p><nav><NavLink to="/dashboard">◫　Overview</NavLink><NavLink to="/reports">▤　Reports & Audits</NavLink><NavLink to="/settings">⚙　Settings</NavLink></nav><div className="sidebar-note">LOCAL DATA NODE<br/><strong>Ready for your first stream</strong><p>Records are saved on this computer. External telemetry is not connected.</p></div></aside><main className="workspace">{error?<div role="alert" className="notice error">{error}<button onClick={reload}>Retry connection</button></div>:!state?<p role="status">Connecting to local data node…</p>:<DataContext.Provider value={{...state,mutate,reload}}><Routes><Route path="/" element={<Navigate to="/dashboard" replace/>}/><Route path="/dashboard" element={<Dashboard/>}/><Route path="/reports" element={<Reports/>}/><Route path="/settings" element={<Settings/>}/><Route path="*" element={<Navigate to="/dashboard" replace/>}/></Routes></DataContext.Provider>}</main></div></BrowserRouter>;
}


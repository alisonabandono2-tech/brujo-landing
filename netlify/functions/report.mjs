import {getStore} from '@netlify/blobs';
import {reply,authorized,storeName,runtimeEnv} from './lib/http.mjs';
export function createReport({env=process.env,storeFactory=name=>getStore({name,consistency:'strong'})}={}){return async function(request,context={}){
 if(request.method!=='GET')return reply({error:'method_not_allowed'},405);
 if(!env.TRACKING_REPORT_TOKEN||env.TRACKING_REPORT_TOKEN.length<32)return reply({error:'report_not_configured'},503);
 if(!authorized((request.headers.get('authorization')||'').replace(/^Bearer /,''),env.TRACKING_REPORT_TOKEN))return reply({error:'unauthorized'},401);
 const u=new URL(request.url),from=u.searchParams.get('from')||'2000-01-01',to=u.searchParams.get('to')||'2099-12-31';
 if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||from>to)return reply({error:'invalid_period'},400);
 try{const store=storeFactory(storeName(runtimeEnv(env,context))),groups={},events=[];let count=0;
 for await(const page of store.list({prefix:'events/by-id/',paginate:true})){for(const blob of page.blobs){if(++count>10000)return reply({error:'report_limit_exceeded_export_or_database_required'},422);const e=await store.get(blob.key,{type:'json'});if(!e||e.occurred_at.slice(0,10)<from||e.occurred_at.slice(0,10)>to)continue;events.push(e);const group=groups[e.sub1]??={sub1:e.sub1,registrations:0,first_deposits:0};if(e.type==='Registration')group.registrations++;if(e.type==='FirstDeposit')group.first_deposits++;}}
 return reply({from,to,date_timezone:'UTC',attribution_scope:'channel_campaign',ad_attribution_available:false,groups:Object.values(groups),events});
 }catch{return reply({error:'storage_unavailable'},503)}
}}
export default createReport();

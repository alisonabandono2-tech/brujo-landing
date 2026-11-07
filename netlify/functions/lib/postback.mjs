import {createHash} from 'node:crypto';
import {getStore} from '@netlify/blobs';
import {reply,authorized,validId,storeName,runtimeEnv} from './http.mjs';
export function createPostback(type,{env=process.env,storeFactory=name=>getStore({name,consistency:'strong'}),clock=()=>Date.now()}={}){return async function(request,context={}){
 const runtime=runtimeEnv(env,context);
 if(!['GET','POST'].includes(request.method))return reply({error:'method_not_allowed'},405);
 const url=new URL(request.url);if(!env.ONEWIN_POSTBACK_SECRET||env.ONEWIN_POSTBACK_SECRET.length<32)return reply({error:'postback_not_configured'},503);
 if(!authorized(url.searchParams.get('secret'),env.ONEWIN_POSTBACK_SECRET))return reply({error:'unauthorized'},401);
 let p=url.searchParams;
 if(request.method==='POST'){try{const text=await request.text();if(text.length>8192)return reply({error:'payload_too_large'},413);const content=request.headers.get('content-type')||'';if(content.includes('application/json')){const obj=JSON.parse(text);if(!obj||Array.isArray(obj))throw Error();p=new URLSearchParams(Object.entries(obj).map(([k,v])=>[k,String(v)]))}else p=new URLSearchParams(text)}catch{return reply({error:'invalid_payload'},400)}}
 const eventId=p.get('event_id'),sub1=p.get('sub1'),transaction=p.get('transaction_id');
 if(!validId(eventId)||!validId(sub1)||sub1.length>100)return reply({error:'event_id_and_sub1_required'},400);
 if(transaction&&!validId(transaction))return reply({error:'invalid_transaction'},400);
 const date=p.get('date'),ms=date?Number(date):clock();if(!Number.isSafeInteger(ms)||ms<946684800000||ms>clock()+300000)return reply({error:'invalid_date_ms'},400);
 const co=p.get('country');if(co&&!/^[a-zA-Z]{2}$/.test(co))return reply({error:'invalid_country'},400);
 const amount=p.get('amount');if(amount&&(!/^\d+(\.\d{1,8})?$/.test(amount)||!Number.isFinite(Number(amount))||Number(amount)>1e12))return reply({error:'invalid_amount'},400);
 const event={event_id:eventId,type,sub1,attribution_scope:'channel_campaign',ad_id:null,occurred_at:new Date(ms).toISOString(),received_at:new Date(clock()).toISOString(),transaction_id:transaction||null,country:co?.toUpperCase()||null,deposit_amount:type==='FirstDeposit'&&amount?Number(amount):null,currency:null,source:'1win-postback',test:runtime.CONTEXT!=='production'};
 // Timestamp/amount are event facts, never affiliate revenue. Do not transmit these callbacks to Meta.
 const digest=createHash('sha256').update(type+'|'+eventId).digest('hex');
 try{const store=storeFactory(storeName(runtime));
 // One immutable record per type/event_id. The global key also deduplicates retries with changed dates.
 const stored=await store.setJSON('events/by-id/'+digest,event,{onlyIfNew:true});return reply({ok:true,duplicate:!stored.modified,event_id:eventId,attribution_scope:'channel_campaign'});
 }catch{return reply({error:'storage_unavailable'},503)}
}}

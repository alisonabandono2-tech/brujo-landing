import {getStore} from '@netlify/blobs';
import {createHash} from 'node:crypto';
import {storeName,runtimeEnv,validId} from './http.mjs';
export function landingRecord(data,context,env,clock=()=>Date.now()){
 const attribution=data.attribution&&typeof data.attribution==='object'?data.attribution:{};
 const label=value=>typeof value==='string'&&!/[{}<>]/.test(value)?value.trim().slice(0,160):'';
 const co=context.geo?.country?.code;
 return {event_id:data.event_id,type:data.event_name,visit_id:validId(data.visit_id)?data.visit_id:data.event_id,occurred_at:new Date(data.event_time*1000).toISOString(),received_at:new Date(clock()).toISOString(),country:typeof co==='string'&&/^[A-Z]{2}$/.test(co)?co:'ZZ',campaign:label(attribution.campaign),adset:label(attribution.adset),ad:label(attribution.ad),traffic_source:label(attribution.source),source:'landing-capi',test:runtimeEnv(env,context).CONTEXT!=='production'};
}
export async function saveLanding(data,context,env){const store=getStore({name:storeName(runtimeEnv(env,context)).replace('1win','landing'),consistency:'strong'});const record=landingRecord(data,context,env);const key=createHash('sha256').update(record.type+'|'+record.event_id).digest('hex');await store.setJSON('events/by-id/'+key,record,{onlyIfNew:true})}

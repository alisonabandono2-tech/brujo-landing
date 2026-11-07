import {isIP} from 'node:net';
import {reply,validId,runtimeEnv} from './lib/http.mjs';
export function createHandler({env=process.env,send=fetch,clock=()=>Date.now()}={}){return async function(request,context={}){
 if(request.method!=='POST')return reply({error:'method_not_allowed'},405);
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'origin_denied'},403);
 const pixel=env.META_PIXEL_ID||'',token=env.META_CAPI_TOKEN,version=env.META_GRAPH_VERSION||'v25.0';if(!/^\d{5,30}$/.test(pixel)||!token||!/^v\d+\.\d+$/.test(version))return reply({error:'meta_not_configured'},503);
 let data;try{const raw=await request.text();if(raw.length>8192)return reply({error:'payload_too_large'},413);data=JSON.parse(raw)}catch{return reply({error:'invalid_json'},400)}
 if(!data||data.consent!==true||!['PageView','Lead'].includes(data.event_name)||!validId(data.event_id))return reply({error:'invalid_event'},400);
 const eventTime=Number(data.event_time),now=Math.floor(clock()/1000);if(!Number.isInteger(eventTime)||eventTime>now+60||eventTime<now-86400)return reply({error:'invalid_event_time'},400);
 let source;try{source=new URL(data.event_source_url);if(source.origin!==new URL(request.url).origin)throw Error();source.search='';source.hash=''}catch{return reply({error:'invalid_source_url'},400)}
 const userData={};
 if(typeof context.ip==='string'&&isIP(context.ip))userData.client_ip_address=context.ip;
 const ua=request.headers.get('user-agent');if(ua)userData.client_user_agent=ua.slice(0,1000);
 for(const name of ['fbp','fbc']){const v=data[name];if(v!=null&&v!==''){if(typeof v!=='string'||v.length>500||!/^fb\.\d+\.\d+\.[a-zA-Z0-9_-]+$/.test(v))return reply({error:'invalid_'+name},400);userData[name]=v}}
 if(!userData.client_ip_address&&!userData.fbc&&!userData.fbp)return reply({error:'matching_data_unavailable'},422);
 const event={event_name:data.event_name,event_id:data.event_id,event_time:eventTime,action_source:'website',event_source_url:source.href,user_data:userData};
 // Lead here means click on the WhatsApp CTA. No GroupJoin, registration or FTD is claimed.
 const payload={data:[event]};if(runtimeEnv(env,context).CONTEXT!=='production'&&env.META_TEST_EVENT_CODE)payload.test_event_code=env.META_TEST_EVENT_CODE;
 try{const response=await send('https://graph.facebook.com/'+version+'/'+pixel+'/events',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify(payload),signal:AbortSignal.timeout(8000)});const result=await response.json();if(!response.ok||result.error||result.events_received!==1)return reply({error:'meta_rejected_event'},502);return reply({ok:true,event_id:data.event_id})}catch{return reply({error:'meta_unavailable'},502)}
}}
export default createHandler();

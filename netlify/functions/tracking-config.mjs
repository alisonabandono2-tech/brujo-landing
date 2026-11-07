import {reply} from './lib/http.mjs';
export default async function(request){if(request.method!=='GET')return reply({error:'method_not_allowed'},405);const id=process.env.META_PIXEL_ID||'';return reply({pixelId:/^\d{5,30}$/.test(id)?id:null,capiConfigured:!!process.env.META_CAPI_TOKEN})}

import {timingSafeEqual} from 'node:crypto';
export const reply=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff'}});
export function authorized(supplied,expected){if(!expected||expected.length<32||typeof supplied!=='string')return false;const a=Buffer.from(supplied),b=Buffer.from(expected);return a.length===b.length&&timingSafeEqual(a,b)}
export const validId=v=>typeof v==='string'&&/^[a-zA-Z0-9_.:-]{1,150}$/.test(v);
export const hashPattern=/^[a-zA-Z0-9_.:-]{1,100}$/;
export function preview(env){return env.CONTEXT!=='production'}
export function storeName(env){return env.CONTEXT==='production'?'brujo-1win-production':'brujo-1win-preview-'+String(env.DEPLOY_ID||'local').replace(/[^a-zA-Z0-9-]/g,'').slice(0,80)}

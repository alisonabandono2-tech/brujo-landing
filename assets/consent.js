(function(){
'use strict';
var KEY='brujo_marketing_consent_v1',VERSION=1,DURATION=90*24*60*60*1000;
var banner=document.createElement('section');banner.className='brujo-consent';banner.hidden=true;banner.setAttribute('role','region');banner.setAttribute('aria-labelledby','brujo-consent-title');
banner.innerHTML='<h2 id="brujo-consent-title">Tu privacidad</h2><p>Con tu permiso, usamos cookies e identificadores de Meta para medir visitas y clics en WhatsApp y evaluar nuestros anuncios. Compartimos con Meta datos de navegación, como tu dirección IP y navegador. Puedes entrar al canal aunque rechaces.</p><details><summary>Más información</summary><p>Guardamos tu elección durante 90 días en este navegador. Si aceptas, activamos el Pixel de Meta y la API de Conversiones. Puedes cambiar tu elección en «Privacidad y cookies» al pie de la página. Al rechazar o revocar, detenemos nuevos envíos y eliminamos las cookies _fbp y _fbc accesibles desde este sitio. Esto no retira los datos enviados anteriormente.</p></details><div class="brujo-consent-actions"><button type="button" data-consent="accept">Aceptar medición</button><button type="button" data-consent="reject">Rechazar medición</button></div>';
var manage=document.createElement('button');manage.type='button';manage.className='brujo-privacy';manage.textContent='Privacidad y cookies';manage.setAttribute('aria-controls','brujo-consent-panel');manage.setAttribute('aria-expanded','false');banner.id='brujo-consent-panel';
var status=document.createElement('p');status.className='brujo-consent-status';status.setAttribute('aria-live','polite');
var spacer=document.createElement('div');spacer.className='brujo-consent-space';spacer.setAttribute('aria-hidden','true');
var host=document.querySelector('.inner')||document.body;host.appendChild(manage);host.appendChild(status);document.body.appendChild(spacer);document.body.appendChild(banner);
var current=null,expiryTimer;
function read(){try{var value=JSON.parse(localStorage.getItem(KEY)||'null');if(value&&value.version===VERSION&&['accept','reject'].indexOf(value.choice)!==-1&&typeof value.expires_at==='number'&&value.expires_at>Date.now()&&value.expires_at<=Date.now()+DURATION+60000)return value}catch(e){}return null}
function size(){spacer.style.setProperty('--brujo-consent-space',banner.hidden?'0px':(banner.getBoundingClientRect().height+32)+'px')}
function show(focus){banner.hidden=false;manage.setAttribute('aria-expanded','true');size();if(focus)banner.querySelector('button').focus()}
function hide(){banner.hidden=true;manage.setAttribute('aria-expanded','false');size()}
function apply(value){clearTimeout(expiryTimer);current=value;window.brujoSetTrackingConsent(!!value&&value.choice==='accept');status.textContent=value?(value.choice==='accept'?'Medición publicitaria aceptada.':'Medición publicitaria rechazada.'):'La medición publicitaria está desactivada hasta que elijas.';if(value){hide();expiryTimer=setTimeout(function(){apply(read())},Math.min(value.expires_at-Date.now()+1,2147483647))}else{show(false)}}
function choose(choice){var value={version:VERSION,choice:choice,expires_at:Date.now()+DURATION};try{localStorage.setItem(KEY,JSON.stringify(value))}catch(e){/* The explicit choice still applies to this page if browser storage is unavailable. */}apply(value);manage.focus()}
banner.querySelectorAll('[data-consent]').forEach(function(button){button.addEventListener('click',function(){choose(button.getAttribute('data-consent'))})});
manage.addEventListener('click',function(){show(true)});
window.addEventListener('storage',function(event){if(event.key===KEY||event.key===null)apply(read())});
window.addEventListener('resize',size);
if(typeof ResizeObserver==='function')new ResizeObserver(size).observe(banner);
apply(read());
})();

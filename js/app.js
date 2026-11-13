/* Arranque de la aplicación y utilidades de la interfaz */
$("#ub").innerHTML=`<span>${ic("pin")}Retiro en el local, sin costo de envío</span><span>${mailA()}</span>`;
$("#ft").innerHTML=`<div class="fg"><div><img class="seal ft" data-seal alt="" width="72" height="72"><h2>${T}</h2><p>Literatura y tradición. Libros clásicos y artículos para lectores. Compras en línea y retiras en el local.</p></div><div><h2>Contáctanos</h2><ul class="fu"><li>${mailA()}</li><li>${ic("pin")}<span>${LOCAL}</span></li><li><span>${HOR}</span></li></ul></div><div><h2>Ayuda</h2><ul class="fu"><li><a href="#/ayuda">Preguntas frecuentes</a></li><li><a href="ayuda.html#politicas">Política de no devoluciones</a></li></ul></div></div><p class="cp">© 2026 ${T}. Todos los derechos reservados.</p>`;
function ext(){document.querySelectorAll("[data-seal]:not([src])").forEach(i=>i.src=LOGO);}
document.addEventListener("error",e=>{const i=e.target;if(i.tagName=="IMG"&&i.dataset.v){const p=g(i.dataset.id),nx={jpg:"png",png:"webp"}[i.dataset.x||"jpg"];if(p&&nx){i.dataset.x=nx;i.src=`imagenes/${p.id}-${NM[i.dataset.v]}.${nx}`;return}if(p)i.outerHTML=`<div class="pi av" data-id="${p.id}" data-v="${i.dataset.v}">${cvs(p,i.dataset.v)}</div>`}},true);

/* Arranque: carga el stock y la sesión desde Supabase y luego pinta la página */
load();
const arranque=()=>{Object.keys(S.cart).forEach(k=>{if(!g(k))delete S.cart[k]});[...S.fav].forEach(k=>{if(!g(k))S.fav.delete(k)});route()};
addEventListener("pagehide",save);
/* Las páginas públicas se pintan al instante con el catálogo local; luego se actualizan stock y sesión sin recargar.
   Las páginas de cuenta (pago, perfil, favoritos…) esperan solo si hay una sesión guardada. */
const hayTok=(()=>{try{return Object.keys(localStorage).some(k=>/^sb-.+-auth-token$/.test(k))}catch(e){return true}})(),NEED=/^#\/(pago|ok|perfil|favoritos|carrito)/.test(cur())&&hayTok;
["input","change","click"].forEach(t=>document.addEventListener(t,e=>{if(e.target.closest&&e.target.closest("#main"))S.tc=1},true));
if(NEED)$("#main").innerHTML='<div class="ld" role="status" aria-live="polite"><span class="spn" aria-hidden="true"></span> Cargando tu cuenta…</div>';else arranque();
DB.init().finally(()=>{if(NEED)arranque();else if(!S.tc){window.__r=0;arranque()}else nav();if(/[?&]salio=1/.test(location.search)){toast("Cerraste sesión.");try{history.replaceState(null,"","index.html")}catch(e){}}});
document.addEventListener("click",e=>{const b=e.target.closest("[data-go]");if(!b)return;const t=$(b.dataset.go);if(t){t.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"auto":"smooth",block:"start"});t.focus({preventScroll:true})}});

new MutationObserver(()=>fixA()).observe(document.body,{childList:true,subtree:true});fixA();

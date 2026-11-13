/* Almacenamiento local del navegador.
   - Carrito de INVITADO (sin sesión): "chronos-cart-guest-v1".
   - Carrito de CADA CUENTA: "chronos-cart-u-<id de la cuenta>". Al iniciar sesión o registrarse, el carrito de invitado se une al de la cuenta
     y el de invitado se borra; al cerrar sesión el carrito visible queda vacío y el de la cuenta sigue guardado a su nombre.
   - Último pedido: "chronos-local-v3". Búsqueda, filtros y avisos entre páginas: sessionStorage. */
const KEY="chronos-local-v3",SK="chronos-nav-v1",GK="chronos-cart-guest-v1",UK=id=>"chronos-cart-u-"+id;
const rdk=k=>{try{return JSON.parse(localStorage.getItem(k)||"null")}catch(e){return null}};
function save(){try{localStorage.setItem(S.user?UK(S.user.id):GK,JSON.stringify(S.cart));localStorage.setItem(KEY,JSON.stringify({ped:S.ped}))}catch(e){}try{sessionStorage.setItem(SK,JSON.stringify({q:S.q,fl:S.fl,msg:S.msg,next:S.next,kq:S.kq,scope:S.scope}))}catch(e){}}
function load(){const j=rdk(KEY);Object.assign(S,{cart:rdk(GK)||(j&&j.cart)||{},ped:j&&j.ped||null});try{const n=JSON.parse(sessionStorage.getItem(SK)||"null");if(n)Object.assign(S,{q:n.q||"",fl:n.fl||S.fl,msg:n.msg||"",next:n.next||null,kq:!!n.kq,scope:n.scope||S.scope})}catch(e){}}
/* Se llama cuando ya se sabe quién es el usuario (inicio de sesión, registro o sesión guardada) */
function adoptCart(){const u=S.user;if(!u)return;const m={...(rdk(UK(u.id))||{})};Object.entries(S.cart).forEach(([id,q])=>{m[id]=(m[id]||0)+q});Object.keys(m).forEach(id=>{if(!(m[id]>0))delete m[id]});S.cart=m;try{localStorage.removeItem(GK)}catch(e){}if(S.ped&&S.ped.uid&&S.ped.uid!=u.id)S.ped=null;save()}
/* Si hay más unidades en el carrito que en stock, se ajusta y se avisa */
function ajustarCarrito(){let aj=0;Object.keys(S.cart).forEach(k=>{const p=g(k);if(!p||p.st<1){delete S.cart[k];if(p)aj=1}else if(S.cart[k]>p.st){S.cart[k]=p.st;aj=1}});if(aj){save();nav();toast("Ajustamos tu carrito a las unidades que hay disponibles.")}}

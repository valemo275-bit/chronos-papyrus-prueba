/* Conexión con Supabase: sesión, perfiles, favoritos, stock y pedidos */
const supa=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const DB={
 ok:!/TU-PROYECTO/.test(SUPABASE_URL),
 /* Al abrir la página: stock actualizado y sesión guardada (si existe) */
 async init(){if(!DB.ok){console.warn("Configura js/config.js");return}
  /* Cerrar sesión: al llegar con ?salio=1 se cierra la sesión en Supabase y se borra la guardada en este navegador */
  if(/[?&]salio=1/.test(location.search)){try{await supa.auth.signOut()}catch(e){}try{Object.keys(localStorage).filter(k=>/^sb-.+-auth-token/.test(k)).forEach(k=>localStorage.removeItem(k))}catch(e){}S.user=null;S.cart={};S.ped=null;S.orders=[];S.fav=new Set();S.next=null;save()}
  /* Todo en paralelo: la página no espera varias consultas una detrás de otra */
  let ex=Promise.resolve();try{if(Date.now()-(+sessionStorage.getItem("cp-exp")||0)>60000){sessionStorage.setItem("cp-exp",Date.now());ex=supa.rpc("expirar_reservas")}}catch(e){}
  const r=await Promise.allSettled([ex.then(()=>DB.stock()),DB.resenas(),supa.auth.getSession().then(({data})=>data.session?DB.cargarUsuario(data.session.user):0)]);r.forEach(x=>x.status=="rejected"&&console.error(x.reason));DB.listo=true;try{ajustarCarrito()}catch(e){}},
 async stock(){const{data,error}=await supa.from("productos").select("id,stock");if(error)throw error;data.forEach(r=>{const p=P.find(x=>x.id==r.id);if(p)p.st=r.stock})},
 async cargarUsuario(u){const[{data:pr,error},{data:fv},{data:tg}]=await Promise.all([supa.from("profiles").select("*").eq("id",u.id).single(),supa.from("favoritos").select("producto_id").eq("user_id",u.id),supa.from("tarjetas_guardadas").select("numero,marca").eq("user_id",u.id).maybeSingle(),DB.pedidos()]);if(error)throw error;S.tg=tg||null;
  S.user={id:u.id,n:pr.nombre,a:pr.apellido,ced:pr.cedula,c:pr.correo,t:pr.telefono||""};S.fav=new Set((fv||[]).map(x=>x.producto_id));adoptCart()},
 async pedidos(){const{data,error}=await supa.from("pedidos").select("*,pedido_items(*),pagos(*),transferencias(*)").order("creado_en",{ascending:false});if(error)throw error;S.orders=data.map(DB.mapPedido)},
 /* Calificaciones de todos los libros (públicas): {producto_id:[{c:user_id,u:nombre,s:estrellas}]} */
 async resenas(){const{data,error}=await supa.from("resenas").select("user_id,producto_id,calificacion,autor");if(error)throw error;S.rev={};data.forEach(r=>(S.rev[r.producto_id]=S.rev[r.producto_id]||[]).push({c:r.user_id,u:r.autor,s:r.calificacion}))},
 async quitarCalificacion(id){const{error}=await supa.from("resenas").delete().eq("user_id",S.user.id).eq("producto_id",id);if(error)return{error:"No pudimos borrar tu calificación."};await DB.resenas();return{}},
 async calificar(id,s){const{error}=await supa.from("resenas").upsert({user_id:S.user.id,producto_id:id,calificacion:s},{onConflict:"user_id,producto_id"});if(error)return{error:/row-level|policy|permission/i.test(error.message||"")?"Solo puedes calificar libros que compraste.":"No pudimos guardar tu calificación."};await DB.resenas();return{}},
 mapPedido(r){const pg=[].concat(r.pagos||[])[0]||{},tr=[].concat(r.transferencias||[])[0]||{};return{cod:r.codigo,uid:r.user_id,ced:r.cedula,cli:r.cliente,cor:r.correo,tel:r.telefono,mp:r.metodo_pago,est:r.estado,des:r.retiro_fecha||"",has:r.limite_retiro,
  pago:r.metodo_pago=="tarjeta"?{marca:pg.marca,u4:pg.ultimos4}:r.metodo_pago=="qr"?{comp:tr.comprobante}:null,
  lines:(r.pedido_items||[]).map(i=>({id:i.producto_id,n:i.nombre,q:i.cantidad,pu:+i.precio_unitario,sub:+i.subtotal})),sub:+r.subtotal,d:+r.descuento,iva:+r.iva,t:+r.total,f:new Date(r.creado_en).toLocaleString("es-EC"),ts:new Date(r.creado_en).getTime()}},
 /* Cuentas: Supabase Auth guarda la contraseña cifrada (bcrypt); un trigger crea el perfil */
 async registrar(d){if(!DB.ok)return{error:"El sitio aún no está conectado a la base de datos."};
  const{data:ex}=await supa.rpc("existe_cedula",{c:d.rd});if(ex)return{error:"Esa cédula ya tiene una cuenta. Inicia sesión.",campo:"rd"};
  const{data,error}=await supa.auth.signUp({email:d.rc.trim().toLowerCase(),password:d.rp,options:{data:{...splitNom(d.rn),cedula:d.rd,telefono:d.rt}}});
  if(error)return{error:/registered|already/i.test(error.message)?"Ese correo ya tiene cuenta. Inicia sesión.":"No pudimos crear la cuenta. Inténtalo de nuevo.",campo:"rc"};
  if(!data.session)return{error:"Falta desactivar la confirmación de correo en Supabase (Authentication > Sign In / Providers > Email).",campo:"rc"};
  await DB.cargarUsuario(data.user);return{}},
 async entrar(c,p){if(!DB.ok)return{error:"El sitio aún no está conectado a la base de datos."};const{data,error}=await supa.auth.signInWithPassword({email:c,password:p});if(error)return{error:"Correo o contraseña incorrectos."};await DB.cargarUsuario(data.user);return{}},
 async salir(){await supa.auth.signOut()},
 /* Recuperar contraseña con un código de 8 números enviado al correo (no usa enlaces ni deja ninguna sesión abierta) */
 async cancelar(cod){const{data,error}=await supa.rpc("cancelar_mi_pedido",{p_codigo:cod});if(error){const m=error.message||"";return{error:/YA_CANCELADO/.test(m)?"Este pedido ya estaba cancelado.":/YA_RETIRADO/.test(m)?"Este pedido ya fue retirado, ya no se puede cancelar.":"No pudimos cancelar el pedido. Inténtalo de nuevo."}}try{await Promise.all([DB.pedidos(),DB.stock()])}catch(e){}return{d:data}},
 async guardarTarjeta(n,m){const{error}=await supa.from("tarjetas_guardadas").upsert({user_id:S.user.id,numero:n,marca:m},{onConflict:"user_id"});if(error)return{error:"No pudimos guardar la tarjeta."};S.tg={numero:n,marca:m};return{}},
 async borrarTarjeta(){const{error}=await supa.from("tarjetas_guardadas").delete().eq("user_id",S.user.id);if(error)return{error:"No pudimos eliminar la tarjeta."};S.tg=null;return{}},
 async recuperar(c){const{error}=await supa.auth.resetPasswordForEmail(c);if(error&&/rate|limit|seconds/i.test(error.message))return{error:"Espera un minuto antes de pedir otro código."};return{}},
 async nuevaClave(c,cod,p){const{error:e1}=await supa.auth.verifyOtp({email:c,token:cod,type:"recovery"});if(e1)return{error:"El código no es correcto o ya venció. Revisa el correo o pide uno nuevo.",campo:"oc"};
  const{error}=await supa.auth.updateUser({password:p});const lim=async()=>{try{await supa.auth.signOut({scope:"local"})}catch(e){}try{Object.keys(localStorage).filter(k=>/^sb-.+-auth-token/.test(k)).forEach(k=>localStorage.removeItem(k))}catch(e){}};await lim();
  return error?{error:/same|different/i.test(error.message)?"La nueva contraseña debe ser distinta a la anterior.":"No pudimos cambiar la contraseña. Pide un código nuevo.",campo:"np"}:{}},
 async guardarPerfil(x){const u=S.user;if(x.c!=u.c){const{error}=await supa.auth.updateUser({email:x.c});if(error)return{error:"No pudimos cambiar el correo. ¿Ya está en uso?",campo:"uco"}}
  const{error}=await supa.from("profiles").update({nombre:x.n,apellido:x.a,telefono:x.t||null}).eq("id",u.id);if(error)return{error:"No pudimos guardar los cambios.",campo:"ut"};Object.assign(u,{n:x.n,a:x.a,c:x.c,t:x.t});return{}},
 async cambiarClave(a,n){const{error:e1}=await supa.auth.signInWithPassword({email:S.user.c,password:a});if(e1)return{error:"La contraseña actual no es correcta.",campo:"pa"};const{error}=await supa.auth.updateUser({password:n});return error?{error:"No pudimos cambiar la contraseña.",campo:"pn"}:{}},
 async favorito(id,on){const q=on?supa.from("favoritos").insert({user_id:S.user.id,producto_id:id}):supa.from("favoritos").delete().eq("user_id",S.user.id).eq("producto_id",id);const{error}=await q;if(error)toast("No pudimos guardar el favorito.")},
 /* Pedido: una sola función en la base de datos descuenta el stock y guarda la orden (todo o nada) */
 async correo(cod){S.mail={cod,st:"enviando"};mailPaint();let d=null;try{const r=await supa.functions.invoke("enviar-correo-pedido",{body:{codigo:cod}});d=r.data;if(r.error&&r.error.context&&r.error.context.json){try{d=await r.error.context.json()}catch(e){}}}catch(e){}
  S.mail={cod,st:d&&d.ok?"ok":"error",para:d&&d.para,err:d&&d.error};mailPaint()},
 async crearPedido(o){const{data,error}=await supa.rpc("crear_pedido",{p_datos:{cliente:o.cli,cedula:o.ced,correo:o.cor,telefono:o.tel,metodo:o.mp,retiro:o.des||null,comprobante:o.pago&&o.pago.comp||null,marca:o.pago&&o.pago.marca||null,ult4:o.pago&&o.pago.u4||null},
  p_items:o.lines.map(l=>({id:l.id,cantidad:l.q}))});
  if(error){const m=error.message||"";return{error:/SIN_STOCK/.test(m)?"Alguien compró uno de tus productos y ya no hay stock suficiente. Revisa tu carrito.":/comprobante/.test(m)?"Ese comprobante ya fue usado en otro pedido.":/FECHA_RETIRO/.test(m)?"La fecha de retiro no es válida. Elige otro día.":"No pudimos registrar tu pedido. Inténtalo de nuevo."}}return{cod:data}}
};

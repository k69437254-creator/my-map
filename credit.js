(function(){
'use strict';
var DEV='Aram Aoyal',VER='3.0';
try{var m=document.createElement('meta');m.name='author';m.content=DEV;document.head.appendChild(m)}catch(e){}
var css='.scr{margin-top:20px;font-size:13px;color:#bfe3e5;text-align:center;letter-spacing:.3px}.scr b{color:#fff;font-weight:700;letter-spacing:.6px}.scr:before{content:"";display:block;width:34px;height:2px;border-radius:2px;background:#E3A62B;margin:0 auto 10px;opacity:.9}'+
'.cr{margin:18px 0 4px;padding:16px;border-radius:20px;background:linear-gradient(135deg,#14213D,#0f6f78);color:#fff;text-align:center}'+
'.cr .lg{width:46px;height:46px;border-radius:14px;background:#E3A62B;display:flex;align-items:center;justify-content:center;margin:0 auto 8px}.cr .lg svg{width:26px;height:26px;stroke:#14213D;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}'+
'.cr h4{margin:0;font-size:18px}.cr .v{font-size:12px;color:#9fd9db;margin-top:2px}'+
'.cr .by{margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.18);font-size:13px;color:#cfe9ea}.cr .by b{display:block;margin-top:3px;font-size:17px;color:#fff;letter-spacing:.8px}'+
'.cr .sm2{margin-top:10px;font-size:11px;color:#9fb7bd;line-height:1.7}';
var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
var sp=document.getElementById('splash');
if(sp){var d=document.createElement('div');d.className='scr';d.innerHTML='تطوير وتصميم<br><b><bdi dir="ltr">'+DEV+'</bdi></b>';sp.appendChild(d)}
var sb=document.getElementById('setBody');
function card(){if(!sb||sb.querySelector('.cr'))return;var c=document.createElement('div');c.className='cr';
c.innerHTML='<div class="lg"><svg viewBox="0 0 24 24"><path d="M12 21s-7-5.5-7-11a7 7 0 0114 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg></div><h4>خريطتي</h4><div class="v">الإصدار '+VER+'</div>'+
'<div class="by">تطوير وتصميم<b><bdi dir="ltr">'+DEV+'</bdi></b></div>'+
'<div class="sm2">© '+new Date().getFullYear()+' جميع الحقوق محفوظة<br>الخرائط: OpenStreetMap · صور الأقمار: Esri · المسارات: OSRM</div>';
sb.appendChild(c)}
if(sb&&window.MutationObserver){new MutationObserver(card).observe(sb,{childList:true})}
})();

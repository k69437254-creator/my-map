(function(){
'use strict';
var $=function(i){return document.getElementById(i)};
function lj(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}}
function sj(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
var ST=Object.assign({voice:true,vname:'',rate:1,pitch:1,vol:1,layer:'street'},lj('my-map-settings',{}));
function saveST(){sj('my-map-settings',ST)}
function num(x){return String(x).replace(/\d/g,function(d){return'٠١٢٣٤٥٦٧٨٩'[d]}).replace('.','٫')}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
var tt;function toast(m){var t=$('toast');t.textContent=m;t.hidden=false;clearTimeout(tt);tt=setTimeout(function(){t.hidden=true},3200)}
function hav(a,b){var R=6371000,r=Math.PI/180,dl=(b[0]-a[0])*r,dg=(b[1]-a[1])*r,x=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dg/2)*Math.sin(dg/2);return 2*R*Math.asin(Math.sqrt(x))}
function bearing(a,b){var r=Math.PI/180,y=Math.sin((b[1]-a[1])*r)*Math.cos(b[0]*r),x=Math.cos(a[0]*r)*Math.sin(b[0]*r)-Math.sin(a[0]*r)*Math.cos(b[0]*r)*Math.cos((b[1]-a[1])*r);return(Math.atan2(y,x)/r+360)%360}
function fd(m){return m>=1000?num((m/1000).toFixed(1))+' كم':num(Math.round(m))+' م'}
function vd(m){return m>=1000?(m/1000).toFixed(1)+' كيلومتر':Math.max(50,Math.round(m/50)*50)+' متر'}
function ft(s){var m=Math.max(1,Math.round(s/60));return m<60?num(m)+' د':num(Math.floor(m/60))+' س '+num(m%60)+' د'}
function eta(s){return new Date(Date.now()+s*1000).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})}
function ago(t){var m=Math.round((Date.now()-t)/60000);if(m<1)return'الآن';if(m<60)return'قبل '+num(m)+' د';var h=Math.round(m/60);if(h<48)return'قبل '+num(h)+' س';return'قبل '+num(Math.round(h/24))+' يوم'}
var EMPTY='<svg viewBox="0 0 24 24"><path d="M12 21s-7-5.5-7-11a7 7 0 0114 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';

var S={pos:null,last:null,head:0,watch:null,dest:null,routes:{car:[],foot:[]},mode:'car',ri:0,route:null,coords:[],steps:[],next:1,nav:false,ann:{},alerted:{},reroute:0,follow:true,fly:false,wake:null,rg:null,dm:null,me:null,busy:false,warned:false,addLL:null,addCat:'other',ffil:'all',rfil:'all',poi:{hospital:false,police:false},poiTok:0,sheet:null,pushed:false,rp:null,trip:null,denied:false};

/* ---------- map + layers ---------- */
var map=L.map('map',{zoomControl:false}).setView([24.7136,46.6753],11);
map.attributionControl.setPrefix(false);
var ESRI='https://server.arcgisonline.com/ArcGIS/rest/services/';
var SAT=function(){return L.tileLayer(ESRI+'World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,maxNativeZoom:17,attribution:'Esri, Maxar, Earthstar Geographics'})};
var BL={
street:{n:'الشارع',d:'خريطة واضحة للطرق',mk:function(){return[L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'})]}},
sat:{n:'قمر صناعي',d:'صور حقيقية للمدينة',mk:function(){return[SAT()]}},
hybrid:{n:'قمر صناعي مع أسماء',d:'صور حقيقية وأسماء الشوارع',mk:function(){return[SAT(),L.tileLayer(ESRI+'Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,maxNativeZoom:17,zIndex:3})]}},
terrain:{n:'تضاريس',d:'مرتفعات وطبيعة',mk:function(){return[L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',{maxZoom:17,subdomains:'abc',attribution:'© OpenTopoMap, OpenStreetMap'})]}},
dark:{n:'ليلي',d:'مريح للقيادة ليلًا',mk:function(){return[L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{maxZoom:19,subdomains:'abcd',attribution:'© OpenStreetMap, © CARTO'})]}}
};
var baseLayers=[];
function setBase(k){if(!BL[k])k='street';baseLayers.forEach(function(l){map.removeLayer(l)});baseLayers=BL[k].mk();baseLayers.forEach(function(l){l.addTo(map)});ST.layer=k;saveST()}
setBase(ST.layer);

/* ---------- sheets ---------- */
var SHEETS=['sResults','sLayers','sReport','sReports','sFavs','sAdd','sSet'];
function openSheet(id){SHEETS.forEach(function(x){$(x).classList.remove('open')});$(id).classList.add('open');$('bd').hidden=false;S.sheet=id;if(!S.pushed){try{history.pushState({sh:1},'');S.pushed=true}catch(e){}}}
function hideSheets(){SHEETS.forEach(function(x){$(x).classList.remove('open')});$('bd').hidden=true;S.sheet=null}
function closeSheet(){hideSheets();if(S.pushed){S.pushed=false;try{history.back()}catch(e){}}}
window.addEventListener('popstate',function(){if(S.pushed){S.pushed=false;hideSheets()}});
document.addEventListener('click',function(e){if(e.target.closest('[data-close]')||e.target===$('bd'))closeSheet()});

/* ---------- voice (Arabic) ---------- */
function arVoices(){try{return window.speechSynthesis?speechSynthesis.getVoices().filter(function(v){return/^ar/i.test(v.lang)}):[]}catch(e){return[]}}
function pickVoice(){var l=arVoices();if(!l.length)return null;var m=l.filter(function(v){return v.name===ST.vname})[0];if(m)return m;var g=l.filter(function(v){return/google|neural|enhanced|premium|natural/i.test(v.name)})[0];return g||l[0]}
function say(x){try{var u=new SpeechSynthesisUtterance(x);u.lang='ar-SA';u.rate=ST.rate;u.pitch=ST.pitch;u.volume=ST.vol;var v=pickVoice();if(v){u.voice=v;u.lang=v.lang}else if(!S.warned){S.warned=true;toast('لم أجد صوتًا عربيًا في جوالك. ثبّته من إعدادات «تحويل النص إلى كلام»')}speechSynthesis.speak(u)}catch(e){}}
function speak(x,force){if(!window.speechSynthesis||(!ST.voice&&!force))return;try{speechSynthesis.cancel()}catch(e){}setTimeout(function(){say(x)},120)}
function unlockSpeech(){try{var u=new SpeechSynthesisUtterance(' ');u.volume=0;speechSynthesis.speak(u)}catch(e){}}
if(window.speechSynthesis){try{speechSynthesis.getVoices();speechSynthesis.onvoiceschanged=function(){if(S.sheet==='sSet')renderSettings()}}catch(e){}}
var VON='<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/>',VOFF='<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>';
function paintVoice(){$('vIc').innerHTML=ST.voice?VON:VOFF;$('vLb').textContent=ST.voice?'الصوت':'مكتوم';$('dkVoice').classList.toggle('on',ST.voice)}
$('dkVoice').onclick=function(){ST.voice=!ST.voice;saveST();paintVoice();if(ST.voice)speak('تم تشغيل الصوت');else{try{speechSynthesis.cancel()}catch(e){}toast('تم كتم الصوت')}};
paintVoice();

/* ---------- layers sheet ---------- */
function renderLayers(){var h='<div class="lgrid">';Object.keys(BL).forEach(function(k){h+='<button class="lc'+(ST.layer===k?' on':'')+'" data-l="'+k+'"><span class="th th-'+k+'"></span><b>'+BL[k].n+'</b><small>'+BL[k].d+'</small></button>'});$('lBody').innerHTML=h+'</div>'}
$('lBody').addEventListener('click',function(e){var b=e.target.closest('[data-l]');if(!b)return;setBase(b.getAttribute('data-l'));renderLayers();toast('تم تغيير نمط الخريطة')});
$('layersBtn').onclick=function(){renderLayers();openSheet('sLayers')};

/* ---------- favorites ---------- */
var CATS={home:['المنزل','#13A3A8'],work:['العمل','#14213D'],food:['مطاعم ومقاهي','#E3A62B'],shop:['تسوق','#8E5BD8'],family:['العائلة والأصدقاء','#D6537A'],other:['أخرى','#5E6E7E']};
var places=lj('my-map-places',[]).filter(function(p){return isFinite(p.lat)&&isFinite(p.lng)}),pm={};
places.forEach(function(p){if(!CATS[p.cat])p.cat='other'});
function addPlaceMarker(p){var ic=L.divIcon({html:'<div class="pin" style="background:'+CATS[p.cat][1]+'"></div>',className:'',iconSize:[22,22],iconAnchor:[6,22]});
var box=document.createElement('div');box.className='pop';box.innerHTML='<b>'+esc(p.name)+'</b><br><small>'+CATS[p.cat][0]+'</small><br><button>اذهب إلى هنا</button>';
box.querySelector('button').onclick=function(){map.closePopup();setDest([p.lat,p.lng],p.name)};
pm[p.id]=L.marker([p.lat,p.lng],{icon:ic}).addTo(map).bindPopup(box)}
places.forEach(addPlaceMarker);
function chipsHTML(sel,all){var h=all?'<button data-c="all" class="'+(sel==='all'?'on':'')+'">الكل</button>':'';Object.keys(CATS).forEach(function(k){h+='<button data-c="'+k+'" class="'+(sel===k?'on':'')+'"><span class="dot" style="background:'+CATS[k][1]+'"></span>'+CATS[k][0]+'</button>'});return h}
function renderFavs(){$('ffilter').innerHTML=chipsHTML(S.ffil,true);var el=$('flist');el.innerHTML='';
var arr=places.filter(function(p){return S.ffil==='all'||p.cat===S.ffil});
if(!arr.length){el.innerHTML='<div class="empty">'+EMPTY+'<div>لا توجد أماكن هنا بعد.<br>اضغط على الخريطة ثم «حفظ»، أو احفظ موقعك الحالي.</div></div>';return}
arr.forEach(function(p){var r=document.createElement('div');r.className='item';
r.innerHTML='<span class="em" style="background:'+CATS[p.cat][1]+'22"><span class="dot" style="background:'+CATS[p.cat][1]+'"></span></span><span class="nm"><b>'+esc(p.name)+'</b><small>'+CATS[p.cat][0]+'</small></span><button class="sm" data-go="'+p.id+'">اذهب</button><button class="sm del" data-del="'+p.id+'">حذف</button>';el.appendChild(r)})}
$('ffilter').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;S.ffil=b.getAttribute('data-c');renderFavs()});
$('flist').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var g=b.getAttribute('data-go'),d=b.getAttribute('data-del');
if(g){var p=places.filter(function(x){return String(x.id)===g})[0];if(p){closeSheet();setDest([p.lat,p.lng],p.name)}}
if(d){places=places.filter(function(x){return String(x.id)!==d});if(pm[d]){map.removeLayer(pm[d]);delete pm[d]}sj('my-map-places',places);renderFavs()}});
$('dkFavs').onclick=function(){renderFavs();openSheet('sFavs')};
$('fhere').onclick=function(){if(!S.pos){startWatch();toast('جارٍ تحديد موقعك… حاول بعد لحظات');return}openAdd(S.pos,'موقعي')};
function openAdd(ll,name){S.addLL=ll;S.addCat='other';$('aname').value=name||'';$('acats').innerHTML=chipsHTML('other',false);openSheet('sAdd')}
$('acats').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;S.addCat=b.getAttribute('data-c');$('acats').innerHTML=chipsHTML(S.addCat,false)});
$('asave').onclick=function(){var p={id:Date.now(),name:$('aname').value.trim()||'مكان بدون اسم',lat:S.addLL[0],lng:S.addLL[1],cat:S.addCat};
places.push(p);sj('my-map-places',places);addPlaceMarker(p);closeSheet();toast('تم الحفظ في «'+CATS[p.cat][0]+'»')};

/* ---------- reports (professional) ---------- */
var TY={
accident:{t:'حادث',e:'🚗',g:'road',h:4,c:'#D64545'},traffic:{t:'ازدحام',e:'🚦',g:'road',h:1.5,c:'#E3752B'},closed:{t:'طريق مغلق',e:'⛔',g:'road',h:12,c:'#B3202F'},
breakdown:{t:'عطل مركبة',e:'🔧',g:'road',h:3,c:'#8E5BD8'},police:{t:'نقطة تفتيش',e:'👮',g:'road',h:3,c:'#2B5FD6'},radar:{t:'رادار',e:'📷',g:'road',h:720,c:'#13A3A8'},
pothole:{t:'حفرة',e:'🕳️',g:'surface',h:720,c:'#5E6E7E'},bump:{t:'مطب غير آمن',e:'⚠️',g:'surface',h:2160,c:'#E3A62B'},flood:{t:'مياه على الطريق',e:'🌊',g:'surface',h:12,c:'#2B8CD6'},
works:{t:'أعمال طريق',e:'🚧',g:'surface',h:168,c:'#E3752B'},fog:{t:'ضباب أو غبار',e:'🌫️',g:'surface',h:4,c:'#8795A3'},hazard:{t:'خطر آخر',e:'❗',g:'surface',h:6,c:'#D64545'}};
var GR={road:'حوادث وحركة المرور',surface:'حالة الطريق والأخطار'};
var SEV={1:['خفيف','#E3A62B'],2:['متوسط','#E3752B'],3:['شديد','#D64545']};
var LANE={all:'كل الاتجاهات',mine:'اتجاهي',opp:'الاتجاه المعاكس'};
var reps=lj('my-map-reports',[]).filter(function(r){return TY[r.type]&&isFinite(r.lat)&&isFinite(r.lng)});
function expOf(r){return r.exp||(r.time+TY[r.type].h*3600000)}
function activeReps(){var n=Date.now();return reps.filter(function(r){return expOf(r)>n})}
function saveReps(){sj('my-map-reports',reps)}
var repLayer=L.layerGroup().addTo(map);
function renderRepMarkers(){repLayer.clearLayers();activeReps().forEach(function(r){var t=TY[r.type],sv=SEV[r.sev||2];
var ic=L.divIcon({className:'',html:'<div class="mk" style="border-color:'+sv[1]+'">'+t.e+'</div>',iconSize:[36,36],iconAnchor:[18,18]});
var box=document.createElement('div');box.className='pop';
box.innerHTML='<b>'+t.t+'</b><span class="sv" style="background:'+sv[1]+'">'+sv[0]+'</span><br><small>'+ago(r.time)+(r.lane&&r.lane!=='all'?' · '+LANE[r.lane]:'')+(r.conf?' · تأكيدات: '+num(r.conf):'')+'</small>'+(r.note?'<p>'+esc(r.note)+'</p>':'')+'<button class="s" data-a="ok">ما زال موجودًا</button><button class="r" data-a="gone">انتهى</button>';
box.querySelector('[data-a=ok]').onclick=function(){r.time=Date.now();r.exp=r.time+t.h*3600000;r.conf=(r.conf||0)+1;saveReps();map.closePopup();renderRepMarkers();toast('شكرًا، تم تأكيد البلاغ')};
box.querySelector('[data-a=gone]').onclick=function(){reps=reps.filter(function(x){return x.id!==r.id});saveReps();map.closePopup();renderRepMarkers();toast('تم حذف البلاغ')};
L.marker([r.lat,r.lng],{icon:ic}).addTo(repLayer).bindPopup(box)})}
renderRepMarkers();setInterval(renderRepMarkers,60000);
function openReport(){S.rp={type:null,sev:2,lane:'all',loc:S.pos?'me':'center'};renderReport();openSheet('sReport')}
function renderReport(){var rp=S.rp,b=$('rpBody');
if(!rp.type){$('rpTitle').textContent='ما الذي تريد الإبلاغ عنه؟';var h='';
['road','surface'].forEach(function(g){h+='<h3>'+GR[g]+'</h3><div class="grid">';Object.keys(TY).forEach(function(k){if(TY[k].g!==g)return;h+='<button class="tile" data-t="'+k+'"><i style="background:'+TY[k].c+'22">'+TY[k].e+'</i>'+TY[k].t+'</button>'});h+='</div>'});b.innerHTML=h;return}
var t=TY[rp.type];$('rpTitle').textContent=t.e+' '+t.t;
var h2='<h3>مدى الخطورة</h3><div class="fc" id="rSev">';[1,2,3].forEach(function(i){h2+='<button data-sv="'+i+'" class="'+(rp.sev===i?'on':'')+'"><span class="dot" style="background:'+SEV[i][1]+'"></span>'+SEV[i][0]+'</button>'});
h2+='</div><h3>الاتجاه المتأثر</h3><div class="fc" id="rLane">';Object.keys(LANE).forEach(function(k){h2+='<button data-ln="'+k+'" class="'+(rp.lane===k?'on':'')+'">'+LANE[k]+'</button>'});
h2+='</div><h3>الموقع</h3><div class="fc" id="rLoc"><button data-lc="me" class="'+(rp.loc==='me'?'on':'')+'"'+(S.pos?'':' disabled style="opacity:.5"')+'>موقعي الحالي</button><button data-lc="center" class="'+(rp.loc==='center'?'on':'')+'">وسط الخريطة</button></div>';
h2+='<h3>ملاحظة (اختياري)</h3><textarea class="field" id="rNote" maxlength="140" placeholder="مثال: الحفرة عميقة في الممر الأيمن"></textarea><div class="row"><button class="btn gold" id="rSend">نشر البلاغ</button><button class="btn ghost" id="rBack">رجوع</button></div>';
b.innerHTML=h2}
function pick(box,attr,val){box.querySelectorAll('button').forEach(function(x){x.classList.toggle('on',x.getAttribute(attr)===String(val))})}
$('rpBody').addEventListener('click',function(e){var t=e.target.closest('button');if(!t||!S.rp)return;
if(t.hasAttribute('data-t')){S.rp.type=t.getAttribute('data-t');renderReport();return}
if(t.hasAttribute('data-sv')){S.rp.sev=+t.getAttribute('data-sv');pick($('rSev'),'data-sv',S.rp.sev);return}
if(t.hasAttribute('data-ln')){S.rp.lane=t.getAttribute('data-ln');pick($('rLane'),'data-ln',S.rp.lane);return}
if(t.hasAttribute('data-lc')){if(t.disabled)return;S.rp.loc=t.getAttribute('data-lc');pick($('rLoc'),'data-lc',S.rp.loc);return}
if(t.id==='rBack'){S.rp.type=null;renderReport();return}
if(t.id==='rSend'){var ll=(S.rp.loc==='me'&&S.pos)?S.pos:[map.getCenter().lat,map.getCenter().lng],ty=TY[S.rp.type];
var r={id:Date.now(),type:S.rp.type,sev:S.rp.sev,lane:S.rp.lane,note:($('rNote').value||'').trim(),lat:ll[0],lng:ll[1],time:Date.now()};
reps.push(r);saveReps();renderRepMarkers();closeSheet();toast('تم نشر البلاغ: '+ty.t);speak('تم تسجيل البلاغ');if(S.rp.loc==='center')map.panTo(ll);S.rp=null}});
$('dkReport').onclick=openReport;
function renderReportList(){var ref=S.pos||[map.getCenter().lat,map.getCenter().lng];
var h='<div class="fc" id="rlf">';[['all','الكل'],['road','حركة المرور'],['surface','حالة الطريق']].forEach(function(f){h+='<button data-f="'+f[0]+'" class="'+(S.rfil===f[0]?'on':'')+'">'+f[1]+'</button>'});h+='</div>';
var arr=activeReps().filter(function(r){return S.rfil==='all'||TY[r.type].g===S.rfil}).map(function(r){return{r:r,d:hav(ref,[r.lat,r.lng])}}).sort(function(a,b){return a.d-b.d});
if(!arr.length)h+='<div class="empty">'+EMPTY+'<div>لا توجد بلاغات نشطة.<br>اضغط الزر الذهبي للإبلاغ عن شيء في الطريق.</div></div>';
arr.forEach(function(o){var r=o.r,t=TY[r.type],sv=SEV[r.sev||2];h+='<div class="item"><span class="em" style="background:'+t.c+'22">'+t.e+'</span><span class="nm"><b>'+t.t+'<span class="sv" style="background:'+sv[1]+'">'+sv[0]+'</span></b><small>'+ago(r.time)+' · '+fd(o.d)+(r.note?' · '+esc(r.note):'')+'</small></span><button class="sm" data-show="'+r.id+'">عرض</button><button class="sm del" data-rm="'+r.id+'">حذف</button></div>'});
$('rlBody').innerHTML=h}
$('rlBody').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;
if(b.hasAttribute('data-f')){S.rfil=b.getAttribute('data-f');renderReportList();return}
if(b.hasAttribute('data-show')){var r=reps.filter(function(x){return String(x.id)===b.getAttribute('data-show')})[0];if(r){closeSheet();map.flyTo([r.lat,r.lng],17)}return}
if(b.hasAttribute('data-rm')){reps=reps.filter(function(x){return String(x.id)!==b.getAttribute('data-rm')});saveReps();renderRepMarkers();renderReportList()}});
$('dkReps').onclick=function(){renderReportList();openSheet('sReports')};

/* ---------- hospitals + police ---------- */
var poiLayer=L.layerGroup().addTo(map),poiTimer;
var PT={hospital:['مستشفى','🏥','#D64545'],police:['مركز شرطة','🚓','#2B5FD6']};
var OVP=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
function ovp(q,i){return fetch(OVP[i]+'?data='+encodeURIComponent(q)).then(function(r){return r.json()}).catch(function(e){if(i+1<OVP.length)return ovp(q,i+1);throw e})}
function loadPoi(){var types=Object.keys(S.poi).filter(function(k){return S.poi[k]});
if(!types.length){poiLayer.clearLayers();return}
if(map.getZoom()<12){toast('قرّب الخريطة أكثر لعرض الخدمات');return}
var b=map.getBounds(),bb=[b.getSouth(),b.getWest(),b.getNorth(),b.getEast()].join(',');
var q='[out:json][timeout:25];('+types.map(function(t){return'nwr["amenity"="'+t+'"]('+bb+');'}).join('')+');out center 80;',tok=++S.poiTok;
ovp(q,0).then(function(d){if(tok!==S.poiTok)return;poiLayer.clearLayers();var n=0;
(d.elements||[]).forEach(function(el){var ll=el.lat?[el.lat,el.lon]:(el.center?[el.center.lat,el.center.lon]:null);if(!ll)return;
var ty=el.tags&&el.tags.amenity;if(!PT[ty])return;n++;var nm=el.tags['name:ar']||el.tags.name||PT[ty][0];
var ic=L.divIcon({html:'<div class="mk" style="border-color:'+PT[ty][2]+'">'+PT[ty][1]+'</div>',className:'',iconSize:[36,36],iconAnchor:[18,18]});
var box=document.createElement('div');box.className='pop';box.innerHTML='<b>'+esc(nm)+'</b><br><small>'+PT[ty][0]+'</small><br><button>اذهب إلى هنا</button>';
box.querySelector('button').onclick=function(){map.closePopup();setDest(ll,nm)};
L.marker(ll,{icon:ic}).addTo(poiLayer).bindPopup(box)});
if(!n)toast('لا توجد نتائج في هذه المنطقة. جرّب تحريك الخريطة.')}).catch(function(){toast('تعذّر تحميل الخدمات. تحقق من الاتصال.')})}
document.querySelectorAll('[data-poi]').forEach(function(c){c.onclick=function(){var k=c.getAttribute('data-poi');S.poi[k]=!S.poi[k];c.classList.toggle('on',S.poi[k]);loadPoi()}});
map.on('moveend',function(){if(S.poi.hospital||S.poi.police){clearTimeout(poiTimer);poiTimer=setTimeout(loadPoi,900)}});

/* ---------- location + speed ---------- */
function carIcon(){return L.divIcon({className:'',html:'<div class="car"><i class="pulse"></i><svg viewBox="0 0 40 40"><rect x="11" y="3" width="18" height="34" rx="9" fill="#13A3A8" stroke="#fff" stroke-width="2.5"/><rect x="14" y="10" width="12" height="7" rx="2.5" fill="#fff" opacity=".92"/><rect x="14" y="25" width="12" height="5" rx="2" fill="#0b6d71"/></svg></div>',iconSize:[44,44],iconAnchor:[22,22]})}
function setHeading(h){S.head=h;if(S.me&&S.me._icon){var s=S.me._icon.querySelector('svg');if(s)s.style.transform='rotate('+Math.round(h)+'deg)'}}
function startWatch(){if(S.watch!==null)return;if(!navigator.geolocation){toast('المتصفح لا يدعم تحديد الموقع');return}
S.watch=navigator.geolocation.watchPosition(onPos,function(err){if(err&&err.code===1){S.watch=null;if(!S.denied){S.denied=true;toast('تم رفض إذن الموقع. اسمح للموقع باستخدام موقعك من إعدادات المتصفح.')}}else if(!S.pos&&!S.warnedLoc){S.warnedLoc=true;toast('تعذّر تحديد موقعك. تأكد من تشغيل GPS.')}},{enableHighAccuracy:true,maximumAge:1000,timeout:25000})}
function onPos(p){S.denied=false;var ll=[p.coords.latitude,p.coords.longitude],now=Date.now(),k=null,h=null;
if(typeof p.coords.speed==='number'&&!isNaN(p.coords.speed))k=p.coords.speed*3.6;else if(S.last){var dt=(now-S.last.t)/1000;if(dt>0.5)k=hav(S.last.ll,ll)/dt*3.6}
if(typeof p.coords.heading==='number'&&!isNaN(p.coords.heading)&&k>3)h=p.coords.heading;else if(S.last&&hav(S.last.ll,ll)>8)h=bearing(S.last.ll,ll);
S.last={ll:ll,t:now};S.pos=ll;if(k!==null)$('spd').textContent=num(Math.round(k<3?0:k));$('speed').hidden=false;
if(S.me)S.me.setLatLng(ll);else S.me=L.marker(ll,{icon:carIcon(),zIndexOffset:1000,interactive:false}).addTo(map);
if(h!==null)setHeading(h);
if(S.fly){S.fly=false;map.flyTo(ll,16)}if(S.nav)navTick()}
$('locate').onclick=function(){S.follow=true;S.denied=false;startWatch();if(S.pos)map.flyTo(S.pos,S.nav?17:16);else{S.fly=true;toast('جارٍ تحديد موقعك…')}};
map.on('dragstart',function(){S.follow=false});
document.addEventListener('visibilitychange',function(){if(!document.hidden&&S.nav)getWake()});
function getWake(){try{if(navigator.wakeLock)navigator.wakeLock.request('screen').then(function(w){S.wake=w}).catch(function(){})}catch(e){}}

/* ---------- destination + routes ---------- */
var CAR='https://routing.openstreetmap.de/routed-car/route/v1/driving/',FOOT='https://routing.openstreetmap.de/routed-foot/route/v1/driving/',OSRM='https://router.project-osrm.org/route/v1/driving/';
function setDest(ll,name){if(S.nav)return;clearRoute();S.dest={ll:ll,name:name||'الوجهة'};S.dm=L.marker(ll).addTo(map);map.flyTo(ll,15);card('dest')}
function clearRoute(){if(S.rg){map.removeLayer(S.rg);S.rg=null}if(S.dm){map.removeLayer(S.dm);S.dm=null}S.route=null;S.routes={car:[],foot:[]};S.coords=[];S.steps=[];S.ri=0}
function fetchRoutes(base,a,b){return fetch(base+a[1]+','+a[0]+';'+b[1]+','+b[0]+'?overview=full&geometries=geojson&steps=true&alternatives=true').then(function(r){return r.json()}).then(function(d){if(d.code!=='Ok'||!d.routes.length)throw new Error('x');return d.routes.slice(0,3)})}
function getRoutes(a,b,mode){if(mode==='foot')return fetchRoutes(FOOT,a,b);return fetchRoutes(CAR,a,b).catch(function(){return fetchRoutes(OSRM,a,b)})}
function toLL(r){return r._ll||(r._ll=r.geometry.coordinates.map(function(c){return[c[1],c[0]]}))}
function drawRoutes(fit){if(S.rg)map.removeLayer(S.rg);var g=L.layerGroup(),list=S.routes[S.mode];if(!list.length)return;if(S.ri>=list.length)S.ri=0;
list.forEach(function(r,i){if(i===S.ri)return;var pl=L.polyline(toLL(r),{color:'#7b8a99',weight:8,opacity:.8,lineCap:'round'});pl.on('click',function(e){L.DomEvent.stopPropagation(e);S.ri=i;drawRoutes(false);card('route')});pl.addTo(g)});
var sel=list[S.ri],c=toLL(sel);S.route=sel;S.coords=c;S.steps=sel.legs[0].steps;S.next=1;S.ann={};
L.polyline(c,{color:'#fff',weight:12,opacity:.95,lineCap:'round',interactive:false}).addTo(g);
L.polyline(c,{color:'#13A3A8',weight:7,lineCap:'round',interactive:false}).addTo(g);
L.polyline(c,{color:'#fff',weight:2.5,opacity:.95,className:'flow',interactive:false}).addTo(g);
S.rg=g.addTo(map);if(fit)map.fitBounds(L.polyline(c).getBounds(),{paddingTopLeft:[40,150],paddingBottomRight:[40,260]})}
function requestRoute(){if(!S.dest||S.busy)return;if(!S.pos){startWatch();toast('جارٍ تحديد موقعك أولاً… اضغط «عرض المسار» بعد لحظات');return}
S.busy=true;toast('جارٍ حساب المسار…');
Promise.all([getRoutes(S.pos,S.dest.ll,'car').catch(function(){return[]}),getRoutes(S.pos,S.dest.ll,'foot').catch(function(){return[]})]).then(function(rs){
S.busy=false;if(!rs[0].length&&!rs[1].length){toast('تعذّر حساب المسار. تحقق من الاتصال ثم أعد المحاولة.');return}
S.routes={car:rs[0],foot:rs[1]};S.mode=rs[0].length?'car':'foot';S.ri=0;drawRoutes(true);card('route')},function(){S.busy=false;toast('تعذّر حساب المسار.')})}

/* ---------- Arabic instructions ---------- */
var DIR={'left':'يسارًا','right':'يمينًا','slight left':'قليلًا يسارًا','slight right':'قليلًا يمينًا','sharp left':'بحدة يسارًا','sharp right':'بحدة يمينًا'};
var ARW={'left':'↰','right':'↱','slight left':'↖','slight right':'↗','sharp left':'↰','sharp right':'↱','straight':'↑','uturn':'↶'};
function nm(s){var n=s.name||s.ref;return n?' إلى '+n:''}
function instr(s){var m=s.maneuver,t=m.type,d=m.modifier;
if(t==='arrive')return'وصلت إلى وجهتك';
if(t==='depart')return'انطلق'+(s.name?' على '+s.name:'');
if(d==='uturn')return'استدر للخلف';
if(t==='roundabout'||t==='rotary'||t==='roundabout turn'||t==='exit roundabout'||t==='exit rotary')return'ادخل الدوار'+(m.exit?' وخذ المخرج رقم '+m.exit:'');
if(t==='fork')return'عند التفرع خذ '+(d&&d.indexOf('left')>-1?'اليسار':'اليمين');
if(t==='merge')return'اندمج مع الطريق'+nm(s);
if(t==='on ramp'||t==='off ramp')return'اسلك المنحدر '+(DIR[d]||'للأمام');
if(!d||d==='straight'||t==='continue')return'تابع للأمام'+nm(s);
return'انعطف '+(DIR[d]||'')+nm(s)}
function arrow(s){var m=s.maneuver;if(m.type==='arrive')return'⚑';if(m.type.indexOf('round')>-1||m.type==='rotary')return'⟳';return ARW[m.modifier]||'↑'}
function loc(i){var c=S.steps[i].maneuver.location;return[c[1],c[0]]}
function distToCoords(p,coords){var m=1e9,k=111320,cl=Math.cos(p[0]*Math.PI/180),i,a,b,ax,ay,bx,by,dx,dy,l,t;
for(i=0;i<coords.length-1;i++){a=coords[i];b=coords[i+1];ax=(a[1]-p[1])*k*cl;ay=(a[0]-p[0])*k;bx=(b[1]-p[1])*k*cl;by=(b[0]-p[0])*k;dx=bx-ax;dy=by-ay;l=dx*dx+dy*dy;t=l?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/l)):0;m=Math.min(m,Math.hypot(ax+t*dx,ay+t*dy))}return m}
function routeWarn(){var out=[];activeReps().forEach(function(r){if(distToCoords([r.lat,r.lng],S.coords)<60&&out.indexOf(TY[r.type].t)<0)out.push(TY[r.type].t)});return out}

/* ---------- cards ---------- */
function tabHTML(m,label){var l=S.routes[m],r=l[0];return'<button class="tab'+(S.mode===m?' on':'')+'" data-m="'+m+'"'+(r?'':' disabled')+'><b>'+label+'</b><span>'+(r?ft(r.duration)+' · '+fd(r.distance):'غير متاح')+'</span></button>'}
function cancelDest(){clearRoute();S.dest=null;card(null)}
function card(mode){var c=$('card');if(!mode){c.hidden=true;c.innerHTML='';return}c.hidden=false;
if(mode==='dest'){c.innerHTML='<div class="t">'+esc(S.dest.name)+'</div><div class="row"><button class="btn go" id="cGo">عرض المسار</button><button class="btn alt2" id="cFav">♡ حفظ</button><button class="btn ghost" id="cX">إلغاء</button></div>';
$('cGo').onclick=requestRoute;$('cFav').onclick=function(){openAdd(S.dest.ll,S.dest.name)};$('cX').onclick=cancelDest;return}
if(mode==='route'){var list=S.routes[S.mode],w=routeWarn(),h='<div class="t">'+esc(S.dest.name)+'</div><div class="tabs">'+tabHTML('car','بالسيارة')+tabHTML('foot','سيرًا')+'</div>';
if(list.length>1){h+='<div class="alts">';list.forEach(function(r,i){h+='<button class="alt'+(i===S.ri?' on':'')+'" data-i="'+i+'">'+(i===0?'الأسرع':'بديل '+num(i))+' · '+ft(r.duration)+' · '+fd(r.distance)+'</button>'});h+='</div>'}
if(w.length)h+='<div class="warn">⚠️ على هذا المسار: '+w.map(esc).join('، ')+'</div>';
h+='<div class="row"><button class="btn go" id="cGo">ابدأ التنقل</button><button class="btn alt2" id="cFav">♡ حفظ</button><button class="btn ghost" id="cX">إلغاء</button></div>';c.innerHTML=h;
c.querySelectorAll('.tab').forEach(function(b){b.onclick=function(){S.mode=b.getAttribute('data-m');S.ri=0;drawRoutes(true);card('route')}});
c.querySelectorAll('.alt').forEach(function(b){b.onclick=function(){S.ri=+b.getAttribute('data-i');drawRoutes(false);card('route')}});
$('cGo').onclick=startNav;$('cFav').onclick=function(){openAdd(S.dest.ll,S.dest.name)};$('cX').onclick=cancelDest;return}
if(mode==='nav'){c.innerHTML='<div class="t" id="nRem"></div><div class="s" id="nEta"></div><div class="row"><button class="btn alt2" id="cRep">⚠️ بلاغ</button><button class="btn alt2" id="cMute">'+(ST.voice?'🔊':'🔇')+'</button><button class="btn red" id="cEnd" style="flex:1">إنهاء التنقل</button></div>';
$('cEnd').onclick=function(){endNav(false)};$('cRep').onclick=openReport;$('cMute').onclick=function(){ST.voice=!ST.voice;saveST();paintVoice();$('cMute').textContent=ST.voice?'🔊':'🔇';if(!ST.voice){try{speechSynthesis.cancel()}catch(e){}}};return}
if(mode==='arrived'){var tr=S.trip||{};c.innerHTML='<div class="t">🎉 وصلت بسلامة!</div><div class="s">'+esc(tr.name||'')+(tr.d?' · '+fd(tr.d)+' · '+ft(tr.s):'')+'</div><div class="row"><button class="btn go" id="cOk">تم</button></div>';$('cOk').onclick=function(){card(null)}}}
function confetti(){var cols=['#13A3A8','#E3A62B','#D6537A','#8E5BD8','#2B8CD6'];for(var i=0;i<46;i++){var d=document.createElement('i');d.className='cf';d.style.left=Math.random()*100+'vw';d.style.background=cols[i%cols.length];d.style.animationDelay=(Math.random()*.8)+'s';d.style.animationDuration=(2.2+Math.random()*1.6)+'s';document.body.appendChild(d);(function(el){setTimeout(function(){el.remove()},4500)})(d)}}

/* ---------- navigation ---------- */
function P(){return S.mode==='foot'?{rad:15,far:120,near:30,arr:20,off:40,rep:80}:{rad:25,far:400,near:60,arr:30,off:70,rep:350}}
function startNav(){if(!S.route||!S.pos)return;S.nav=true;S.follow=true;S.alerted={};document.body.classList.add('nav');$('banner').hidden=false;S.trip={name:S.dest.name,d:S.route.distance,s:S.route.duration,t0:Date.now()};card('nav');
speak('بدأ المسار '+(S.mode==='foot'?'سيرًا':'بالسيارة')+'. المسافة '+vd(S.route.distance));getWake();map.setView(S.pos,17);navTick()}
function endNav(arrived){var tr=S.trip;S.nav=false;document.body.classList.remove('nav');$('banner').hidden=true;if(!arrived){try{speechSynthesis.cancel()}catch(e){}}
if(S.wake){try{S.wake.release()}catch(e){}S.wake=null}clearRoute();S.dest=null;S.alerted={};card(null);
if(arrived){card('arrived');confetti()}}
function navTick(){if(!S.nav||!S.route)return;var pos=S.pos,q=P(),L1=S.steps.length-1,i;
while(S.next<L1&&hav(pos,loc(S.next))<q.rad)S.next++;
var st=S.steps[S.next],d=hav(pos,loc(S.next)),txt=instr(st);
$('bArrow').textContent=arrow(st);$('bText').textContent=txt;$('bDist').textContent='بعد '+fd(d);
if(S.next===L1&&d<q.arr){speak('وصلت إلى وجهتك. نتمنى لك يومًا سعيدًا');toast('وصلت إلى وجهتك');endNav(true);return}
var key=S.next;
if(d<=q.near&&!S.ann[key+'b']){S.ann[key+'a']=S.ann[key+'b']=1;speak(txt)}else if(d<=q.far&&!S.ann[key+'a']){S.ann[key+'a']=1;speak('بعد '+vd(d)+'، '+txt)}
var rem=d;for(i=S.next;i<S.steps.length;i++)rem+=S.steps[i].distance;
var sec=rem*(S.route.duration/Math.max(1,S.route.distance));
if($('nRem')){$('nRem').textContent=fd(rem)+' · '+ft(sec);$('nEta').textContent='الوصول '+eta(sec)+' إلى '+S.dest.name}
activeReps().forEach(function(r){var ll=[r.lat,r.lng],dd=hav(pos,ll);if(!S.alerted[r.id]&&dd<q.rep&&distToCoords(ll,S.coords)<60){S.alerted[r.id]=1;var t=TY[r.type];speak('انتبه، '+t.t+((r.sev||2)===3?' شديد':'')+' بعد '+vd(dd));toast('انتبه: '+t.t+' قدامك')}});
if(S.follow)map.panTo(pos,{animate:true});
if(distToCoords(pos,S.coords)>q.off&&Date.now()-S.reroute>15000){S.reroute=Date.now();speak('جارٍ إعادة حساب المسار');
getRoutes(pos,S.dest.ll,S.mode).then(function(rs){if(!S.nav)return;S.routes[S.mode]=rs;S.ri=0;drawRoutes(false)}).catch(function(){})}}

/* ---------- tap on map ---------- */
map.on('click',function(e){if(S.sheet||S.nav)return;var ll=[e.latlng.lat,e.latlng.lng],box=document.createElement('div');box.className='pop';
box.innerHTML='<b>هذا المكان</b><br><button data-a="go">اذهب إلى هنا</button><button class="s" data-a="save">♡ حفظ</button>';
box.querySelector('[data-a=go]').onclick=function(){map.closePopup();setDest(ll,'الوجهة المحددة')};
box.querySelector('[data-a=save]').onclick=function(){map.closePopup();openAdd(ll,'')};
L.popup({autoPanPaddingTopLeft:[10,150]}).setLatLng(e.latlng).setContent(box).openOn(map)});

/* ---------- search ---------- */
$('q').addEventListener('input',function(){$('qx').hidden=!$('q').value});
$('qx').onclick=function(){$('q').value='';$('qx').hidden=true;$('q').focus()};
function shortName(s){return String(s).split('،').slice(0,2).join('،')}
$('searchForm').addEventListener('submit',function(e){e.preventDefault();var q=$('q').value.trim();if(!q)return;$('q').blur();toast('جارٍ البحث…');
var vb=S.pos?'&viewbox='+(S.pos[1]-1)+','+(S.pos[0]+1)+','+(S.pos[1]+1)+','+(S.pos[0]-1):'';
fetch('https://nominatim.openstreetmap.org/search?format=json&limit=6&accept-language=ar'+vb+'&q='+encodeURIComponent(q)).then(function(r){return r.json()}).then(function(res){
$('toast').hidden=true;if(!res.length){toast('لم يتم العثور على نتائج. جرّب كتابة اسم آخر.');return}
if(res.length===1){setDest([parseFloat(res[0].lat),parseFloat(res[0].lon)],shortName(res[0].display_name));return}
var h='';res.forEach(function(r,i){h+='<div class="item"><span class="em" style="background:#e7f6f6">📍</span><span class="nm"><b>'+esc(shortName(r.display_name))+'</b><small>'+esc(String(r.display_name).split('،').slice(2,4).join('،'))+'</small></span><button class="sm" data-i="'+i+'">اذهب</button></div>'});
$('rBody').innerHTML=h;$('rBody').onclick=function(ev){var b=ev.target.closest('[data-i]');if(!b)return;var r=res[+b.getAttribute('data-i')];closeSheet();setDest([parseFloat(r.lat),parseFloat(r.lon)],shortName(r.display_name))};openSheet('sResults')})
.catch(function(){toast('تعذّر البحث. تحقق من الاتصال بالإنترنت.')})});

/* ---------- settings ---------- */
function renderSettings(){var vs=arVoices(),o='<option value="">تلقائي (الأفضل)</option>'+vs.map(function(v){return'<option value="'+esc(v.name)+'"'+(v.name===ST.vname?' selected':'')+'>'+esc(v.name)+'</option>'}).join('');
$('setBody').innerHTML='<label class="r">تشغيل الصوت<input type="checkbox" id="sVoice"'+(ST.voice?' checked':'')+'></label>'+
'<label class="r">الصوت<select id="sName">'+o+'</select></label>'+
(vs.length?'':'<div class="hint">لا يوجد صوت عربي على جوالك. ثبّت «Speech Services by Google» ونزّل اللغة العربية من إعدادات تحويل النص إلى كلام.</div>')+
'<label class="r">سرعة الكلام<input type="range" id="sRate" min="0.7" max="1.3" step="0.05" value="'+ST.rate+'"></label>'+
'<label class="r">درجة الصوت<input type="range" id="sPitch" min="0.7" max="1.3" step="0.05" value="'+ST.pitch+'"></label>'+
'<label class="r">مستوى الصوت<input type="range" id="sVol" min="0.3" max="1" step="0.1" value="'+ST.vol+'"></label>'+
'<div class="row"><button class="btn go" id="sTest">🔊 جرّب الصوت</button></div>'+
'<div class="row"><button class="btn red" id="sClr" style="flex:1">حذف كل البلاغات</button></div>'}
$('setBody').addEventListener('input',function(e){var t=e.target;if(t.id==='sRate')ST.rate=+t.value;if(t.id==='sPitch')ST.pitch=+t.value;if(t.id==='sVol')ST.vol=+t.value;saveST()});
$('setBody').addEventListener('change',function(e){var t=e.target;if(t.id==='sVoice'){ST.voice=t.checked;paintVoice()}if(t.id==='sName')ST.vname=t.value;saveST()});
$('setBody').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;
if(b.id==='sTest')speak('مرحبًا، أنا مرشدك الصوتي. بعد ثلاثمئة متر، انعطف يمينًا',true);
if(b.id==='sClr'){reps=[];saveReps();renderRepMarkers();toast('تم حذف كل البلاغات')}});
$('dkSet').onclick=function(){renderSettings();openSheet('sSet')};

/* ---------- splash ---------- */
function closeSplash(){var s=$('splash');if(!s||s.classList.contains('out'))return;s.classList.add('out');unlockSpeech();setTimeout(function(){if(s.parentNode)s.parentNode.removeChild(s)},600)}
$('sBtn').onclick=closeSplash;setTimeout(closeSplash,4000);
})();

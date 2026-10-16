/* weather.js - فئة الطقس لتطبيق خريطتي
   يعتمد على Open-Meteo (طقس + جودة هواء + غبار) و RainViewer (رادار المطر)
   يوضع قبل app.js في index.html */
(function () {
  'use strict';

  /* يلتقط كائن الخريطة بدون تعديل app.js */
  if (window.L && L.Map && L.Map.addInitHook) {
    L.Map.addInitHook(function () { window.MYMAP = this; });
  }

  var KEY_PLACE = 'my-map-wx-place', KEY_CACHE = 'my-map-wx-cache';
  var AR = '٠١٢٣٤٥٦٧٨٩';
  function num(x) { return String(x).replace(/\d/g, function (d) { return AR[d]; }).replace('.', '٫'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lj(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function sj(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function r0(x) { return num(Math.round(x)); }

  var WC = {
    0: ['صافٍ', '☀️'], 1: ['صافٍ غالبًا', '🌤️'], 2: ['غائم جزئيًا', '⛅'], 3: ['غائم', '☁️'],
    45: ['ضباب', '🌫️'], 48: ['ضباب متجمد', '🌫️'],
    51: ['رذاذ خفيف', '🌦️'], 53: ['رذاذ', '🌦️'], 55: ['رذاذ كثيف', '🌧️'], 56: ['رذاذ متجمد', '🌧️'], 57: ['رذاذ متجمد', '🌧️'],
    61: ['مطر خفيف', '🌧️'], 63: ['مطر', '🌧️'], 65: ['مطر غزير', '🌧️'], 66: ['مطر متجمد', '🌧️'], 67: ['مطر متجمد', '🌧️'],
    71: ['ثلج خفيف', '🌨️'], 73: ['ثلج', '🌨️'], 75: ['ثلج كثيف', '❄️'], 77: ['حبيبات ثلج', '🌨️'],
    80: ['زخات مطر', '🌦️'], 81: ['زخات مطر', '🌧️'], 82: ['زخات غزيرة', '⛈️'],
    85: ['زخات ثلج', '🌨️'], 86: ['زخات ثلج', '🌨️'],
    95: ['عاصفة رعدية', '⛈️'], 96: ['عاصفة رعدية مع برد', '⛈️'], 99: ['عاصفة رعدية مع برد', '⛈️']
  };
  function wc(code, isDay) {
    var w = WC[code] || ['—', '🌡️'];
    return { t: w[0], e: (isDay === 0 && code <= 1) ? '🌙' : w[1] };
  }
  function hm(t) { // "2026-10-16T06:12" -> "٦:١٢ ص"
    var h = parseInt(t.slice(11, 13), 10), m = t.slice(14, 16), s = h < 12 ? 'ص' : 'م', h12 = h % 12 || 12;
    return num(h12) + ':' + num(m) + ' ' + s;
  }
  function hl(t) { var h = parseInt(t.slice(11, 13), 10); return num(h % 12 || 12) + (h < 12 ? ' ص' : ' م'); }
  function dayName(t, i) {
    if (i === 0) return 'اليوم';
    if (i === 1) return 'غدًا';
    try { return new Date(t + 'T12:00:00').toLocaleDateString('ar', { weekday: 'long' }); } catch (e) { return t; }
  }
  function aqiLabel(v) {
    if (v == null) return ['—', '#8795A3'];
    if (v <= 50) return ['جيدة', '#2E9E5B'];
    if (v <= 100) return ['متوسطة', '#E3A62B'];
    if (v <= 150) return ['غير صحية للحساسين', '#E3752B'];
    if (v <= 200) return ['غير صحية', '#D64545'];
    return ['سيئة جدًا', '#8E2BD6'];
  }

  /* ---------- CSS ---------- */
  var css = '' +
    '#wxFab{position:fixed;right:12px;top:46%;z-index:1200;width:54px;height:54px;border-radius:50%;border:0;background:#fff;box-shadow:0 4px 14px rgba(0,0,0,.28);font-size:24px;line-height:1;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0}' +
    '#wxFab small{font-size:9px;color:#14213D;font-weight:700;margin-top:1px}' +
    'body.nav #wxFab{display:none}' +
    '#wxRc{position:fixed;left:50%;transform:translateX(-50%);bottom:120px;z-index:1200;background:#14213D;color:#fff;border:0;border-radius:22px;padding:10px 18px;font-weight:700;box-shadow:0 4px 14px rgba(0,0,0,.3);cursor:pointer}' +
    '#wxToast{position:fixed;left:50%;transform:translateX(-50%);bottom:90px;z-index:3100;background:#14213D;color:#fff;padding:10px 16px;border-radius:14px;max-width:86%;text-align:center;font-size:14px}' +
    '#wxp{position:fixed;top:0;right:0;bottom:0;left:0;z-index:3000;background:#eef3f6;color:#14213D;overflow-y:auto;direction:rtl;-webkit-overflow-scrolling:touch}' +
    '#wxp[hidden],#wxToast[hidden]{display:none}' +
    '.wx-h{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:10px;padding:14px;background:linear-gradient(135deg,#14213D,#13A3A8);color:#fff}' +
    '.wx-h b{flex:1;font-size:18px}' +
    '.wx-h button{border:0;background:rgba(255,255,255,.18);color:#fff;border-radius:12px;width:40px;height:40px;font-size:18px;cursor:pointer}' +
    '.wx-s{display:flex;gap:8px;padding:12px 14px 0}' +
    '.wx-s input{flex:1;border:1px solid #cfd8de;border-radius:12px;padding:11px 12px;font-size:15px;background:#fff;color:#14213D;min-width:0}' +
    '.wx-s button{border:0;border-radius:12px;background:#13A3A8;color:#fff;padding:0 16px;font-weight:700;cursor:pointer}' +
    '#wxRes{padding:0 14px}' +
    '.wx-r{display:flex;justify-content:space-between;align-items:center;background:#fff;border-radius:12px;padding:11px 12px;margin-top:8px;cursor:pointer;gap:8px}' +
    '.wx-r small{color:#6b7a88}' +
    '.wx-c{background:#fff;border-radius:18px;margin:12px 14px;padding:14px;box-shadow:0 2px 8px rgba(20,33,61,.07)}' +
    '.wx-now{text-align:center;background:linear-gradient(160deg,#13A3A8,#14213D);color:#fff;border-radius:20px;margin:12px 14px;padding:18px 14px}' +
    '.wx-pl{font-size:17px;font-weight:700}' +
    '.wx-big{display:flex;justify-content:center;align-items:center;gap:12px;margin:6px 0}' +
    '.wx-big span{font-size:56px}.wx-big b{font-size:60px;font-weight:700}' +
    '.wx-d{opacity:.92;margin-top:3px}' +
    '.wx-w{background:#fff3e0;border-right:5px solid #E3752B;border-radius:12px;margin:8px 14px;padding:10px 12px;font-weight:600}' +
    '.wx-g{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
    '.wx-g div{background:#f4f8fa;border-radius:12px;padding:10px}' +
    '.wx-g small{display:block;color:#6b7a88;margin-bottom:3px}' +
    '.wx-hr{display:flex;gap:10px;overflow-x:auto;padding-bottom:4px}' +
    '.wx-hr div{flex:0 0 auto;min-width:58px;text-align:center;background:#f4f8fa;border-radius:12px;padding:8px 6px}' +
    '.wx-hr i{display:block;font-style:normal;font-size:22px;margin:3px 0}' +
    '.wx-hr small{color:#2B8CD6;display:block}' +
    '.wx-dy{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #eef3f6}' +
    '.wx-dy:last-child{border:0}.wx-dy i{font-style:normal;font-size:24px}.wx-dy span{flex:1;font-weight:600}.wx-dy small{color:#2B8CD6}' +
    '.wx-c h3{margin:0 0 10px;font-size:15px;color:#13787d}' +
    '.wx-b{display:block;width:calc(100% - 28px);margin:6px 14px 20px;border:0;border-radius:14px;background:#14213D;color:#fff;padding:14px;font-size:16px;font-weight:700;cursor:pointer}' +
    '.wx-n{text-align:center;color:#6b7a88;font-size:12px;padding:0 14px 24px}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---------- state ---------- */
  var place = lj(KEY_PLACE, null), panel, body, resBox, fab, toastEl, tt;
  var radarLayer = null, radarChip = null, results = [], busy = false;

  function toast(m) {
    toastEl.textContent = m; toastEl.hidden = false;
    clearTimeout(tt); tt = setTimeout(function () { toastEl.hidden = true; }, 3200);
  }

  /* ---------- data ---------- */
  function getJSON(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); }); }
  function fetchAll(p) {
    var q = 'latitude=' + p.lat + '&longitude=' + p.lng;
    var f = getJSON('https://api.open-meteo.com/v1/forecast?' + q +
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_gusts_10m' +
      '&hourly=temperature_2m,precipitation_probability,weather_code,is_day' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset,uv_index_max' +
      '&timezone=auto&forecast_days=7&wind_speed_unit=kmh');
    var a = getJSON('https://air-quality-api.open-meteo.com/v1/air-quality?' + q + '&current=us_aqi,pm10,dust&timezone=auto').catch(function () { return null; });
    return Promise.all([f, a]);
  }

  function warnings(w, a) {
    var c = w.current, o = [], code = c.weather_code, g = c.wind_gusts_10m || 0;
    if (g >= 60) o.push('رياح قوية جدًا: هبّات حتى ' + r0(g) + ' كم/س');
    else if (g >= 40) o.push('رياح نشطة: هبّات حتى ' + r0(g) + ' كم/س');
    if (c.temperature_2m >= 45) o.push('حرارة شديدة جدًا، تجنّب الخروج وقت الظهيرة');
    else if (c.temperature_2m >= 40) o.push('حرارة مرتفعة، اشرب ماءً كثيرًا');
    if (c.temperature_2m <= 0) o.push('درجات حرارة دون الصفر، احذر الصقيع');
    if (code >= 95) o.push('عاصفة رعدية');
    if (code === 45 || code === 48) o.push('ضباب: خفّف السرعة وشغّل الأضواء');
    var dust = a && a.current ? a.current.dust : null;
    if (dust != null && dust >= 200) o.push('غبار كثيف جدًا: الرؤية ضعيفة');
    else if (dust != null && dust >= 100) o.push('غبار متوسط إلى كثيف');
    var h = w.hourly, i0 = startIdx(w), mx = 0, k;
    for (k = i0; k < i0 + 6 && k < h.time.length; k++) mx = Math.max(mx, h.precipitation_probability[k] || 0);
    if (mx >= 70) o.push('احتمال مطر مرتفع خلال الساعات القادمة (' + num(mx) + '٪)');
    return o;
  }
  function startIdx(w) {
    var now = (w.current.time || '').slice(0, 13) + ':00', t = w.hourly.time, i;
    for (i = 0; i < t.length; i++) if (t[i] >= now) return i;
    return 0;
  }

  /* ---------- render ---------- */
  function render(w, a, p, stamp) {
    var c = w.current, h = w.hourly, d = w.daily, cw = wc(c.weather_code, c.is_day), html = '', i;
    html += '<div class="wx-now"><div class="wx-pl">📍 ' + esc(p.name) + '</div>' +
      '<div class="wx-big"><span>' + cw.e + '</span><b>' + r0(c.temperature_2m) + '°</b></div>' +
      '<div class="wx-d">' + cw.t + ' · تبدو كأنها ' + r0(c.apparent_temperature) + '°</div>' +
      '<div class="wx-d">⬆ ' + r0(d.temperature_2m_max[0]) + '°  ⬇ ' + r0(d.temperature_2m_min[0]) + '°</div></div>';

    warnings(w, a).forEach(function (m) { html += '<div class="wx-w">⚠️ ' + esc(m) + '</div>'; });

    var aq = a && a.current ? a.current : null, al = aqiLabel(aq ? aq.us_aqi : null);
    html += '<div class="wx-c"><div class="wx-g">' +
      '<div><small>الرطوبة</small><b>' + r0(c.relative_humidity_2m) + '٪</b></div>' +
      '<div><small>الرياح</small><b>' + r0(c.wind_speed_10m) + ' كم/س</b></div>' +
      '<div><small>هبّات الرياح</small><b>' + r0(c.wind_gusts_10m || 0) + ' كم/س</b></div>' +
      '<div><small>الأمطار الآن</small><b>' + num(c.precipitation || 0) + ' ملم</b></div>' +
      '<div><small>الغبار</small><b>' + (aq && aq.dust != null ? num(Math.round(aq.dust)) + ' µg' : '—') + '</b></div>' +
      '<div><small>جودة الهواء</small><b style="color:' + al[1] + '">' + al[0] + '</b></div>' +
      '<div><small>الأشعة فوق البنفسجية</small><b>' + r0(d.uv_index_max[0] || 0) + '</b></div>' +
      '<div><small>الشروق / الغروب</small><b style="font-size:13px">' + hm(d.sunrise[0]) + ' / ' + hm(d.sunset[0]) + '</b></div>' +
      '</div></div>';

    var s = startIdx(w);
    html += '<div class="wx-c"><h3>الساعات القادمة</h3><div class="wx-hr">';
    for (i = s; i < s + 24 && i < h.time.length; i++) {
      var hw = wc(h.weather_code[i], h.is_day[i]);
      html += '<div><small style="color:#6b7a88">' + (i === s ? 'الآن' : hl(h.time[i])) + '</small><i>' + hw.e + '</i><b>' + r0(h.temperature_2m[i]) + '°</b>' +
        '<small>' + (h.precipitation_probability[i] ? '💧' + num(h.precipitation_probability[i]) + '٪' : '&nbsp;') + '</small></div>';
    }
    html += '</div></div>';

    html += '<div class="wx-c"><h3>الأيام القادمة</h3>';
    for (i = 0; i < d.time.length; i++) {
      var dw = wc(d.weather_code[i], 1);
      html += '<div class="wx-dy"><i>' + dw.e + '</i><span>' + esc(dayName(d.time[i], i)) + '</span>' +
        '<small>' + (d.precipitation_sum[i] > 0.1 ? '💧' + num(d.precipitation_sum[i].toFixed(1)) + ' ملم' : '') + '</small>' +
        '<b>' + r0(d.temperature_2m_max[i]) + '°</b><span style="flex:0;color:#6b7a88;font-weight:400">' + r0(d.temperature_2m_min[i]) + '°</span></div>';
    }
    html += '</div>';

    html += '<button class="wx-b" id="wxRadar">🌧️ عرض رادار المطر على الخريطة</button>' +
      '<div class="wx-n">' + (stamp || '') + '<br>المصدر: Open-Meteo و RainViewer</div>';
    body.innerHTML = html;
  }

  function load(force) {
    if (!place) { body.innerHTML = '<div class="wx-c" style="text-align:center">اضغط 📍 لتحديد موقعك، أو ابحث عن مدينة.</div>'; return; }
    var cache = lj(KEY_CACHE, null), ck = place.lat.toFixed(2) + ',' + place.lng.toFixed(2);
    if (!force && cache && cache.key === ck && Date.now() - cache.time < 600000) {
      render(cache.w, cache.a, place, 'تم التحديث قبل قليل');
      return;
    }
    if (busy) return;
    busy = true;
    body.innerHTML = '<div class="wx-c" style="text-align:center">جارٍ تحميل الطقس…</div>';
    fetchAll(place).then(function (r) {
      busy = false;
      sj(KEY_CACHE, { key: ck, time: Date.now(), w: r[0], a: r[1] });
      render(r[0], r[1], place, 'آخر تحديث الآن');
    }).catch(function () {
      busy = false;
      if (cache && cache.key === ck) {
        var m = Math.round((Date.now() - cache.time) / 60000);
        render(cache.w, cache.a, place, 'لا يوجد اتصال. هذه آخر بيانات محفوظة (قبل ' + num(m) + ' د)');
      } else {
        body.innerHTML = '<div class="wx-c" style="text-align:center">تعذّر تحميل الطقس. تحقق من الاتصال بالإنترنت.</div>';
      }
    });
  }

  function setPlace(p) {
    place = p; sj(KEY_PLACE, p); resBox.innerHTML = ''; load(true);
  }
  function useGPS() {
    if (!navigator.geolocation) { toast('المتصفح لا يدعم تحديد الموقع'); return; }
    toast('جارٍ تحديد موقعك…');
    navigator.geolocation.getCurrentPosition(function (p) {
      setPlace({ name: 'موقعي الحالي', lat: p.coords.latitude, lng: p.coords.longitude });
    }, function () { toast('تعذّر تحديد الموقع. اسمح بالوصول للموقع أو ابحث عن مدينة.'); }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
  }
  function search(q) {
    if (!q) return;
    getJSON('https://geocoding-api.open-meteo.com/v1/search?count=6&language=ar&name=' + encodeURIComponent(q)).then(function (d) {
      results = d.results || [];
      if (!results.length) { resBox.innerHTML = '<div class="wx-r">لا توجد نتائج. جرّب اسمًا آخر.</div>'; return; }
      resBox.innerHTML = results.map(function (r, i) {
        return '<div class="wx-r" data-i="' + i + '"><b>' + esc(r.name) + '</b><small>' + esc([r.admin1, r.country].filter(Boolean).join('، ')) + '</small></div>';
      }).join('');
    }).catch(function () { toast('تعذّر البحث. تحقق من الاتصال.'); });
  }

  /* ---------- radar ---------- */
  function radarOff() {
    var m = window.MYMAP;
    if (radarLayer && m) m.removeLayer(radarLayer);
    radarLayer = null;
    if (radarChip) { radarChip.remove(); radarChip = null; }
  }
  function radarOn() {
    var m = window.MYMAP;
    if (!m || !window.L) { toast('الخريطة غير جاهزة بعد'); return; }
    toast('جارٍ تحميل الرادار…');
    getJSON('https://api.rainviewer.com/public/weather-maps.json').then(function (d) {
      var f = d.radar && d.radar.past && d.radar.past[d.radar.past.length - 1];
      if (!f) throw new Error('none');
      radarOff();
      radarLayer = L.tileLayer(d.host + f.path + '/256/{z}/{x}/{y}/2/1_1.png',
        { opacity: 0.65, zIndex: 6, maxNativeZoom: 7, maxZoom: 19, attribution: 'RainViewer' }).addTo(m);
      if (place) m.setView([place.lat, place.lng], 7);
      closePanel();
      radarChip = document.createElement('button');
      radarChip.id = 'wxRc'; radarChip.textContent = '✕ إخفاء رادار المطر';
      radarChip.onclick = radarOff;
      document.body.appendChild(radarChip);
    }).catch(function () { toast('تعذّر تحميل الرادار الآن'); });
  }

  /* ---------- panel ---------- */
  function openPanel() {
    panel.hidden = false; fab.style.display = 'none';
    try { history.pushState({ wx: 1 }, ''); } catch (e) {}
    if (!place) useGPS(); else load(false);
  }
  function closePanel() { panel.hidden = true; fab.style.display = ''; }

  function build() {
    fab = document.createElement('button');
    fab.id = 'wxFab'; fab.innerHTML = '🌦️<small>الطقس</small>'; fab.setAttribute('aria-label', 'الطقس');
    fab.onclick = openPanel;
    document.body.appendChild(fab);

    toastEl = document.createElement('div'); toastEl.id = 'wxToast'; toastEl.hidden = true;
    document.body.appendChild(toastEl);

    panel = document.createElement('div'); panel.id = 'wxp'; panel.hidden = true;
    panel.innerHTML =
      '<div class="wx-h"><button id="wxX" aria-label="إغلاق">✕</button><b>🌦️ الطقس والحالة الجوية</b><button id="wxLoc" aria-label="موقعي">📍</button><button id="wxRf" aria-label="تحديث">⟳</button></div>' +
      '<form class="wx-s" id="wxForm"><input id="wxQ" type="search" placeholder="ابحث عن مدينة…"><button type="submit">بحث</button></form>' +
      '<div id="wxRes"></div><div id="wxBody"></div>';
    document.body.appendChild(panel);
    body = panel.querySelector('#wxBody'); resBox = panel.querySelector('#wxRes');

    panel.querySelector('#wxX').onclick = closePanel;
    panel.querySelector('#wxLoc').onclick = useGPS;
    panel.querySelector('#wxRf').onclick = function () { load(true); };
    panel.querySelector('#wxForm').onsubmit = function (e) { e.preventDefault(); search(panel.querySelector('#wxQ').value.trim()); };
    resBox.addEventListener('click', function (e) {
      var r = e.target.closest('[data-i]'); if (!r) return;
      var x = results[+r.getAttribute('data-i')]; if (!x) return;
      setPlace({ name: x.name + (x.admin1 ? '، ' + x.admin1 : ''), lat: x.latitude, lng: x.longitude });
    });
    body.addEventListener('click', function (e) { if (e.target.id === 'wxRadar') radarOn(); });
    window.addEventListener('popstate', function () { if (!panel.hidden) closePanel(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();

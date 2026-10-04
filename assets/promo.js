/* Рекламные места сайта: шторка снизу и карточки на лендинге.
   ─────────────────────────────────────────────────────────────
   КАК ДОБАВИТЬ РЕКЛАМУ: допиши объект в список ADS ниже.
     id       — латиницей, уникальный (для меток в ссылке)
     tag      — подпись сверху, для партнёров: 'Реклама · ООО Ромашка'
     title    — заголовок
     text     — 1–2 предложения
     cta      — текст кнопки
     url      — ссылка (метка utm добавится сама)
     erid     — токен маркировки рекламы (если есть), покажется мелко
     until    — до какой даты показывать, 'ГГГГ-ММ-ДД' (не обязательно)
     card     — true: показывать и карточкой на лендинге
     img      — фото карточки (путь от папки assets/ или полная ссылка)

   ФОТО ДЛЯ РЕКЛАМЫ — один формат для карточки и шторки:
     пропорция 16:10, размер 1600×1000 px (минимум 1280×800), JPG или WebP до 300 КБ;
     без текста и логотипов на самом фото — текст и кнопку сайт накладывает сам;
     главное держи в верхних 55% кадра: нижнюю часть закрывает затемнение с текстом;
     другая пропорция не сплющится, но обрежется по краям.
   Найм (HOUSE) показывается всегда; партнёры чередуются с ним по очереди. */
(function(){
  'use strict';
  var HOUSE = {
    id: 'hire', tag: 'Мы ищем людей',
    title: 'Делай тренажёры вместе с нами',
    text: 'Ищем тех, кто готов собирать и проверять вопросы, писать конспекты и помогать с разработкой. Напиши — расскажем подробнее.',
    cta: 'Перейти', url: 'https://t.me/oapwso', card: true, img: 'promo/hire.jpg'
  };
  var ADS = [
    // { id:'partner1', tag:'Реклама · ИП Иванов', title:'…', text:'…', cta:'Подробнее', url:'https://…', erid:'…', until:'2026-12-31', card:true },
  ];
  var VACANT = { id: 'vacant', tag: 'Место для рекламы', title: 'Здесь может быть ваша реклама',
    text: 'Тренажёрами пользуются студенты СГМУ каждый день. Расскажите о своём проекте здесь.',
    cta: 'Перейти', url: 'https://t.me/oapwso', img: 'promo/vacant.jpg' };
  var SHOW_AT = [4, 20 * 60, 60 * 60];   // секунды на сайте за визит: при заходе, через 20 мин и через час

  var BASE = (document.currentScript && document.currentScript.src || '').replace(/[^\/]*$/, '');
  function imgUrl(a){ return !a.img ? '' : (/^(https?:)?\/\//.test(a.img) ? a.img : BASE + a.img); }
  function track(){}  // статистика отключена
  // ---------- служебное ----------
  function ss(k, v){ try{ if(v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); }catch(e){ return null; } }
  function ls(k, v){ try{ if(v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); }catch(e){ return null; } }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function active(a){ return !a.until || new Date(a.until + 'T23:59:59') >= new Date(); }
  function link(a, place){
    if(/^https?:\/\/t\.me\//.test(a.url)) return a.url;
    return a.url + (a.url.indexOf('?') < 0 ? '?' : '&') + 'utm_source=sgmu&utm_medium=' + place + '&utm_campaign=' + encodeURIComponent(a.id);
  }
  var partners = ADS.filter(active);
  var queue = [HOUSE].concat(partners);

  // ---------- стили ----------
  var css = '' +
    /* фото-карточка: общий каркас для лендинга и шторки */
    '.promo-card{position:relative;display:block;aspect-ratio:16/10;border-radius:18px;overflow:hidden;isolation:isolate;text-decoration:none;color:#fff;background:#221F2B;box-shadow:0 1px 2px rgba(0,0,0,.35),0 14px 34px -14px rgba(0,0,0,.65);font-family:"Inter Tight","Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif;}' +
    '.promo-card img.promo-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2;transition:transform .6s ease;}' +
    '.promo-card:hover img.promo-bg{transform:scale(1.03);}' +
    '.promo-card::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(8,7,12,.10) 0%,rgba(8,7,12,.14) 34%,rgba(8,7,12,.78) 64%,rgba(8,7,12,.93) 100%);}' +
    '.promo-in{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;padding:16px;}' +
    '.promo-chip{align-self:flex-start;font-size:.72rem;font-weight:600;letter-spacing:.02em;color:#fff;padding:5px 10px;border-radius:999px;background:rgba(20,18,26,.42);border:1px solid rgba(255,255,255,.28);-webkit-backdrop-filter:blur(10px) saturate(160%);backdrop-filter:blur(10px) saturate(160%);text-shadow:0 1px 2px rgba(0,0,0,.4);}' +
    '.promo-low{display:flex;align-items:flex-end;gap:12px;}' +
    '.promo-txt{flex:1;min-width:0;}' +
    '.promo-card .promo-title{margin:0;color:#fff;font-size:1.22rem;font-weight:600;line-height:1.2;letter-spacing:-.005em;text-shadow:0 1px 3px rgba(0,0,0,.55);}' +
    '.promo-card .promo-desc{margin:5px 0 0;font-size:.86rem;font-weight:500;line-height:1.4;color:rgba(255,255,255,.88);text-shadow:0 1px 2px rgba(0,0,0,.6);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}' +
    '.promo-erid{display:block;margin-top:6px;font-size:.66rem;color:rgba(255,255,255,.7);}' +
    /* liquid glass кнопка */
    '.promo-glass{position:relative;flex:none;display:inline-flex;align-items:center;gap:7px;padding:11px 18px;border-radius:999px;font-size:.92rem;font-weight:600;color:#fff;text-decoration:none;white-space:nowrap;cursor:pointer;' +
      'background:linear-gradient(180deg,rgba(255,255,255,.30),rgba(255,255,255,.10));border:1px solid rgba(255,255,255,.45);' +
      '-webkit-backdrop-filter:blur(16px) saturate(190%) brightness(1.08);backdrop-filter:blur(16px) saturate(190%) brightness(1.08);' +
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.75),inset 0 -1px 1px rgba(255,255,255,.18),inset 0 0 18px rgba(255,255,255,.10),0 10px 26px -8px rgba(0,0,0,.55);text-shadow:0 1px 2px rgba(0,0,0,.35);transition:transform .2s ease,background .2s ease;}' +
    '.promo-glass::before{content:"";position:absolute;left:12%;right:12%;top:1px;height:45%;border-radius:999px;background:linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,0));pointer-events:none;}' +
    '.promo-card:hover .promo-glass,.promo-glass:hover{background:linear-gradient(180deg,rgba(255,255,255,.38),rgba(255,255,255,.14));transform:translateY(-1px);}' +
    /* карточки на лендинге */
    '.card.promo-card{padding:0;display:block;gap:0;}' +
    '[data-promo-slot="cards"] .promo-card:focus-visible{outline:2px solid #FF9FA2;outline-offset:3px;}' +
    /* шторка */
    '.promo-sheet{position:fixed;left:50%;bottom:16px;z-index:60;width:min(560px,calc(100% - 24px));transform:translate(-50%,calc(100% + 40px));transition:transform .45s cubic-bezier(.2,.8,.2,1);border-radius:20px;}' +
    '.promo-sheet.open{transform:translate(-50%,0);}' +
    '.promo-sheet .promo-card{border-radius:20px;box-shadow:0 26px 60px -18px rgba(0,0,0,.85),0 2px 6px rgba(0,0,0,.45);}' +
    '.promo-x{position:absolute;top:12px;right:12px;z-index:2;width:34px;height:34px;border-radius:999px;color:#fff;font-size:.95rem;cursor:pointer;' +
      'background:rgba(20,18,26,.42);border:1px solid rgba(255,255,255,.35);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);}' +
    '.promo-x:hover{background:rgba(20,18,26,.6);}' +
    '.promo-sheet :focus-visible{outline:2px solid #FF9FA2;outline-offset:2px;}' +
    '@media (max-width:600px){.promo-sheet{bottom:10px;}.promo-in{padding:13px;}.promo-card .promo-title{font-size:1.06rem;}.promo-card .promo-desc{font-size:.8rem;-webkit-line-clamp:2;}.promo-glass{padding:9px 14px;font-size:.85rem;}}' +
    '@media (max-width:380px){.promo-card .promo-desc{display:none;}}' +
    '@media (prefers-reduced-motion:reduce){.promo-sheet,.promo-card img.promo-bg{transition:none;}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // ---------- карточки на лендинге ----------
  function photoCard(a, place, tagName){
    var tag = tagName || 'a';
    var href = tag === 'a' ? ' href="' + esc(link(a, place)) + '" target="_blank" rel="noopener"' : '';
    var btn = tag === 'a' ? '<span class="promo-glass">' + esc(a.cta || 'Перейти') + ' <span aria-hidden="true">→</span></span>'
                          : '<a class="promo-glass" href="' + esc(link(a, place)) + '" target="_blank" rel="noopener">' + esc(a.cta || 'Перейти') + ' <span aria-hidden="true">→</span></a>';
    return '<' + tag + ' class="promo-card"' + href + ' data-kind="promo">' +
      (a.img ? '<img class="promo-bg" src="' + esc(imgUrl(a)) + '" alt="" loading="eager" decoding="async">' : '') +
      '<div class="promo-in"><span class="promo-chip">' + esc(a.tag) + '</span>' +
      '<div class="promo-low"><div class="promo-txt"><p class="promo-title">' + esc(a.title) + '</p>' +
      (a.text ? '<p class="promo-desc">' + esc(a.text) + '</p>' : '') +
      (a.erid ? '<span class="promo-erid">Реклама · erid: ' + esc(a.erid) + '</span>' : '') +
      '</div>' + btn + '</div></div></' + tag + '>';
  }
  document.querySelectorAll('[data-promo-slot="cards"]').forEach(function(box){
    var withCard = partners.filter(function(a){ return a.card; });
    var second = withCard.length ? withCard[(+ls('promo-card-rot') || 0) % withCard.length] : null;
    if(withCard.length) ls('promo-card-rot', String((+ls('promo-card-rot') || 0) + 1));
    box.innerHTML = photoCard(HOUSE, 'card') + photoCard(second || VACANT, 'card');
    var shownAds = [HOUSE, second || VACANT];
    box.querySelectorAll('.promo-card').forEach(function(c, i){
      var ad = shownAds[i]; c.classList.add('card');
      c.addEventListener('click', function(){ track('promo_click', ad, 'card'); });
      if('IntersectionObserver' in window){
        var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ track('promo_view', ad, 'card'); io.disconnect(); } }); }, {threshold: .5});
        io.observe(c);
      } else track('promo_view', ad, 'card');
    });
  });

  // ---------- шторка ----------
  var sheet = null, lastFocus = null;
  function quizBusy(){ var q = document.getElementById('screen-quiz'); return !!(q && !q.hidden); }
  function nextAd(){
    var i = (+ls('promo-rot') || 0); ls('promo-rot', String(i + 1));
    return queue[i % queue.length];
  }
  var sheetAd = null;
  function close(byUser){
    if(!sheet) return;
    if(byUser && sheetAd) track('promo_close', sheetAd, 'sheet');
    sheet.classList.remove('open');
    var s = sheet; sheet = null;
    setTimeout(function(){ s.remove(); }, 500);
    if(lastFocus && lastFocus.focus) try{ lastFocus.focus({preventScroll: true}); }catch(e){}
  }
  function open(){
    var a = nextAd(); sheetAd = a;
    lastFocus = document.activeElement;
    sheet = document.createElement('aside');
    sheet.className = 'promo-sheet'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', a.tag);
    sheet.innerHTML = photoCard(a, 'sheet', 'div') + '<button class="promo-x" type="button" aria-label="Закрыть">✕</button>';
    document.body.appendChild(sheet);
    sheet.querySelector('.promo-x').addEventListener('click', function(){ close(true); });
    sheet.querySelector('.promo-glass').addEventListener('click', function(){ track('promo_click', a, 'sheet'); setTimeout(close, 150); });
    track('promo_view', a, 'sheet');
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ if(sheet) sheet.classList.add('open'); }); });
  }
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && sheet) close(true); });

  // время на сайте за визит (вкладка), общее для всех страниц
  var t = +ss('promo-t') || 0, shown = +ss('promo-shown') || 0;
  setInterval(function(){
    if(document.hidden) return;
    t++; ss('promo-t', String(t));
    if(shown < SHOW_AT.length && t >= SHOW_AT[shown] && !sheet && !quizBusy()){
      shown++; ss('promo-shown', String(shown)); open();
    }
  }, 1000);
})();

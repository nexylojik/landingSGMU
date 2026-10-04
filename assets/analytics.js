/* Статистика сайта — Яндекс Метрика.
   ─────────────────────────────────────────────────────────────
   1. Зарегистрируй счётчик на metrika.yandex.ru (сайт: nexylojik.github.io).
   2. Впиши его номер в METRIKA_ID ниже. Пока там 0 — ничего не загружается и не отправляется.
   3. В Метрике: Настройки → Цели → «JavaScript-событие», идентификаторы:
        promo_view  — реклама показана
        promo_click — клик по рекламе
        promo_close — шторку закрыли
      Разбивка по объявлениям и местам — в отчёте «Параметры визитов» (ad, place).
   Источники переходов (поиск, Telegram, ВК, прямые заходы) Метрика считает сама: отчёт «Источники». */
(function(){
  'use strict';
  var METRIKA_ID = 113408323;   // ← номер счётчика

  var queue = [];
  window.siteTrack = function(goal, params){
    if(!METRIKA_ID) return;
    if(typeof window.ym === 'function') window.ym(METRIKA_ID, 'reachGoal', goal, params || {});
    else queue.push([goal, params]);
  };
  if(!METRIKA_ID) return;

  (function(m, e, t, r, i, k, a){
    m[i] = m[i] || function(){ (m[i].a = m[i].a || []).push(arguments); };
    m[i].l = 1 * new Date();
    for(var j = 0; j < document.scripts.length; j++){ if(document.scripts[j].src === r) return; }
    k = e.createElement(t); a = e.getElementsByTagName(t)[0]; k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
  })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=' + METRIKA_ID, 'ym');

  window.ym(METRIKA_ID, 'init', { ssr: true, clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false, referrer: document.referrer, url: location.href });
  queue.forEach(function(e){ window.ym(METRIKA_ID, 'reachGoal', e[0], e[1] || {}); });
  queue = [];
})();

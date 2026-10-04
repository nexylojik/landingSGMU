/* Универсальный тренажёр тестов (дизайн-система v2).
   Данные: window.TRAINER = {title, intro, key, topics:[{title, upd, tests:[{title, upd, q:[…], parts}]}]}
   Вопрос: t — текст (h:1 — HTML), img — иллюстрация,
     без type — выбор: o (строки или {img}), c — индексы верных, m:1 — несколько ответов;
     type 'col' — соответствие: L, R, map (L[i] → R[map[i]]);
     type 'ord' — порядок: items, ans (индексы items в правильном порядке);
     type 'pt'  — клик по картинке: img, reg (полигоны [[x,y],…] в пикселях картинки);
     type 'in'  — ввод ответа: ans (допустимые варианты);
     type 'self' — открытый вопрос с самопроверкой: ans (текст ответа, h:1 — HTML);
     note — пометка к вопросу (показывается после ответа и в списке). */
(function(){
  "use strict";
  var $ = function(id){ return document.getElementById(id); };
  var CFG = window.TRAINER;
  var TOPICS = CFG.topics;
  var P = (CFG.key || 'trainer') + '-';
  var LS = {mistakes: P + 'mistakes', best: P + 'best', perfect: P + 'perfect', studied: P + 'studied', launch: P + 'launch'};

  document.title = CFG.title + ' — тренажёр';
  $('appTitle').textContent = CFG.title;
  if(CFG.intro) $('appIntro').textContent = CFG.intro;

  // ---------- Данные ----------
  var TESTS = [], BY_ID = {}, ALL = [];
  TOPICS.forEach(function(tp, ti){
    tp.idx = ti;
    tp.tests.forEach(function(t, gi){
      t.key = ti + '.' + gi; t.topic = tp; t.gi = gi;
      t.q.forEach(function(q, qi){ q.id = t.key + '.' + qi; q.n = qi + 1; q.test = t; BY_ID[q.id] = q; ALL.push(q); });
      TESTS.push(t);
    });
  });
  var SINGLE = TESTS.length === 1;

  function load(k, d){ try{ var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; }catch(e){ return d; } }
  function save(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  var mistakes = load(LS.mistakes, []).filter(function(id){ return BY_ID[id]; });
  var best = load(LS.best, {}), perfect = load(LS.perfect, {}), studied = load(LS.studied, {}), launchCfg = load(LS.launch, {});

  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function txt(s){ return esc(s).replace(/\n/g, '<br>'); }
  function qText(q){ return q.h ? q.t : txt(q.t); }
  function plainText(q){ return (q.h ? q.t.replace(/<[^>]+>/g, ' ') : q.t); }
  function shuffle(a){ for(var i = a.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function sample(a, n){ return shuffle(a.slice()).slice(0, n); }
  function plural(n, one, few, many){ var m10 = n % 10, m100 = n % 100; if(m10 === 1 && m100 !== 11) return one; if(m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few; return many; }
  function grade(p){ return p >= 90 ? 5 : p >= 80 ? 4 : p >= 60 ? 3 : 2; }
  var GRADE_TEXT = {5:'Оценка 5 — отлично', 4:'Оценка 4 — хорошо', 3:'Оценка 3 — удовлетворительно', 2:'Оценка 2 — надо повторить'};
  function optHtml(o){ return (o && typeof o === 'object' && o.img) ? '<img class="opt-img" src="' + o.img + '" alt="">' : txt(o); }
  function optPlain(o){ return (o && typeof o === 'object') ? '[рисунок]' : o; }
  function typeset(el){ if(window.MathJax && MathJax.typesetPromise){ try{ MathJax.typesetPromise([el]).catch(function(){}); }catch(e){} } }

  var SCREENS = ['home','topic','launch','study','quiz','result','list'];
  function show(name){
    SCREENS.forEach(function(n){ $('screen-' + n).hidden = (n !== name); });
    document.documentElement.style.setProperty('--hdr', document.querySelector('header.top').offsetHeight + 'px');
    window.scrollTo(0, 0);
  }

  // ---------- Главная ----------
  function bestHtml(v){ return v == null ? '' : ' · <span class="best' + (v >= 80 ? '' : v >= 60 ? ' mid' : ' low') + '">' + v + '%</span>'; }
  function renderHome(){
    $('totalMeta').textContent = ALL.length + ' ' + plural(ALL.length, 'вопрос', 'вопроса', 'вопросов') + (TOPICS.length > 1 ? ' · ' + TOPICS.length + ' ' + plural(TOPICS.length, 'тема', 'темы', 'тем') : '');
    $('modeMistakesSub').textContent = mistakes.length ? ('Вопросов с ошибками: ' + mistakes.length) : 'Ошибок пока нет — сначала пройди тест';
    $('modeMistakes').disabled = !mistakes.length;
    $('modeRandom').hidden = SINGLE;
    if(SINGLE){ $('topicsBlock').hidden = true; if($('homeTop').parentNode !== $('launchHome')) $('launchHome').appendChild($('homeTop')); openLaunch(TESTS[0], true); return; }
    $('topicsBlock').hidden = false;
    var box = $('topics'); box.innerHTML = '';
    TOPICS.forEach(function(tp){
      var n = tp.tests.reduce(function(s, t){ return s + t.q.length; }, 0);
      var done = tp.tests.filter(function(t){ return perfect[t.key]; }).length;
      var b = document.createElement('button'); b.className = 'tile';
      var one = tp.tests.length === 1;
      var meta = one ? (n + ' вопр.' + bestHtml(best[tp.tests[0].key]) + (studied[tp.tests[0].key] ? '' : ' · <span class="new">не изучен</span>'))
                     : (tp.tests.length + ' ' + plural(tp.tests.length, 'тест', 'теста', 'тестов') + ' · ' + n + ' вопр.');
      var pf = one ? (perfect[tp.tests[0].key] || 0) : 0;
      b.innerHTML = '<span class="tile-title"><span>' + esc(tp.title) + (tp.upd ? '<span class="upd">★ обновлено</span>' : '') + '</span>' +
        (pf ? '<span class="perfect" title="Решено на 100%">✓ ' + pf + '</span>' : '') + '</span>' +
        '<span class="tile-meta">' + meta + '</span>' +
        (!one ? '<span class="tile-bar" title="Тестов решено на 100%: ' + done + ' из ' + tp.tests.length + '"><i style="width:' + (done / tp.tests.length * 100) + '%"></i></span>' : '');
      b.addEventListener('click', function(){ if(one) openLaunch(tp.tests[0]); else openTopic(tp); });
      box.appendChild(b);
    });
    show('home');
  }

  // ---------- Тема ----------
  function openTopic(tp){
    $('topicTitle').textContent = tp.title;
    var box = $('tests'); box.innerHTML = '';
    tp.tests.forEach(function(t){
      var b = document.createElement('button'); b.className = 'tile';
      var pf = perfect[t.key] || 0;
      b.innerHTML = '<span class="tile-title"><span>' + esc(t.title) + (t.upd ? '<span class="upd">★</span>' : '') + '</span>' +
        (pf ? '<span class="perfect" title="Решено на 100%">✓ ' + pf + '</span>' : '') + '</span>' +
        '<span class="tile-meta">' + t.q.length + ' вопр.' + bestHtml(best[t.key]) + (studied[t.key] ? '' : ' · <span class="new">не изучен</span>') + '</span>';
      b.addEventListener('click', function(){ openLaunch(t); });
      box.appendChild(b);
    });
    show('topic');
  }

  // ---------- Запуск теста ----------
  var curTest = null, launchMode = 'all';
  function modesFor(t){
    var m = [{id:'all', label:'Все ' + t.q.length}, {id:'range', label:'Диапазон'}, {id:'rand', label:'Случайные'}];
    if(t.parts) m.push({id:'parts', label:t.parts.length + ' по билетам'});
    return m;
  }
  function openLaunch(t, asHome){
    curTest = t;
    var cfg = launchCfg[t.key] || {};
    launchMode = cfg.mode || 'all';
    $('launchCrumbRow').hidden = !!asHome;
    $('launchHome').hidden = !asHome;
    $('launchCrumb').textContent = t.topic.tests.length > 1 ? t.topic.title : 'Тест';
    $('launchTitle').textContent = t.title;
    var pf = perfect[t.key] || 0;
    $('launchMeta').innerHTML = t.q.length + ' ' + plural(t.q.length, 'вопрос', 'вопроса', 'вопросов') + (best[t.key] != null ? ' · лучший результат ' + best[t.key] + '%' : '') + (pf ? ' · ✓ на 100%: ' + pf : '') + (studied[t.key] ? '' : ' · не изучен');
    var seg = $('launchSeg'); seg.innerHTML = '';
    modesFor(t).forEach(function(m){
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.mode = m.id; b.textContent = m.label;
      b.addEventListener('click', function(){ launchMode = m.id; syncLaunch(); });
      seg.appendChild(b);
    });
    if(!modesFor(t).some(function(m){ return m.id === launchMode; })) launchMode = 'all';
    $('rFrom').max = $('rTo').max = t.q.length;
    $('rFrom').value = cfg.from || 1; $('rTo').value = cfg.to || Math.min(t.q.length, 25);
    $('rCount').value = String(cfg.count || 30);
    syncLaunch();
    show('launch');
  }
  function clampRange(changed){
    var n = curTest.q.length;
    var f = Math.max(1, Math.min(n, parseInt($('rFrom').value, 10) || 1));
    var to = Math.max(1, Math.min(n, parseInt($('rTo').value, 10) || n));
    if(f > to){ if(changed === 'from') to = f; else f = to; }
    $('rFrom').value = f; $('rTo').value = to;
    return [f, to];
  }
  function syncLaunch(changed){
    var t = curTest;
    $('launchSeg').querySelectorAll('button').forEach(function(b){ b.setAttribute('aria-checked', String(b.dataset.mode === launchMode)); });
    $('rangeBox').hidden = launchMode !== 'range';
    $('randBox').hidden = launchMode !== 'rand';
    var sub = '';
    if(launchMode === 'all') sub = 'Все ' + t.q.length + ' вопросов по порядку.';
    if(launchMode === 'range'){ var r = clampRange(changed); var k = r[1] - r[0] + 1; sub = k + ' ' + plural(k, 'вопрос', 'вопроса', 'вопросов') + ' по порядку: с ' + r[0] + ' по ' + r[1] + '.'; }
    if(launchMode === 'rand'){ var c = Math.min(+$('rCount').value, t.q.length); sub = c + ' случайных ' + plural(c, 'вопрос', 'вопроса', 'вопросов') + ' из ' + t.q.length + '.'; }
    if(launchMode === 'parts') sub = t.parts.length + ' вопросов — по одному случайному из каждого билета.';
    $('launchSub').textContent = sub;
    launchCfg[t.key] = {mode: launchMode, from: +$('rFrom').value, to: +$('rTo').value, count: +$('rCount').value};
    save(LS.launch, launchCfg);
  }
  $('rFrom').addEventListener('change', function(){ syncLaunch('from'); });
  $('rTo').addEventListener('change', function(){ syncLaunch('to'); });
  $('rCount').addEventListener('change', function(){ syncLaunch(); });

  function buildList(t, mode){
    if(mode === 'range'){ var r = clampRange(); return t.q.slice(r[0] - 1, r[1]); }
    if(mode === 'rand') return sample(t.q, Math.min(+$('rCount').value, t.q.length));
    if(mode === 'parts') return t.parts.map(function(p){ return t.q[p[0] + Math.floor(Math.random() * (p[1] - p[0]))]; });
    return t.q.slice();
  }
  function runTitle(t, mode, list){
    if(mode === 'range') return t.title + ' · ' + list[0].n + '–' + list[list.length - 1].n;
    if(mode === 'rand') return t.title + ' · ' + list.length + ' случайных';
    if(mode === 'parts') return t.title + ' · по билетам';
    return t.title;
  }
  function launch(t, mode){
    var list = buildList(t, mode);
    var opts = {test: t, mode: mode};
    if(!studied[t.key]) openStudy(t, list, opts);
    else start(runTitle(t, mode, list), list, opts);
  }
  $('launchStart').addEventListener('click', function(){ launch(curTest, launchMode); });
  $('launchStudy').addEventListener('click', function(){ openStudy(curTest, buildList(curTest, launchMode === 'rand' || launchMode === 'parts' ? 'all' : launchMode), null); });
  $('launchBack').addEventListener('click', function(){ if(curTest.topic.tests.length > 1) openTopic(curTest.topic); else renderHome(); });
  $('topicBack').addEventListener('click', renderHome);

  // ---------- Изучение ----------
  var study = null;
  function openStudy(t, list, opts){
    study = {t: t, list: list, opts: opts};
    $('studyTitle').textContent = t.title + ' · изучение';
    $('studyHint').textContent = opts
      ? 'Первый запуск этого теста: сначала прочитай вопросы с правильными ответами, потом переходи к тесту. В следующий раз тест откроется сразу.'
      : 'Вопросы с правильными ответами (' + list.length + ').';
    $('studyStart').textContent = opts ? 'Я изучил — начать тест →' : 'К запуску теста →';
    $('studyList').innerHTML = list.map(listItemHtml).join('');
    show('study'); typeset($('studyList'));
  }
  $('studyStart').addEventListener('click', function(){
    if(!study.opts){ openLaunch(study.t, SINGLE); return; }
    studied[study.t.key] = true; save(LS.studied, studied);
    start(runTitle(study.t, study.opts.mode, study.list), study.list, study.opts);
  });
  $('studyBack').addEventListener('click', function(){ openLaunch(study.t, SINGLE); });

  // ---------- Тест ----------
  var S = null;
  function start(title, list, opts){
    S = {title: title, list: list, i: 0, score: 0, answered: 0, wrong: [], opts: opts || {}, checked: false};
    $('quizTitle').textContent = title;
    show('quiz');
    renderQ();
  }
  function imgHtml(q){ return q.img && q.type !== 'pt' ? '<div class="q-img"><img src="' + q.img + '" alt="Иллюстрация к вопросу" decoding="async"></div>' : ''; }
  var HINTS = {col:'Сопоставь: для каждого пункта слева выбери вариант', ord:'Расставь пункты в правильном порядке (кнопки ↑ ↓)', pt:'Нажми на нужное место на картинке', 'in':'Введи ответ', self:'Открытый вопрос: вспомни ответ и нажми «Показать ответ»'};
  function selfAns(q){ return q.ah ? q.ans : txt(q.ans); }
  function noteHtml(q){ return q.note ? '<div class="q-note"><b>Пометка.</b> ' + esc(q.note) + '</div>' : ''; }

  function renderQ(){
    var q = S.list[S.i];
    S.checked = false; S.sel = []; S.point = null; S.order = null;
    $('qMeta').textContent = 'Вопрос ' + (S.i + 1) + ' из ' + S.list.length + ' · ' + q.test.title + ', № ' + q.n;
    var hint = q.type ? HINTS[q.type] : (q.m ? 'Несколько правильных ответов — отметь все' : 'Один правильный ответ');
    $('qBody').innerHTML = '<div class="q-text">' + qText(q) + '</div>' + imgHtml(q) + '<div class="q-hint">' + hint + '</div>';
    var ul = $('answers'); ul.innerHTML = '';
    var ex = $('taskExtra'); ex.innerHTML = '';
    if(!q.type){
      q.o.forEach(function(a, k){
        var li = document.createElement('li');
        var b = document.createElement('button'); b.className = 'ans'; b.type = 'button'; b.setAttribute('aria-pressed', 'false');
        b.innerHTML = '<span class="box' + (q.m ? '' : ' radio') + '">' + (k + 1) + '</span><span>' + optHtml(a) + '</span>';
        b.addEventListener('click', function(){ toggle(k); });
        li.appendChild(b); ul.appendChild(li);
      });
    } else if(q.type === 'col'){
      q.L.forEach(function(l, i){
        var row = document.createElement('div'); row.className = 'match-row';
        var sel = '<select data-i="' + i + '"><option value="">— выбери —</option>' + q.R.map(function(r, k){ return '<option value="' + k + '">' + esc(r) + '</option>'; }).join('') + '</select>';
        row.innerHTML = '<div class="match-left">' + txt(l) + '</div>' + sel;
        ex.appendChild(row);
      });
      ex.querySelectorAll('select').forEach(function(s){ s.addEventListener('change', updateCheckable); });
    } else if(q.type === 'ord'){
      S.order = shuffle(q.items.map(function(_, i){ return i; }));
      if(q.items.length > 1 && S.order.every(function(v, i){ return v === q.ans[i]; })){ var t0 = S.order[0]; S.order[0] = S.order[1]; S.order[1] = t0; }
      drawOrder();
    } else if(q.type === 'pt'){
      var holder = document.createElement('div'); holder.className = 'pt-task'; holder.id = 'ptTask';
      holder.innerHTML = '<img src="' + q.img + '" alt="Изображение к вопросу">';
      holder.addEventListener('click', function(e){
        if(S.checked) return;
        var r = holder.getBoundingClientRect(), img = holder.querySelector('img');
        S.point = {x: (e.clientX - r.left) * img.naturalWidth / r.width, y: (e.clientY - r.top) * img.naturalHeight / r.height};
        var mk = holder.querySelector('.pt-marker'); if(!mk){ mk = document.createElement('i'); mk.className = 'pt-marker'; holder.appendChild(mk); }
        mk.style.left = ((e.clientX - r.left) / r.width * 100) + '%'; mk.style.top = ((e.clientY - r.top) / r.height * 100) + '%';
        updateCheckable();
      });
      ex.appendChild(holder);
    } else if(q.type === 'in'){
      ex.innerHTML = '<input class="text-answer" id="textAnswer" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Введите ответ">';
      $('textAnswer').addEventListener('input', updateCheckable);
    }
    $('feedback').textContent = ''; $('feedback').className = 'feedback';
    S.revealed = false;
    $('checkBtn').textContent = q.type === 'self' ? 'Показать ответ' : 'Проверить';
    $('checkBtn').hidden = false; $('checkBtn').disabled = q.type !== 'ord' && q.type !== 'self'; $('nextBtn').hidden = true;
    updateProgress();
    typeset($('screen-quiz'));
  }
  function drawOrder(){
    var q = S.list[S.i], ex = $('taskExtra');
    ex.innerHTML = '<ol class="order-list">' + S.order.map(function(idx, pos){
      return '<li class="order-item" data-pos="' + pos + '"><span class="order-n">' + (pos + 1) + '</span><span class="order-t">' + txt(q.items[idx]) + '</span>' +
        '<span class="order-btns"><button type="button" class="ob" data-d="-1" aria-label="Выше"' + (pos === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button type="button" class="ob" data-d="1" aria-label="Ниже"' + (pos === S.order.length - 1 ? ' disabled' : '') + '>↓</button></span></li>';
    }).join('') + '</ol>';
    ex.querySelectorAll('.ob').forEach(function(b){
      b.addEventListener('click', function(){
        if(S.checked) return;
        var pos = +b.closest('.order-item').dataset.pos, to = pos + (+b.dataset.d);
        var t = S.order[pos]; S.order[pos] = S.order[to]; S.order[to] = t; drawOrder();
      });
    });
  }
  function updateCheckable(){
    var q = S.list[S.i], ok = false;
    if(!q.type) ok = S.sel.length > 0;
    else if(q.type === 'col') ok = [].every.call($('taskExtra').querySelectorAll('select'), function(s){ return s.value !== ''; });
    else if(q.type === 'pt') ok = !!S.point;
    else if(q.type === 'in') ok = $('textAnswer').value.trim().length > 0;
    else ok = true;
    $('checkBtn').disabled = !ok;
  }
  function toggle(k){
    if(S.checked) return;
    var q = S.list[S.i]; if(q.type || k >= q.o.length) return;
    if(q.m){ var p = S.sel.indexOf(k); if(p >= 0) S.sel.splice(p, 1); else S.sel.push(k); }
    else S.sel = S.sel[0] === k ? [] : [k];
    $('answers').querySelectorAll('.ans').forEach(function(b, i){ b.setAttribute('aria-pressed', String(S.sel.indexOf(i) >= 0)); });
    updateCheckable();
  }
  function norm(v){ return String(v).trim().replace(/\s+/g, ' ').replace(/ё/g, 'е').toLocaleLowerCase('ru'); }
  function inPoly(pt, poly){
    var inside = false;
    for(var i = 0, j = poly.length - 1; i < poly.length; j = i++){
      var a = poly[i], b = poly[j];
      if((a[1] > pt.y) !== (b[1] > pt.y) && pt.x < (b[0] - a[0]) * (pt.y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  }
  function answerText(q){
    if(!q.type) return q.c.map(function(x){ return (x + 1) + ') ' + optPlain(q.o[x]); }).join('; ');
    if(q.type === 'col') return q.L.map(function(l, i){ return l + ' → ' + q.R[q.map[i]]; }).join('; ');
    if(q.type === 'ord') return q.ans.map(function(i, k){ return (k + 1) + '. ' + q.items[i]; }).join(' → ');
    if(q.type === 'in') return q.ans[0];
    if(q.type === 'self') return plainOf(selfAns(q));
    return 'отмеченная область на рисунке';
  }
  function plainOf(h){ var d = document.createElement('div'); d.innerHTML = h; return d.textContent; }
  function check(){
    if(S.checked || $('checkBtn').disabled) return;
    var q = S.list[S.i], ok = false, ex = $('taskExtra');
    if(q.type === 'self'){
      if(S.revealed) return;
      S.revealed = true;
      ex.innerHTML = '<div class="self-ans"><div class="self-label">Ответ</div><div class="self-text">' + selfAns(q) + '</div></div>' +
        '<div class="self-btns"><button type="button" class="btn self-yes">✓ Знал</button><button type="button" class="btn self-no">✕ Не знал</button></div>';
      $('checkBtn').hidden = true;
      ex.querySelector('.self-yes').addEventListener('click', function(){ settle(q, true); });
      ex.querySelector('.self-no').addEventListener('click', function(){ settle(q, false); });
      ex.querySelector('.self-yes').focus({preventScroll: true});
      typeset(ex);
      return;
    }
    if(!q.type){
      ok = S.sel.length === q.c.length && q.c.every(function(x){ return S.sel.indexOf(x) >= 0; });
      $('answers').querySelectorAll('.ans').forEach(function(b, k){
        b.disabled = true;
        var isC = q.c.indexOf(k) >= 0, isS = S.sel.indexOf(k) >= 0;
        if(isC) b.classList.add('correct'); if(isC && !isS) b.classList.add('missed'); if(isS && !isC) b.classList.add('wrong');
      });
    } else if(q.type === 'col'){
      ok = true;
      ex.querySelectorAll('select').forEach(function(s){
        var i = +s.dataset.i, good = +s.value === q.map[i];
        s.disabled = true; s.classList.add(good ? 'ok' : 'bad'); if(!good) ok = false;
        if(!good){ var fix = document.createElement('div'); fix.className = 'match-fix'; fix.textContent = '→ ' + q.R[q.map[i]]; s.parentNode.appendChild(fix); }
      });
    } else if(q.type === 'ord'){
      ok = S.order.every(function(v, i){ return v === q.ans[i]; });
      ex.querySelectorAll('.order-item').forEach(function(li, pos){ li.classList.add(S.order[pos] === q.ans[pos] ? 'ok' : 'bad'); li.querySelectorAll('.ob').forEach(function(b){ b.disabled = true; }); });
    } else if(q.type === 'pt'){
      ok = q.reg.some(function(poly){ return inPoly(S.point, poly); });
      var holder = $('ptTask'); holder.classList.add(ok ? 'ok' : 'bad');
      holder.insertAdjacentHTML('beforeend', regionSvg(q));
    } else if(q.type === 'in'){
      var v = norm($('textAnswer').value);
      ok = q.ans.some(function(a){ return norm(a) === v; });
      $('textAnswer').disabled = true; $('textAnswer').classList.add(ok ? 'ok' : 'bad');
    }
    settle(q, ok);
  }
  function settle(q, ok){
    if(S.checked) return;
    if(q.type === 'self') $('taskExtra').querySelectorAll('.self-btns .btn').forEach(function(b){ b.disabled = true; });
    S.checked = true; S.answered++;
    if(ok){
      S.score++; $('feedback').textContent = q.type === 'self' ? 'Отмечено: знал' : 'Верно'; $('feedback').className = 'feedback ok';
      var mi = mistakes.indexOf(q.id); if(mi >= 0 && S.opts.mistakes){ mistakes.splice(mi, 1); save(LS.mistakes, mistakes); }
    } else {
      S.wrong.push(q);
      $('feedback').textContent = q.type === 'self' ? 'Отмечено: не знал — вопрос попадёт в работу над ошибками' : 'Неверно. Правильный ответ: ' + (q.type ? answerText(q) : q.c.map(function(x){ return x + 1; }).join(', '));
      $('feedback').className = 'feedback bad';
      if(mistakes.indexOf(q.id) < 0){ mistakes.push(q.id); save(LS.mistakes, mistakes); }
    }
    if(q.note) $('feedback').insertAdjacentHTML('beforeend', noteHtml(q));
    $('checkBtn').hidden = true; $('nextBtn').hidden = false;
    $('nextBtn').textContent = S.i === S.list.length - 1 ? 'Результат →' : 'Дальше →';
    $('nextBtn').focus({preventScroll: true});
    updateProgress();
  }
  function regionSvg(q){
    // натуральный размер берём из пропорций: координаты полигонов в пикселях картинки
    return '<svg class="pt-regions" data-q="' + q.id + '" preserveAspectRatio="none"></svg>';
  }
  function fillRegions(root){
    (root || document).querySelectorAll('svg.pt-regions').forEach(function(svg){
      var q = BY_ID[svg.dataset.q], img = svg.parentNode.querySelector('img');
      function draw(){
        if(!img.naturalWidth) return;
        svg.setAttribute('viewBox', '0 0 ' + img.naturalWidth + ' ' + img.naturalHeight);
        svg.innerHTML = q.reg.map(function(poly){ return '<polygon points="' + poly.map(function(p){ return p.join(','); }).join(' ') + '"/>'; }).join('');
      }
      if(img.complete) draw(); else img.addEventListener('load', draw);
    });
  }
  function next(){ if(S.i < S.list.length - 1){ S.i++; renderQ(); window.scrollTo(0, 0); } else finish(true); }
  function updateProgress(){
    $('progressFill').style.width = (S.answered / S.list.length * 100) + '%';
    $('progressText').textContent = S.answered + ' / ' + S.list.length;
    $('scoreLive').textContent = S.answered ? ('✓ ' + S.score) : '';
    fillRegions($('screen-quiz'));
  }
  function nextTestOf(t){ return t.topic.tests[t.gi + 1] || null; }
  function finish(complete){
    var total = S.answered, p = total ? Math.round(S.score / total * 100) : 0;
    var t = S.opts.test, full = complete && total === S.list.length && t && S.opts.mode === 'all';
    if(full){ best[t.key] = Math.max(best[t.key] || 0, p); save(LS.best, best); }
    var isPerfect = full && S.score === total;
    if(isPerfect){ perfect[t.key] = (perfect[t.key] || 0) + 1; save(LS.perfect, perfect); }
    $('perfectLine').hidden = !isPerfect;
    if(isPerfect) $('perfectLine').textContent = '✓ Тест решён без ошибок — всего ' + perfect[t.key] + ' ' + plural(perfect[t.key], 'раз', 'раза', 'раз');
    var nt = t && S.opts.mode === 'all' ? nextTestOf(t) : null;
    $('nextTest').hidden = !nt;
    if(nt) $('nextTest').textContent = 'Следующий тест: ' + nt.title + ' →';
    $('newSet').hidden = !(S.opts.mode === 'rand' || S.opts.mode === 'parts' || S.opts.random);
    $('retryMistakes').hidden = !S.wrong.length;
    $('retryMistakes').classList.toggle('primary', !nt);
    $('resultTitle').textContent = (complete ? 'Результат · ' : 'Тест завершён досрочно · ') + S.title;
    $('resultScore').textContent = S.score + ' / ' + total + ' · ' + p + '%';
    var g = grade(p);
    $('resultGrade').textContent = total ? GRADE_TEXT[g] : 'Нет отвеченных вопросов';
    $('resultGrade').className = 'grade g' + g;
    $('mistakes').innerHTML = S.wrong.length ? '<div class="q-meta" style="margin-top:6px">Ошибки (' + S.wrong.length + ')</div>' +
      S.wrong.map(function(q){
        return '<div class="mistake"><div class="q-meta">' + esc(q.test.title) + ' · № ' + q.n + '</div><div class="mistake-q">' + qText(q) + '</div>' + imgHtml(q) +
          '<div class="mistake-a">Правильно: <b>' + esc(answerText(q)) + '</b></div>' + noteHtml(q) + '</div>';
      }).join('') : '';
    show('result'); typeset($('mistakes'));
  }

  $('checkBtn').addEventListener('click', check);
  $('nextBtn').addEventListener('click', next);
  $('finishBtn').addEventListener('click', function(){ finish(false); });
  $('restartBtn').addEventListener('click', function(){
    if(S.answered && !confirm('Начать тест заново? Текущий прогресс (' + S.answered + ' из ' + S.list.length + ') сбросится.')) return;
    start(S.title, S.list.slice(), S.opts);
  });
  $('retrySame').addEventListener('click', function(){ start(S.title, S.list.slice(), S.opts); });
  $('newSet').addEventListener('click', function(){
    if(S.opts.random){ startRandomAll(); return; }
    var t = S.opts.test, list = buildList(t, S.opts.mode);
    start(runTitle(t, S.opts.mode, list), list, S.opts);
  });
  $('retryMistakes').addEventListener('click', function(){ start('Ошибки: ' + S.title, S.wrong.slice(), {mistakes: true}); });
  $('nextTest').addEventListener('click', function(){ var nt = nextTestOf(S.opts.test); if(nt) openLaunch(nt); });
  $('toMenu').addEventListener('click', renderHome);
  $('modeMistakes').addEventListener('click', function(){ start('Работа над ошибками', shuffle(mistakes.map(function(id){ return BY_ID[id]; })), {mistakes: true}); });
  function startRandomAll(){ start('30 случайных из всех тем', sample(ALL, 30), {random: true}); }
  $('modeRandom').addEventListener('click', startRandomAll);

  document.addEventListener('keydown', function(e){
    if(!$('lightbox').hidden){ if(e.key === 'Escape') closeLightbox(); return; }
    if($('screen-quiz').hidden || e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = document.activeElement && document.activeElement.tagName;
    if(tag === 'INPUT' || tag === 'SELECT'){ if(e.key === 'Enter'){ e.preventDefault(); if(S.checked) next(); else check(); } return; }
    if(/^[1-9]$/.test(e.key)){ toggle(parseInt(e.key, 10) - 1); e.preventDefault(); }
    else if(e.key === 'Enter'){ e.preventDefault(); if(S.checked) next(); else check(); }
  });

  // ---------- Картинки ----------
  function closeLightbox(){ $('lightbox').hidden = true; $('lightboxImg').src = ''; }
  document.addEventListener('click', function(e){
    var img = e.target.closest && e.target.closest('.q-img img, .q-text img, .list-q .pt-view img, .mistake-q img');
    if(img){ $('lightboxImg').src = img.src; $('lightbox').hidden = false; }
  });
  $('lightbox').addEventListener('click', closeLightbox);

  // ---------- Список всех вопросов ----------
  function answerBlock(q){
    if(!q.type) return '<ol>' + q.o.map(function(a, k){ return '<li' + (q.c.indexOf(k) >= 0 ? ' class="right"' : '') + '>' + optHtml(a) + '</li>'; }).join('') + '</ol>';
    if(q.type === 'col') return '<div class="pairs">' + q.L.map(function(l, i){ return '<div class="pair"><span>' + txt(l) + '</span><span class="pair-arrow">→</span><span class="right">' + txt(q.R[q.map[i]]) + '</span></div>'; }).join('') + '</div>';
    if(q.type === 'ord') return '<ol class="right-order">' + q.ans.map(function(i){ return '<li class="right">' + txt(q.items[i]) + '</li>'; }).join('') + '</ol>';
    if(q.type === 'in') return '<div class="in-ans">Ответ: <b class="right">' + esc(q.ans.join(' / ')) + '</b></div>';
    if(q.type === 'self') return '<div class="in-ans">Ответ: <span class="right">' + selfAns(q) + '</span></div>';
    if(q.type === 'pt') return '<div class="pt-view"><img src="' + q.img + '" alt="">' + regionSvg(q) + '</div>';
    return '';
  }
  function listItemHtml(q){
    var kind = q.type === 'col' ? ' · соответствие' : q.type === 'ord' ? ' · порядок' : q.type === 'pt' ? ' · точка на рисунке' : q.type === 'in' ? ' · ввод ответа' : q.type === 'self' ? ' · открытый вопрос' : (q.m ? ' · несколько ответов' : '');
    return '<div class="list-q" id="q-' + q.id.replace(/\./g, '-') + '"><div class="q-meta">№ ' + q.n + kind + '</div>' +
      '<div class="q-text">' + qText(q) + '</div>' + imgHtml(q) + answerBlock(q) + noteHtml(q) + '</div>';
  }
  var listTopic = 0, listFromQuiz = false;
  (function(){
    if(TOPICS.length < 2){ $('topicNav').hidden = true; return; }
    TOPICS.forEach(function(tp, i){
      var c = document.createElement('button'); c.type = 'button'; c.className = 'sec-chip wide'; c.dataset.topic = i;
      c.textContent = tp.title; c.title = tp.title;
      c.addEventListener('click', function(){ $('search').value = ''; renderList(i); });
      $('topicNav').appendChild(c);
    });
  })();
  function matches(q, f){
    if(plainText(q).toLowerCase().indexOf(f) >= 0) return true;
    var pool = (q.o || []).concat(q.L || [], q.R || [], q.items || [], q.ans && q.type === 'in' ? q.ans : [], q.type === 'self' ? [plainOf(selfAns(q))] : []);
    return pool.some(function(a){ return typeof a === 'string' && a.toLowerCase().indexOf(f) >= 0; });
  }
  function renderList(ti, focusId){
    listTopic = ti;
    var f = $('search').value.trim().toLowerCase();
    var html = '', count = 0, LIMIT = 300;
    $('topicNav').querySelectorAll('.sec-chip').forEach(function(c){ c.classList.toggle('active', !f && +c.dataset.topic === ti); });
    var tn = $('testNav'); tn.innerHTML = '';
    if(f){
      TESTS.forEach(function(t){
        var items = t.q.filter(function(q){ return matches(q, f); });
        if(!items.length) return;
        if(count >= LIMIT){ count += items.length; return; }
        var shown = items.slice(0, LIMIT - count); count += items.length;
        html += '<div class="qgroup"><h2>' + esc(TOPICS.length > 1 ? t.topic.title : t.title) + (t.topic.tests.length > 1 ? ' · ' + esc(t.title) : '') + ' <span class="h-meta">' + items.length + ' вопр.</span></h2>' + shown.map(listItemHtml).join('') + '</div>';
      });
      $('listCount').textContent = count ? ('Найдено: ' + count + (count > LIMIT ? ' (показаны первые ' + LIMIT + ' — уточни запрос)' : '')) : '';
      tn.hidden = true;
    } else {
      var tp = TOPICS[ti];
      tn.hidden = tp.tests.length < 2;
      tp.tests.forEach(function(t, gi){
        html += '<div class="qgroup" id="lt-' + gi + '" data-g="' + gi + '"><h2>' + esc(t.title) + ' <span class="h-meta">' + t.q.length + ' вопр.</span></h2>' + t.q.map(listItemHtml).join('') + '</div>';
        if(tp.tests.length > 1){
          var c = document.createElement('button'); c.type = 'button'; c.className = 'sec-chip wide'; c.dataset.g = gi; c.textContent = t.title;
          c.addEventListener('click', function(){ var g = $('lt-' + gi); if(g) g.scrollIntoView({behavior: 'smooth', block: 'start'}); });
          tn.appendChild(c);
        }
      });
      $('listCount').textContent = (TOPICS.length > 1 ? tp.title + ': ' : '') + tp.tests.reduce(function(s, t){ return s + t.q.length; }, 0) + ' вопросов';
    }
    $('list').innerHTML = html || '<div class="empty">Ничего не найдено</div>';
    fillRegions($('list')); typeset($('list'));
    updateStick();
    var active = $('topicNav').querySelector('.active');
    if(active) active.scrollIntoView({block: 'nearest', inline: 'center'});
    if(focusId){
      var el = $('q-' + focusId.replace(/\./g, '-'));
      if(el){ el.scrollIntoView({block: 'start'}); el.classList.add('flash'); }
    } else window.scrollTo(0, 0);
    spy();
  }
  function updateStick(){
    var hdr = document.querySelector('header.top').offsetHeight;
    document.documentElement.style.setProperty('--hdr', hdr + 'px');
    document.documentElement.style.setProperty('--stick', (hdr + $('listTools').offsetHeight + 10) + 'px');
  }
  function spy(){
    if($('screen-list').hidden) return;
    $('toTop').classList.toggle('show', window.scrollY > 500);
    var line = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--stick')) || 180;
    var groups = $('list').querySelectorAll('.qgroup[data-g]'), cur = null;
    for(var i = 0; i < groups.length; i++){ if(groups[i].getBoundingClientRect().top - line <= 12) cur = groups[i].dataset.g; else break; }
    if(cur == null && groups.length) cur = groups[0].dataset.g;
    $('testNav').querySelectorAll('.sec-chip').forEach(function(c){ c.classList.toggle('active', c.dataset.g === cur); });
  }
  var spyQ = false;
  window.addEventListener('scroll', function(){ if(spyQ) return; spyQ = true; requestAnimationFrame(function(){ spyQ = false; spy(); }); }, {passive: true});
  window.addEventListener('resize', function(){ if(!$('screen-list').hidden){ updateStick(); spy(); } });
  $('toTop').addEventListener('click', function(){ window.scrollTo({top: 0, behavior: 'smooth'}); });
  var searchTimer = null;
  $('search').addEventListener('input', function(){ clearTimeout(searchTimer); searchTimer = setTimeout(function(){ renderList(listTopic); }, 200); });
  function setListBack(fromQuiz){ listFromQuiz = fromQuiz; $('listBack').textContent = fromQuiz ? '← К тесту' : '← Меню'; }
  $('openList').addEventListener('click', function(){ $('search').value = ''; setListBack(false); show('list'); renderList(listTopic); });
  $('launchList').addEventListener('click', function(){ $('search').value = ''; setListBack(false); show('list'); renderList(curTest.topic.idx); });
  $('listBack').addEventListener('click', function(){ if(listFromQuiz){ setListBack(false); show('quiz'); } else renderHome(); });
  $('peekBtn').addEventListener('click', function(){
    var q = S.list[S.i];
    $('search').value = ''; setListBack(true); show('list'); renderList(q.test.topic.idx, q.id);
  });

  renderHome();
})();

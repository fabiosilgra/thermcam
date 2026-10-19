(function () {
  document.documentElement.classList.add('js');
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  // Menu mobile
  var burger = $('#burger'), nav = $('#nav');
  if (burger) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open);
    });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { nav.classList.remove('open'); }); });
  }

  // Aparecer ao rolar
  var els = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  } else { els.forEach(function (el) { el.classList.add('in'); }); }

  // Filtro de categorias (portal de notícias)
  var chips = $('#chips');
  if (chips) {
    chips.addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      $$('.chip', chips).forEach(function (c) { c.classList.toggle('on', c === b); });
      var f = b.getAttribute('data-filter');
      $$('#grid .card').forEach(function (c) {
        c.style.display = (f === 'Todas' || c.getAttribute('data-cat') === f) ? '' : 'none';
      });
    });
  }

  // Formulário → WhatsApp (sem servidor)
  var form = $('#contactForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(form);
      if (!d.get('nome')) { form.nome.focus(); return; }
      var wa = document.querySelector('.wa-float').href.split('?')[0];
      var msg = 'Olá! Meu nome é ' + d.get('nome') + '.\nAssunto: ' + d.get('assunto') +
        (d.get('tel') ? '\nTelefone: ' + d.get('tel') : '') + (d.get('msg') ? '\n' + d.get('msg') : '');
      window.open(wa + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
    });
  }
})();

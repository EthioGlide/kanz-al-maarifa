/*
  script.js - Main interactive behaviors for Kanz Al Maarifa
  Rewritten to be robust, accessible, and defensive when translations or DOM elements are missing.
*/
(function(){
  'use strict';

  // Simple polyfills
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function(cb){ return setTimeout(cb, 16); };
  }

  // KnowledgeTreasury app
  function KnowledgeTreasury(){
    this.currentLanguage = localStorage.getItem('language') || 'ar';
    this.translations = {};
    this.notificationTimeout = null;
    this.init();
  }

  KnowledgeTreasury.prototype.init = function(){
    var self = this;
    // Load translations, then finish setup
    this.loadTranslations().finally(function(){
      self.applyLanguage(self.currentLanguage);
      self.cacheElements();
      self.setupEventListeners();
      self.setupLazyLoading();
      self.setupScrollProgress();
      // show welcome notification if translations available
      var msg = self.t('notifications.welcome') || (self.currentLanguage === 'ar' ? 'مرحباً بك في كنز المعرفة!' : 'Welcome!');
      self.showNotification(msg, {type: 'info', autoHide: 6000});
    });
  };

  // Fetch translations.json safely
  KnowledgeTreasury.prototype.loadTranslations = function(){
    var self = this;
    return fetch('translations.json', {cache: 'reload'})
      .then(function(res){
        if (!res.ok) throw new Error('Failed to fetch translations.json');
        return res.json();
      })
      .then(function(json){
        self.translations = json || {};
      })
      .catch(function(err){
        console.warn('Could not load translations.json:', err);
        self.translations = self.translations || {};
      });
  };

  // Helper to resolve translation keys. Supports dot.notation for nested keys.
  KnowledgeTreasury.prototype.t = function(key, vars){
    if (!key) return '';
    var lang = this.currentLanguage || 'ar';
    // Try nested resolution
    var parts = key.split('.');
    var node = this.translations;
    for (var i=0;i<parts.length;i++){
      if (!node) break;
      node = node[parts[i]];
    }
    var value = undefined;
    if (node && typeof node === 'object' && node[lang]) {
      value = node[lang];
    } else if (typeof node === 'string') {
      value = node; // already language-specific string
    } else if (this.translations[key] && this.translations[key][lang]){
      value = this.translations[key][lang];
    }

    // Replace simple ${var} placeholders
    if (value && vars && typeof vars === 'object'){
      Object.keys(vars).forEach(function(k){
        value = value.replace(new RegExp('\\$\\{' + k + '\\}','g'), vars[k]);
      });
    }

    return value || '';
  };

  KnowledgeTreasury.prototype.cacheElements = function(){
    this.langButtons = document.querySelectorAll('.lang-btn');
    this.searchInput = document.getElementById('searchInput');
    this.searchBtn = document.getElementById('searchBtn');
    this.contentGrid = document.querySelector('.content-grid');
    this.contentCards = document.querySelectorAll('.content-card');
    this.notificationEl = document.getElementById('notification');
    this.notificationClose = document.getElementById('closeNotification');
    this.progressBar = document.getElementById('progressBar');
    this.mobileMenuBtn = document.getElementById('mobileMenuBtn');
    this.mainNav = document.getElementById('mainNav');
    this.modal = document.getElementById('contentModal');
    this.closeModalBtn = document.getElementById('closeModal');
    // modal fields
    this.modalTitle = document.getElementById('modalTitle');
    this.modalImage = document.getElementById('modalImage');
    this.modalAuthor = document.getElementById('modalAuthor');
    this.modalDuration = document.getElementById('modalDuration');
    this.modalDescription = document.getElementById('modalDescription');
    this.modalPlayBtn = document.getElementById('modalPlayBtn');
  };

  KnowledgeTreasury.prototype.applyLanguage = function(lang){
    this.currentLanguage = lang;
    try{ localStorage.setItem('language', lang); }catch(e){}

    // Update html lang and dir
    var html = document.documentElement;
    html.lang = lang === 'en' ? 'en' : (lang === 'am' ? 'am' : 'ar');
    html.dir = (lang === 'ar') ? 'rtl' : 'ltr';

    // Update font family only when needed (defensive)
    if (lang === 'am') {
      html.style.fontFamily = "'Noto Sans Ethiopic', sans-serif";
    } else {
      html.style.fontFamily = "'Cairo', sans-serif";
    }

    // Update active button
    if (this.langButtons && this.langButtons.length){
      this.langButtons.forEach(function(btn){
        btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
      });
    }

    // Translate page content
    this.translatePage();
  };

  KnowledgeTreasury.prototype.translatePage = function(){
    var nodes = document.querySelectorAll('[data-translate]');
    var self = this;
    nodes.forEach(function(node){
      var key = node.getAttribute('data-translate');
      var translated = self.t(key) || '';
      if (!translated) return; // keep existing text if missing

      // Apply to placeholder for inputs
      if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA'){
        node.placeholder = translated;
      } else if (node.tagName === 'IMG'){
        node.alt = translated;
      } else {
        // preserve HTML structure for some nodes if they contain children
        if (node.children && node.children.length > 0){
          // If node contains only text-equivalent, overwrite textContent.
          // Otherwise skip to avoid breaking nested icons.
          node.childNodes.forEach(function(child){
            if (child.nodeType === Node.TEXT_NODE){ child.textContent = translated; }
          });
        } else {
          node.textContent = translated;
        }
      }
    });
  };

  KnowledgeTreasury.prototype.setupEventListeners = function(){
    var self = this;

    // Language buttons
    if (this.langButtons){
      this.langButtons.forEach(function(btn){
        btn.addEventListener('click', function(){
          var lang = btn.getAttribute('data-lang');
          if (lang) self.applyLanguage(lang);
        });
      });
    }

    // Search
    if (this.searchBtn && this.searchInput){
      this.searchBtn.addEventListener('click', function(e){ e.preventDefault(); self.performSearch(); });
      this.searchInput.addEventListener('keydown', function(e){ if (e.key === 'Enter') { self.performSearch(); } });
    }

    // Filters
    var categoryFilter = document.getElementById('categoryFilter');
    var languageFilter = document.getElementById('languageFilter');
    var typeFilter = document.getElementById('typeFilter');
    [categoryFilter, languageFilter, typeFilter].forEach(function(el){
      if (!el) return;
      el.addEventListener('change', function(){ self.applyFilters(); });
    });

    // Mobile menu
    if (this.mobileMenuBtn && this.mainNav){
      this.mobileMenuBtn.addEventListener('click', function(){
        self.mainNav.classList.toggle('open');
        self.mobileMenuBtn.classList.toggle('open');
      });
    }

    // Notification close
    if (this.notificationClose && this.notificationEl){
      this.notificationClose.addEventListener('click', function(){ self.hideNotification(); });
    }

    // Content action buttons (delegation)
    document.body.addEventListener('click', function(e){
      var target = e.target;
      var actionBtn = target.closest('.action-btn');
      if (actionBtn){
        var card = actionBtn.closest('.content-card');
        if (card){ self.openModalForCard(card); }
        return;
      }

      // Open app modal buttons
      if (target.id === 'googlePlayBtn' || target.id === 'appStoreBtn'){
        e.preventDefault();
        var appModal = document.getElementById('appModal');
        if (appModal) appModal.classList.add('open');
      }

      // Close modals
      if (target.matches('.modal-close, .modal-close *')){
        var modal = target.closest('.modal');
        if (modal) modal.classList.remove('open');
      }
    });

    // Modal close button
    if (this.closeModalBtn){
      this.closeModalBtn.addEventListener('click', function(){ if (self.modal) self.modal.classList.remove('open'); });
    }

    // Modal keyboard accessibility
    window.addEventListener('keydown', function(e){
      if (e.key === 'Escape'){
        document.querySelectorAll('.modal.open').forEach(function(m){ m.classList.remove('open'); });
      }
    });

    // Share / Download (simple handlers)
    this.setupShareAndDownload();
  };

  KnowledgeTreasury.prototype.performSearch = function(){
    var q = (this.searchInput && this.searchInput.value) ? this.searchInput.value.trim() : '';
    if (!q){
      this.showNotification(this.t('notifications.searchEmpty') || 'Please enter a search term', {type: 'warning', autoHide: 3000});
      return;
    }

    var cards = Array.prototype.slice.call(document.querySelectorAll('.content-card'));
    var results = cards.filter(function(card){
      var text = card.textContent || '';
      return text.toLowerCase().indexOf(q.toLowerCase()) !== -1;
    });

    // Show/Hide cards
    cards.forEach(function(card){ card.style.display = 'none'; });
    results.forEach(function(card){ card.style.display = ''; });

    this.showNotification(this.t('notifications.searchResults', {count: results.length, query: q}) || (results.length + ' results found'), {type: 'info', autoHide: 4000});
  };

  KnowledgeTreasury.prototype.applyFilters = function(){
    var cat = document.getElementById('categoryFilter');
    var lang = document.getElementById('languageFilter');
    var type = document.getElementById('typeFilter');

    var catVal = cat ? cat.value : 'all';
    var langVal = lang ? lang.value : 'all';
    var typeVal = type ? type.value : 'all';

    var cards = document.querySelectorAll('.content-card');
    cards.forEach(function(card){
      var ok = true;
      // language
      if (langVal && langVal !== 'all'){
        var cardLang = card.getAttribute('data-language') || '';
        if (cardLang !== langVal) ok = false;
      }
      // category: try to check data-category attribute or title text
      if (catVal && catVal !== 'all'){
        var cardCat = card.getAttribute('data-category') || '';
        if (cardCat){ if (cardCat !== catVal) ok = false; }
        else {
          var title = (card.querySelector('h3') && card.querySelector('h3').textContent) || '';
          if (title.toLowerCase().indexOf(catVal) === -1 && title.toLowerCase().indexOf(catVal) === -1) {
            // If category keyword not found, don't filter strictly (be permissive)
          }
        }
      }
      // type: try to match content-type text
      if (typeVal && typeVal !== 'all'){
        var typeSpan = card.querySelector('.content-type');
        var ttext = typeSpan ? typeSpan.textContent || '' : '';
        if (ttext.toLowerCase().indexOf(typeVal) === -1) ok = false;
      }

      card.style.display = ok ? '' : 'none';
    });

    this.showNotification(this.t('notifications.filterApplied', {filter: (catVal !== 'all' ? catVal : (langVal !== 'all' ? langVal : typeVal))}) || 'Filters updated', {type: 'info', autoHide: 2000});
  };

  KnowledgeTreasury.prototype.setupShareAndDownload = function(){
    document.body.addEventListener('click', function(e){
      var target = e.target.closest('.action-btn');
      if (!target) return;
      if (target.getAttribute('data-action') === 'download' || /download/i.test(target.textContent)){
        // For demo, just show a notification
        e.preventDefault();
        var title = (target.closest('.content-card') && target.closest('.content-card').querySelector('h3')) ? target.closest('.content-card').querySelector('h3').textContent : 'content';
        var msg = 'Preparing download for "' + title + '"';
        // Use basic alert as fallback for older environments
        if (navigator.msSaveBlob || ('download' in document.createElement('a'))){
          // Real download could be implemented if file URLs are available.
        }
        // show notification (no dependency)
        var nt = document.getElementById('notification');
        if (nt) { nt.classList.add('show'); }
      }
    });
  };

  KnowledgeTreasury.prototype.openModalForCard = function(card){
    if (!card) return;
    var title = (card.querySelector('h3') && card.querySelector('h3').textContent) || '';
    var img = card.querySelector('.card-image img');
    var author = (card.querySelector('.card-meta span') && card.querySelector('.card-meta span').textContent) || '';
    var duration = (card.querySelector('.card-meta span:nth-child(2)') && card.querySelector('.card-meta span:nth-child(2)').textContent) || '';
    var desc = (card.querySelector('.card-description') && card.querySelector('.card-description').textContent) || '';

    if (this.modalTitle) this.modalTitle.textContent = title;
    if (this.modalImage) {
      this.modalImage.innerHTML = '';
      if (img){
        var clone = img.cloneNode(true); clone.loading = 'eager'; clone.alt = title || clone.alt || '';
        this.modalImage.appendChild(clone);
      }
    }
    if (this.modalAuthor) this.modalAuthor.textContent = author;
    if (this.modalDuration) this.modalDuration.textContent = duration;
    if (this.modalDescription) this.modalDescription.textContent = desc;

    if (this.modal) this.modal.classList.add('open');
  };

  KnowledgeTreasury.prototype.showNotification = function(message, opts){
    if (!message) return;
    var opt = opts || {};
    var el = document.getElementById('notification');
    if (!el) return; // no notification element

    // set text content but preserve icon structure
    var strong = el.querySelector('strong');
    var p = el.querySelector('p');
    if (strong) strong.textContent = this.t('notificationTitle') || '';
    if (p) p.textContent = message;

    el.classList.add('show');
    if (this.notificationTimeout) clearTimeout(this.notificationTimeout);
    if (opt.autoHide) this.notificationTimeout = setTimeout(this.hideNotification.bind(this), opt.autoHide);
  };

  KnowledgeTreasury.prototype.hideNotification = function(){
    var el = document.getElementById('notification');
    if (!el) return;
    el.classList.remove('show');
  };

  KnowledgeTreasury.prototype.setupLazyLoading = function(){
    var images = document.querySelectorAll('img[loading="lazy"]');
    if ('IntersectionObserver' in window && images.length){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (entry.isIntersecting){
            var img = entry.target;
            // ensure src is present (img already loads from src in this repo)
            if (img.dataset && img.dataset.src){ img.src = img.dataset.src; }
            io.unobserve(img);
          }
        });
      }, {rootMargin: '200px 0px'});
      images.forEach(function(img){ io.observe(img); });
    }
  };

  KnowledgeTreasury.prototype.setupScrollProgress = function(){
    var self = this;
    var bar = document.getElementById('progressBar');
    if (!bar) return;
    window.addEventListener('scroll', function(){
      var doc = document.documentElement;
      var scrollTop = (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);
      var height = doc.scrollHeight - doc.clientHeight;
      var pct = (height > 0) ? Math.min(100, Math.round((scrollTop / height) * 100)) : 0;
      bar.style.width = pct + '%';
    }, {passive: true});
  };

  // Instantiate
  document.addEventListener('DOMContentLoaded', function(){
    try{ window.app = new KnowledgeTreasury(); }catch(e){ console.error('App failed to initialize', e); }
  });

})();

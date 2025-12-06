// script.js - وظائف متقدمة لموقع كنز المعرفة

// Polyfills للمتصفحات القديمة
if (!window.IntersectionObserver) {
    import('https://polyfill.io/v3/polyfill.min.js?features=IntersectionObserver');
}

// Polyfill لـ requestAnimationFrame
if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function(callback) {
        return setTimeout(callback, 16);
    };
}

class KnowledgeTreasury {
    constructor() {
        this.currentLanguage = localStorage.getItem('language') || 'ar';
        this.translations = {};
        this.notifications = [];
        this.searchSuggestions = [];
        this.contentFilters = { category: 'all', sort: 'date' };
        this.observers = [];
        this.init();
    }

    init() {
        this.loadTranslations().then(() => {
            this.applyLanguage(this.currentLanguage);
            this.setupEventListeners();
            this.setupIntersectionObserver();
            this.setupScrollEffects();
            this.showWelcomeNotification();
        });
    }

    // تحميل ملف الترجمات
    async loadTranslations() {
        try {
            const response = await fetch('translations.json');
            this.translations = await response.json();
        } catch (error) {
            console.error('فشل في تحميل ملف الترجمات:', error);
        }
    }

    // تطبيق اللغة
    applyLanguage(lang) {
        this.currentLanguage = lang;
        localStorage.setItem('language', lang);

        // تغيير lang و dir للـ html
        const html = document.documentElement;
        html.lang = lang;
        html.dir = lang === 'ar' ? 'rtl' : 'ltr';

        // تغيير الخط
        html.style.fontFamily = lang === 'am' ? "'Noto Sans Ethiopic', sans-serif" : "'Cairo', sans-serif";

        // ترجمة النصوص
        this.translatePage(lang);

        // تحديث أزرار اللغة
        this.updateLanguageButtons(lang);

        // إشعار تغيير اللغة
        this.showNotification('languageChange', { lang: lang === 'ar' ? 'العربية' : 'አማርኛ' }, 'info');
    }

    // ترجمة الصفحة
    translatePage(lang) {
        const elements = document.querySelectorAll('[data-translate]');
        elements.forEach(element => {
            const key = element.getAttribute('data-translate');
            const translation = this.getTranslation(key, lang);
            if (translation) {
                if (element.tagName === 'INPUT' && element.type === 'text') {
                    element.placeholder = translation;
                } else {
                    element.textContent = translation;
                }
            }
        });
    }

    // الحصول على الترجمة
    getTranslation(key, lang) {
        const keys = key.split('.');
        let value = this.translations;
        for (const k of keys) {
            value = value?.[k];
        }
        return value?.[lang] || value;
    }

    // تحديث أزرار اللغة
    updateLanguageButtons(activeLang) {
        const buttons = document.querySelectorAll('.language-switcher button');
        buttons.forEach(button => {
            const lang = button.getAttribute('data-lang');
            button.classList.toggle('active', lang === activeLang);
        });
    }

    // إعداد مبدل اللغة
    setupLanguageSwitcher() {
        const languageButtons = document.querySelectorAll('.language-switcher button');
        languageButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const language = e.target.getAttribute('data-lang');
                this.applyLanguage(language);
            });
        });
    }

    // نظام الإشعارات
    showNotification(key, params = {}, type = 'info') {
        const message = this.getTranslation(`notifications.${key}`, this.currentLanguage);
        if (!message) return;

        let formattedMessage = message;
        for (const [param, value] of Object.entries(params)) {
            formattedMessage = formattedMessage.replace(`\${${param}}`, value);
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${formattedMessage}</span>
            <button class="notification-close">&times;</button>
        `;

        document.body.appendChild(notification);

        // تشغيل صوت الإشعار
        this.playNotificationSound();

        // إضافة تأثير ظهور
        setTimeout(() => notification.classList.add('show'), 10);

        // إزالة تلقائية بعد 5 ثوانٍ
        setTimeout(() => this.removeNotification(notification), 5000);

        // إزالة عند النقر على زر الإغلاق
        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.removeNotification(notification);
        });
    }

    // وظيفة تشغيل صوت الإشعار
    playNotificationSound() {
        const audio = document.getElementById('notificationSound');
        if (audio) {
            audio.currentTime = 0; // إعادة تشغيل من البداية
            audio.play().catch(error => {
                console.log('تعذر تشغيل الصوت:', error);
            });
        }
    }

    removeNotification(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    showWelcomeNotification() {
        setTimeout(() => {
            this.showNotification('welcome', {}, 'success');
        }, 1000);
    }

    // البحث المتقدم مع اقتراحات
    setupSearch() {
        const searchInput = document.querySelector('.search-box input');
        const searchButton = document.querySelector('.search-box button');
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'search-suggestions';
        searchInput.parentNode.appendChild(suggestionsContainer);

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query.length > 1) {
                this.generateSearchSuggestions(query);
                this.showSearchSuggestions();
            } else {
                this.hideSearchSuggestions();
            }
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.performSearch(searchInput.value.trim());
            }
        });

        searchButton.addEventListener('click', () => {
            this.performSearch(searchInput.value.trim());
        });

        // إخفاء الاقتراحات عند النقر خارجها
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                this.hideSearchSuggestions();
            }
        });
    }

    generateSearchSuggestions(query) {
        // محاكاة اقتراحات البحث (في التطبيق الحقيقي، سيتم جلبها من API)
        const allContent = [
            'علم الفلك', 'الذكاء الاصطناعي', 'التاريخ القديم', 'الأدب العربي',
            'الصحة النفسية', 'البرمجة', 'الفيزياء', 'الكيمياء'
        ];
        this.searchSuggestions = allContent.filter(item =>
            item.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5);
    }

    showSearchSuggestions() {
        const suggestionsContainer = document.querySelector('.search-suggestions');
        suggestionsContainer.innerHTML = '';

        this.searchSuggestions.forEach(suggestion => {
            const suggestionElement = document.createElement('div');
            suggestionElement.className = 'search-suggestion';
            suggestionElement.textContent = suggestion;
            suggestionElement.addEventListener('click', () => {
                document.querySelector('.search-box input').value = suggestion;
                this.performSearch(suggestion);
                this.hideSearchSuggestions();
            });
            suggestionsContainer.appendChild(suggestionElement);
        });

        suggestionsContainer.style.display = 'block';
    }

    hideSearchSuggestions() {
        const suggestionsContainer = document.querySelector('.search-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
    }

    performSearch(query) {
        if (!query) {
            this.showNotification('searchEmpty', {}, 'warning');
            return;
        }

        // محاكاة نتائج البحث (في التطبيق الحقيقي، سيتم جلبها من API)
        const mockResults = Math.floor(Math.random() * 50) + 1;
        this.showNotification('searchResults', { count: mockResults, query }, 'success');

        // هنا يمكن إضافة منطق لعرض النتائج
    }

    // المرشحات والترتيب
    setupFilters() {
        const filterButtons = document.querySelectorAll('#latest .filters button');
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const filterType = e.target.getAttribute('data-filter') || e.target.textContent.toLowerCase();
                this.applyFilter(filterType);
            });
        });
    }

    applyFilter(filterType) {
        this.contentFilters.sort = filterType;
        this.showNotification('filterApplied', { filter: filterType }, 'info');

        // محاكاة ترتيب المحتوى
        const contentCards = document.querySelectorAll('#latest .content-card');
        const sortedCards = Array.from(contentCards).sort((a, b) => {
            if (filterType === 'date') {
                return Math.random() - 0.5; // محاكاة
            } else if (filterType === 'popularity') {
                return Math.random() - 0.5; // محاكاة
            }
            return 0;
        });

        const contentGrid = document.querySelector('#latest .content-grid');
        contentGrid.innerHTML = '';
        sortedCards.forEach(card => contentGrid.appendChild(card));
    }

    // Intersection Observer للتأثيرات عند الظهور مع تحسين الأداء
    setupIntersectionObserver() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    // إيقاف المراقبة بعد الظهور لتوفير الذاكرة
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // مراقبة العناصر التي تحتاج تأثيرات
        const animateElements = document.querySelectorAll('.category-card, .content-card, .author-card');
        animateElements.forEach(element => {
            observer.observe(element);
        });

        this.observers.push(observer);
    }

    // تأثيرات الحركة المتقدمة مع تحسين الأداء
    setupScrollEffects() {
        let ticking = false;

        // Parallax effect للخلفية
        const heroBackground = document.querySelector('.hero-background img');
        if (heroBackground) {
            heroBackground.style.willChange = 'transform';
        }

        // Scroll effects للعناوين
        const sectionTitles = document.querySelectorAll('section h2');
        sectionTitles.forEach(title => {
            title.style.willChange = 'transform, opacity';
        });

        const scrollHandler = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const scrollTop = window.pageYOffset;

                    // Parallax effect
                    if (heroBackground) {
                        const scrolled = scrollTop;
                        const rate = scrolled * -0.5;
                        heroBackground.style.transform = `translateY(${rate}px)`;
                    }

                    // Scroll effects للعناوين
                    sectionTitles.forEach(title => {
                        const rect = title.getBoundingClientRect();
                        const elementTop = rect.top + scrollTop;
                        const distance = scrollTop - elementTop + window.innerHeight;

                        if (distance > 0 && distance < window.innerHeight) {
                            const progress = distance / window.innerHeight;
                            title.style.transform = `translateY(${progress * -20}px)`;
                            title.style.opacity = 0.5 + progress * 0.5;
                        }
                    });

                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', scrollHandler, { passive: true });
    }

    // معالجة الأحداث العامة
    setupEventListeners() {
        this.setupLanguageSwitcher();
        this.setupSearch();
        this.setupFilters();

        // معالجة أزرار التحميل
        const downloadButtons = document.querySelectorAll('.download-buttons a');
        downloadButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const platform = e.target.textContent.includes('App Store') ? 'App Store' : 'Google Play';
                this.showNotification('downloadSoon', { platform }, 'info');
            });
        });

        // معالجة روابط "اقرأ المزيد" و "عرض المزيد"
        const readMoreLinks = document.querySelectorAll('a[href="#"]');
        readMoreLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const action = e.target.textContent;
                this.showNotification('featureDeveloping', { action }, 'warning');
            });
        });

        // معالجة أزرار المصادقة
        const authButtons = document.querySelectorAll('.auth-buttons button');
        authButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const action = e.target.textContent;
                this.showNotification('featureDeveloping', { action }, 'warning');
            });
        });

        // معالجة روابط الفئات
        const categoryCards = document.querySelectorAll('.category-card');
        categoryCards.forEach(card => {
            card.addEventListener('click', () => {
                const categoryName = card.querySelector('h3').textContent;
                this.showNotification('openDetail', {}, 'info');
            });
        });

        // تنظيف الذاكرة عند إغلاق الصفحة
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    // تنظيف الذاكرة وإزالة event listeners
    cleanup() {
        // إيقاف جميع الـ observers
        this.observers.forEach(observer => {
            observer.disconnect();
        });
        this.observers = [];

        // تنظيف المتغيرات
        this.notifications = [];
        this.searchSuggestions = [];
    }
}

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    new KnowledgeTreasury();
});
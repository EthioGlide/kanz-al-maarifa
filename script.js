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
        this.cachedElements = null;
        this.searchQuery = '';
        this.init();
    }

    init() {
        console.log('Initializing KnowledgeTreasury...');
        this.loadTranslations().then(() => {
            console.log('Translations loaded successfully');
            this.applyLanguage(this.currentLanguage);
            this.cachedElements = document.querySelectorAll('[data-translate]');
            console.log('Found', this.cachedElements.length, 'translatable elements');
            this.setupEventListeners();
            this.setupIntersectionObserver();
            this.setupScrollEffects();
            this.showWelcomeNotification();
        }).catch(error => {
            console.error('Failed to initialize:', error);
        });
    }

    // تحميل ملف الترجمات
    async loadTranslations(retryCount = 0) {
        try {
            console.log('Loading translations from translations.json...');
            const response = await fetch('translations.json');
            console.log('Fetch response status:', response.status);
            if (!response.ok) throw new Error('Network response was not ok');
            this.translations = await response.json();
            console.log('Translations loaded:', Object.keys(this.translations));
        } catch (error) {
            console.error('فشل في تحميل ملف الترجمات:', error);
            if (retryCount < 3) {
                console.log(`إعادة المحاولة ${retryCount + 1} لتحميل الترجمات...`);
                setTimeout(() => this.loadTranslations(retryCount + 1), 1000);
            } else {
                console.error('Failed to load translations after retries');
                this.showNotification('error', {}, 'error');
                // Fallback to empty object
                this.translations = {};
            }
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
        const langName = lang === 'ar' ? 'العربية' : lang === 'en' ? 'English' : 'አማርኛ';
        this.showNotification('languageChange', { lang: langName }, 'info');
    }

    // ترجمة الصفحة
    translatePage(lang) {
        try {
            this.cachedElements.forEach(element => {
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
        } catch (error) {
            console.error('خطأ في ترجمة الصفحة:', error);
            this.showNotification('error', {}, 'error');
        }
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

        try {
            document.body.appendChild(notification);
        } catch (error) {
            console.error('خطأ في عرض الإشعار:', error);
            return;
        }

        // تشغيل صوت الإشعار
        this.playNotificationSound();

        // إضافة تأثير ظهور
        setTimeout(() => notification.classList.add('show'), 10);

        // إزالة تلقائية بعد 5 ثوانٍ
        setTimeout(() => this.removeNotification(notification), 5000);

        // إزالة عند النقر على زر الإغلاق
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.removeNotification(notification);
            });
        }
    }

    // وظيفة تشغيل صوت الإشعار
    playNotificationSound() {
        const audio = document.getElementById('notificationSound');
        console.log('Notification audio element:', audio);
        if (audio) {
            console.log('Attempting to play notification sound');
            audio.play().catch(error => {
                console.error('فشل في تشغيل صوت الإشعار:', error);
            });
        } else {
            console.warn('Notification audio element not found');
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
        // اقتراحات البحث من المحتوى الإسلامي
        const allContent = [
            'تفسير القرآن', 'حديث نبوي', 'فقه إسلامي', 'عقيدة إسلامية',
            'تزكية النفس', 'دعوة إسلامية', 'سيرة النبي', 'علوم الحديث',
            'أصول الفقه', 'التصوف الإسلامي', 'الأخلاق الإسلامية'
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

        try {
            const contentCards = document.querySelectorAll('#latest .content-card');
            let matchCount = 0;

            contentCards.forEach(card => {
                const title = card.querySelector('h3').textContent.toLowerCase();
                const description = card.querySelector('.card-description').textContent.toLowerCase();
                const author = card.querySelector('.card-meta span:first-child').textContent.toLowerCase();

                const matches = title.includes(query.toLowerCase()) ||
                               description.includes(query.toLowerCase()) ||
                               author.includes(query.toLowerCase());

                card.style.display = matches ? 'block' : 'none';
                if (matches) matchCount++;
            });

            if (matchCount > 0) {
                this.showNotification('searchResults', { count: matchCount, query }, 'success');
            } else {
                this.showNotification('noResults', {}, 'warning');
            }
        } catch (error) {
            console.error('خطأ في البحث:', error);
            this.showNotification('error', {}, 'error');
        }
    }

    // المرشحات والترتيب
    setupFilters() {
        const categoryFilter = document.getElementById('categoryFilter');
        const typeFilter = document.getElementById('typeFilter');
        const languageFilter = document.getElementById('languageFilter');

        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.applyFilter('category', e.target.value);
            });
        }

        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.applyFilter('type', e.target.value);
            });
        }

        if (languageFilter) {
            languageFilter.addEventListener('change', (e) => {
                this.applyFilter('language', e.target.value);
            });
        }
    }

    applyFilter(filterType, filterValue) {
        console.log('Applying filter:', filterType, filterValue);
        this.contentFilters[filterType] = filterValue;
        this.showNotification('filterApplied', { filter: filterValue }, 'info');

        try {
            const contentCards = document.querySelectorAll('#latest .content-card');
            console.log('Found', contentCards.length, 'content cards to filter');

            contentCards.forEach(card => {
                let showCard = true;

                // First, check if card matches search query (if any)
                if (this.searchQuery) {
                    const title = card.querySelector('h3').textContent.toLowerCase();
                    const description = card.querySelector('.card-description').textContent.toLowerCase();
                    const author = card.querySelector('.card-meta span:first-child').textContent.toLowerCase();
                    const matchesSearch = title.includes(this.searchQuery.toLowerCase()) ||
                                         description.includes(this.searchQuery.toLowerCase()) ||
                                         author.includes(this.searchQuery.toLowerCase());
                    if (!matchesSearch) showCard = false;
                }

                // Apply all active filters
                Object.keys(this.contentFilters).forEach(key => {
                    if (!showCard) return; // Skip if already hidden by search

                    const currentFilterValue = this.contentFilters[key];
                    if (currentFilterValue === 'all') return;

                    // Filter by category
                    if (key === 'category') {
                        const cardTitle = card.querySelector('h3').textContent.toLowerCase();
                        const cardDesc = card.querySelector('.card-description').textContent.toLowerCase();
                        const content = cardTitle + ' ' + cardDesc;

                        if (currentFilterValue === 'quran' && !content.includes('قرآن') && !content.includes('تفسير')) showCard = false;
                        if (currentFilterValue === 'hadith' && !content.includes('حديث') && !content.includes('صالحين')) showCard = false;
                        if (currentFilterValue === 'fiqh' && !content.includes('فقه')) showCard = false;
                        if (currentFilterValue === 'aqeedah' && !content.includes('عقيد') && !content.includes('توحيد')) showCard = false;
                    }

                    // Filter by type
                    if (key === 'type') {
                        const contentType = card.querySelector('.content-type').textContent.toLowerCase();
                        if (currentFilterValue === 'audio' && !contentType.includes('صوتي')) showCard = false;
                        if (currentFilterValue === 'video' && !contentType.includes('مرئي')) showCard = false;
                        if (currentFilterValue === 'text' && !contentType.includes('نصي')) showCard = false;
                    }

                    // Filter by language
                    if (key === 'language') {
                        const cardLanguage = card.getAttribute('data-language') || 'ar'; // Default to Arabic
                        if (cardLanguage !== currentFilterValue) showCard = false;
                    }
                });

                card.style.display = showCard ? 'block' : 'none';
            });

            // Count visible cards
            const visibleCards = Array.from(contentCards).filter(card => card.style.display !== 'none');
            console.log('Visible cards after filtering:', visibleCards.length);

        } catch (error) {
            console.error('خطأ في تطبيق المرشح:', error);
            this.showNotification('error', {}, 'error');
        }
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

        try {
            // مراقبة العناصر التي تحتاج تأثيرات
            const animateElements = document.querySelectorAll('.category-card, .content-card, .author-card');
            animateElements.forEach(element => {
                observer.observe(element);
            });
        } catch (error) {
            console.error('خطأ في إعداد مراقب التقاطع:', error);
            this.showNotification('error', {}, 'error');
        }

        this.observers.push(observer);
    }

    // تأثيرات الحركة المتقدمة مع تحسين الأداء
    setupScrollEffects() {
        let ticking = false;

        // Parallax effect للخلفية
        const heroBackground = document.querySelector('.hero-background img');
        console.log('Hero background element:', heroBackground);
        if (heroBackground) {
            heroBackground.style.willChange = 'transform';
        } else {
            console.warn('Hero background image not found');
        }

        // Scroll effects للعناوين
        const sectionTitles = document.querySelectorAll('section h2');
        sectionTitles.forEach(title => {
            title.style.willChange = 'transform, opacity';
        });

        const scrollHandler = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

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
        console.log('Setting up event listeners...');
        // Cache DOM selectors
        const searchInput = document.querySelector('.search-box input');
        const searchButton = document.querySelector('.search-box button');
        const categoryFilter = document.getElementById('categoryFilter');
        const typeFilter = document.getElementById('typeFilter');
        const languageFilter = document.getElementById('languageFilter');
        const googlePlayBtn = document.getElementById('googlePlayBtn');
        const appStoreBtn = document.getElementById('appStoreBtn');
        const contentCards = document.querySelectorAll('.content-card');
        const closeModalBtn = document.getElementById('closeModal');
        const closeAppModalBtn = document.getElementById('closeAppModal');
        const modals = document.querySelectorAll('.modal');
        const readMoreLinks = document.querySelectorAll('a[href="#"]');
        const authButtons = document.querySelectorAll('.auth-buttons button');
        const categoryCards = document.querySelectorAll('.category-card');
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');

        console.log('DOM elements found:', {
            searchInput: !!searchInput,
            searchButton: !!searchButton,
            categoryFilter: !!categoryFilter,
            typeFilter: !!typeFilter,
            languageFilter: !!languageFilter,
            googlePlayBtn: !!googlePlayBtn,
            appStoreBtn: !!appStoreBtn,
            contentCards: contentCards.length,
            closeModalBtn: !!closeModalBtn,
            closeAppModalBtn: !!closeAppModalBtn,
            modals: modals.length,
            readMoreLinks: readMoreLinks.length,
            authButtons: authButtons.length,
            categoryCards: categoryCards.length,
            mobileMenuBtn: !!mobileMenuBtn
        });

        this.setupLanguageSwitcher();
        this.setupSearch();
        this.setupFilters();

        // معالجة أزرار التحميل
        if (googlePlayBtn) {
            googlePlayBtn.addEventListener('click', () => {
                this.openAppModal();
            });
        }
        if (appStoreBtn) {
            appStoreBtn.addEventListener('click', () => {
                this.openAppModal();
            });
        }

        // معالجة بطاقات المحتوى لفتح المودال
        contentCards.forEach(card => {
            card.addEventListener('click', () => {
                this.openContentModal(card);
            });
        });

        // معالجة إغلاق المودال
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal();
            });
        }
        if (closeAppModalBtn) {
            closeAppModalBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal();
            });
        }

        // إغلاق المودال عند النقر خارج المحتوى
        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        });

        // إغلاق المودال بـ ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });

        // معالجة روابط "اقرأ المزيد" و "عرض المزيد"
        readMoreLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const action = e.target.textContent;
                this.showNotification('featureDeveloping', { action }, 'warning');
            });
        });

        // معالجة أزرار المصادقة
        authButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const action = e.target.textContent;
                this.showNotification('featureDeveloping', { action }, 'warning');
            });
        });

        // معالجة روابط الفئات
        categoryCards.forEach(card => {
            card.addEventListener('click', () => {
                const categoryName = card.querySelector('h3').textContent;
                this.showNotification('openDetail', {}, 'info');
            });
        });

        // معالجة زر القائمة المحمولة
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                const nav = document.getElementById('mainNav');
                if (nav) {
                    nav.classList.toggle('active');
                }
            });
        }

        // تنظيف الذاكرة عند إغلاق الصفحة
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    // Modal functionality
    openContentModal(card) {
        const title = card.querySelector('h3').textContent;
        const author = card.querySelector('.card-meta span:first-child').textContent;
        const duration = card.querySelector('.card-meta span:last-child').textContent;
        const description = card.querySelector('.card-description').textContent;
        const imageSrc = card.querySelector('.card-image img').src;

        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalAuthor').textContent = author;
        document.getElementById('modalDuration').textContent = duration;
        document.getElementById('modalDescription').textContent = description;
        document.getElementById('modalImage').style.backgroundImage = `url(${imageSrc})`;

        const modal = document.getElementById('contentModal');
        modal.style.display = 'block';
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        // Focus management
        modal.focus();
    }

    closeModal() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
        });
        document.body.style.overflow = 'auto';
    }

    openAppModal() {
        const modal = document.getElementById('appModal');
        modal.style.display = 'block';
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        modal.focus();
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

    // شريط التقدم
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = Math.min((scrollTop / docHeight) * 100, 100);
            progressBar.style.width = scrollPercent + '%';
        });
    }
});
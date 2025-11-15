/**
 * Layout Manager
 * Gestisce il caricamento dinamico di header, footer e contenuti SPA
 */
const LayoutManager = {
    currentPage: 'dashboard',
    scriptsLoaded: {},

    /**
     * Inizializza il layout caricando header e footer
     */
    async init() {
        try {
            // Verifica che il container esista
            const contentContainer = document.getElementById('content-container');
            if (!contentContainer) {
                console.error('ERRORE CRITICO: content-container non trovato nel DOM');
                return;
            }
            
            await this.loadHeader();
            await this.loadFooter();
            this.setupNavigation();
            // Carica la pagina iniziale (dashboard)
            await this.loadPage('dashboard');
            // Carica le note presenti...
            // await this.loadChangeNotes();
        } catch (error) {
            console.error('Errore inizializzazione layout:', error);
        }
    },

    /**
     * Carica l'header da file esterno
     */
    async loadHeader() {
        try {
            const response = await fetch('includes/header.html');
            if (!response.ok) throw new Error('Errore caricamento header');
            
            const html = await response.text();
            const headerContainer = document.getElementById('header-container');
            
            if (headerContainer) {
                headerContainer.innerHTML = html;
            }
        } catch (error) {
            console.error('Errore caricamento header:', error);
        }
    },

    /**
     * Carica il componente change-notes da file esterno
     */
    async loadChangeNotes() {
        try {
            const response = await fetch('includes/change-notes.html');
            if (!response.ok) throw new Error('Errore caricamento change-notes');
            
            const html = await response.text();
            const changeNotesContainer = document.getElementById('change-notes-container');
            
            if (changeNotesContainer) {
                changeNotesContainer.innerHTML = html;
            }
        } catch (error) {
            console.error('Errore caricamento change-notes:', error);
        }
    },

    /**
     * Carica il footer da file esterno
     */
    async loadFooter() {
        try {
            const response = await fetch('includes/footer.html');
            if (!response.ok) throw new Error('Errore caricamento footer');
            
            const html = await response.text();
            const footerContainer = document.getElementById('footer-container');
            
            if (footerContainer) {
                footerContainer.innerHTML = html;
            }
        } catch (error) {
            console.error('Errore caricamento footer:', error);
        }
    },

    /**
     * Configura la navigazione per SPA
     */
    setupNavigation() {
        setTimeout(() => {
            const navLinks = document.querySelectorAll('.navbar-nav .nav-link[data-page]');
            
            navLinks.forEach(link => {
                link.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const pageName = link.getAttribute('data-page');
                    await this.loadPage(pageName);
                });
            });
        }, 100);
    },

    /**
     * Carica dinamicamente una pagina
     */
    async loadPage(pageName) {
        try {
            this.currentPage = pageName;
            const contentContainer = document.getElementById('content-container');
            
            if (!contentContainer) {
                console.error('Content container non trovato');
                return;
            }

            // Mostra spinner
            contentContainer.innerHTML = `
                <div class="text-center py-5">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Caricamento...</span>
                    </div>
                </div>
            `;

            // Carica il contenuto della pagina
            const response = await fetch(`${pageName}.html`);
            if (!response.ok) throw new Error(`Errore caricamento pagina: ${pageName}`);
            
            const html = await response.text();
            contentContainer.innerHTML = html;

            // Aggiorna la navbar
            this.setActiveNavItem(pageName);

            // Carica gli script necessari per la pagina
            await this.loadPageScripts(pageName);
        } catch (error) {
            console.error('Errore caricamento pagina:', error);
            document.getElementById('content-container').innerHTML = `
                <div class="alert alert-danger m-4">
                    <h4>Errore di caricamento</h4>
                    <p>Impossibile caricare la pagina richiesta.</p>
                </div>
            `;
        }
    },

    /**
     * Carica gli script JavaScript necessari per la pagina
     */
    async loadPageScripts(pageName) {
        const scriptMap = {
            'dashboard': ['js/utils.js', 'js/evidenze.js', 'js/app.js', 'js/verbali-sabes.js'],
            'ricerca': ['js/utils.js', 'js/ricerca.js'],
            'dettaglio': ['js/utils.js', 'js/dettaglio.js'],
            'documenti': ['js/utils.js', 'js/documenti.js'],
            'editor': ['js/utils.js', 'js/editor.js'],
            'documentazione': []
        };

        const scripts = scriptMap[pageName] || [];

        for (const scriptSrc of scripts) {
            // Evita di ricaricare script già caricati
            if (this.scriptsLoaded[scriptSrc]) {
                continue;
            }

            await this.loadScript(scriptSrc);
            this.scriptsLoaded[scriptSrc] = true;
        }

        // Inizializza l'app specifica della pagina se esiste
        this.initPageApp(pageName);
    },

    /**
     * Carica uno script JavaScript
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            // Rimuovi eventuali script precedenti con lo stesso src
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                existingScript.remove();
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Errore caricamento script: ${src}`));
            document.body.appendChild(script);
        });
    },

    /**
     * Inizializza l'applicazione specifica della pagina
     */
    initPageApp(pageName) {
        try {
            switch(pageName) {
                case 'dashboard':
                    if (typeof App !== 'undefined' && App.init) {
                        App.init();
                    }
                    // Inizializza anche VerbaliSabesManager
                    if (typeof VerbaliSabesManager !== 'undefined' && VerbaliSabesManager.init) {
                        setTimeout(() => {
                            VerbaliSabesManager.init();
                        }, 500);
                    }
                    break;
                case 'ricerca':
                    if (typeof RicercaApp !== 'undefined' && RicercaApp.init) {
                        RicercaApp.init();
                    }
                    break;
                case 'dettaglio':
                    if (typeof DettaglioApp !== 'undefined' && DettaglioApp.init) {
                        DettaglioApp.init();
                    }
                    break;
                case 'documenti':
                    if (typeof DocumentiApp !== 'undefined' && DocumentiApp.init) {
                        DocumentiApp.init();
                    }
                    break;
                case 'editor':
                    if (typeof EditorApp !== 'undefined' && EditorApp.init) {
                        EditorApp.init();
                    }
                    break;
            }
        } catch (error) {
            console.error('Errore inizializzazione app:', error);
        }
    },

    /**
     * Imposta il link della navbar come attivo
     */
    setActiveNavItem(pageName) {
        const navLinks = document.querySelectorAll('.navbar-nav .nav-link[data-page]');
        
        navLinks.forEach(link => {
            const linkPageName = link.getAttribute('data-page');
            
            if (linkPageName === pageName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
};

// Inizializza il layout quando il DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM caricato, inizializzazione LayoutManager...');
        LayoutManager.init();
    });
} else {
    // DOM già caricato
    console.log('DOM già pronto, inizializzazione immediata LayoutManager...');
    LayoutManager.init();
}

/**
 * Theme Switcher
 * Permette di switchare tra diversi temi dinamicamente
 */
const ThemeSwitcher = {
    STORAGE_KEY: 'asse_inciso_theme',
    currentTheme: 'default',
    
    themes: {
        default: {
            name: 'Bootstrap Default',
            description: 'Tema base Bootstrap',
            css: null, // No custom CSS
            icon: 'bi-bootstrap'
        },
        professional: {
            name: 'Professional',
            description: 'Tema grigio professionale',
            css: 'css/theme-professional.css',
            icon: 'bi-briefcase'
        },
        luxe: {
            name: 'Luxe',
            description: 'Colori logo INCISO',
            css: 'css/theme-luxe.css',
            icon: 'bi-gem'
        }
    },

    /**
     * Inizializza il theme switcher
     */
    init() {
        this.loadSavedTheme();
        this.createSwitcherUI();
        this.applyTheme(this.currentTheme);
    },

    /**
     * Carica il tema salvato
     */
    loadSavedTheme() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved && this.themes[saved]) {
            this.currentTheme = saved;
        }
    },

    /**
     * Salva il tema
     */
    saveTheme(themeName) {
        localStorage.setItem(this.STORAGE_KEY, themeName);
    },

    /**
     * Applica un tema
     */
    applyTheme(themeName) {
        if (!this.themes[themeName]) return;

        // Rimuovi tutti i temi custom esistenti
        document.querySelectorAll('link[data-theme]').forEach(link => {
            link.remove();
        });

        // Applica il nuovo tema se non è default
        if (themeName !== 'default' && this.themes[themeName].css) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = this.themes[themeName].css;
            link.setAttribute('data-theme', themeName);
            document.head.appendChild(link);
        }

        this.currentTheme = themeName;
        this.saveTheme(themeName);
        this.updateSwitcherUI();
        
        // Toast notification
        if (typeof Utils !== 'undefined') {
            Utils.showToast(`Tema "${this.themes[themeName].name}" applicato`, 'success');
        }
    },

    /**
     * Crea l'interfaccia del theme switcher
     */
    createSwitcherUI() {
        // Aggiungi il bottone nella navbar se esiste
        const navbar = document.querySelector('.navbar .navbar-nav.ms-auto');
        if (!navbar) return;

        // Crea dropdown tema
        const themeDropdown = document.createElement('li');
        themeDropdown.className = 'nav-item dropdown';
        themeDropdown.innerHTML = `
            <a class="nav-link dropdown-toggle" href="#" id="themeDropdown" role="button" 
               data-bs-toggle="dropdown" aria-expanded="false">
                <i class="bi bi-palette"></i> Tema
            </a>
            <ul class="dropdown-menu dropdown-menu-end" id="themeDropdownMenu">
                ${Object.entries(this.themes).map(([key, theme]) => `
                    <li>
                        <a class="dropdown-item theme-option" href="#" data-theme="${key}">
                            <i class="${theme.icon}"></i> 
                            ${theme.name}
                            <small class="d-block text-muted" style="font-size: 0.75rem;">${theme.description}</small>
                            <span class="theme-check" style="display: none;">
                                <i class="bi bi-check-circle-fill text-success"></i>
                            </span>
                        </a>
                    </li>
                `).join('')}
            </ul>
        `;

        // Inserisci prima del dropdown utente
        const userDropdown = navbar.querySelector('.dropdown');
        if (userDropdown) {
            navbar.insertBefore(themeDropdown, userDropdown);
        } else {
            navbar.appendChild(themeDropdown);
        }

        // Event listeners
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                const themeName = option.getAttribute('data-theme');
                this.applyTheme(themeName);
            });
        });

        this.updateSwitcherUI();
    },

    /**
     * Aggiorna l'UI del switcher
     */
    updateSwitcherUI() {
        // Rimuovi tutti i check
        document.querySelectorAll('.theme-check').forEach(check => {
            check.style.display = 'none';
        });

        // Aggiungi check al tema corrente
        const currentOption = document.querySelector(`[data-theme="${this.currentTheme}"]`);
        if (currentOption) {
            const check = currentOption.querySelector('.theme-check');
            if (check) {
                check.style.display = 'inline';
            }
        }
    }
};

// Inizializza quando il DOM è pronto e dopo che il layout manager ha caricato la navbar
document.addEventListener('DOMContentLoaded', () => {
    // Attendi che la navbar sia caricata
    setTimeout(() => {
        if (document.querySelector('.navbar')) {
            ThemeSwitcher.init();
        }
    }, 300);
});

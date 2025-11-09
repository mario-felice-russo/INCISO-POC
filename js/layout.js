/**
 * Layout Manager
 * Gestisce il caricamento dinamico di header e footer
 */
const LayoutManager = {
    /**
     * Inizializza il layout caricando header, change-notes e footer
     */
    async init() {
        await this.loadHeader();
        await this.loadChangeNotes();
        await this.loadFooter();
        this.setActiveNavItem();
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
     * Imposta il link della navbar come attivo in base alla pagina corrente
     */
    setActiveNavItem() {
        // Ottieni il nome del file della pagina corrente
        const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
        
        // Attendi che il DOM sia aggiornato dopo il caricamento dell'header
        setTimeout(() => {
            const navLinks = document.querySelectorAll('.navbar-nav .nav-link[data-page]');
            
            navLinks.forEach(link => {
                const pageName = link.getAttribute('data-page');
                
                if (pageName === currentPage) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        }, 100);
    }
};

// Inizializza il layout quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    LayoutManager.init();
});

/* ========================================
   ASSE InCiSo - Utils.js
   Funzioni di utilità
   ======================================== */

const Utils = {
    /**
     * Formattazione data da ISO a formato italiano
     * @param {string} isoDate - Data in formato ISO (YYYY-MM-DD)
     * @returns {string} Data formato italiano (DD/MM/YYYY)
     */
    formatDate(isoDate) {
        if (!isoDate) return '-';
        const date = new Date(isoDate);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    },

    /**
     * Formattazione data e ora da ISO a formato italiano
     * @param {string} isoDateTime - Data/ora in formato ISO
     * @returns {string} Data/ora formato italiano
     */
    formatDateTime(isoDateTime) {
        if (!isoDateTime) return '-';
        const date = new Date(isoDateTime);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    },

    /**
     * Calcola giorni rimanenti dalla data odierna
     * @param {string} isoDate - Data in formato ISO
     * @returns {number} Giorni rimanenti (negativi se scaduta)
     */
    daysFromNow(isoDate) {
        if (!isoDate) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const targetDate = new Date(isoDate);
        targetDate.setHours(0, 0, 0, 0);
        const diffTime = targetDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    },

    /**
     * Determina lo stato di un'evidenza in base alla data di scadenza
     * @param {string} dataScadenza - Data scadenza ISO
     * @returns {string} 'Scaduta' | 'Corrente' | 'Futura'
     */
    getEvidenzaStato(dataScadenza) {
        const days = this.daysFromNow(dataScadenza);
        if (days === null) return 'Futura';
        if (days < 0) return 'Scaduta';
        if (days <= 30) return 'Corrente';
        return 'Futura';
    },

    /**
     * Formattazione importo monetario
     * @param {number} amount - Importo numerico
     * @returns {string} Importo formattato (es. "1.234,56 €")
     */
    formatCurrency(amount) {
        if (amount === null || amount === undefined) return '-';
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    },

    /**
     * Normalizza stringa per ricerca (lowercase, trim, no accenti)
     * @param {string} str - Stringa da normalizzare
     * @returns {string} Stringa normalizzata
     */
    normalizeString(str) {
        if (!str) return '';
        return str.toLowerCase()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    },

    /**
     * Filtra array di oggetti per query di ricerca
     * @param {Array} items - Array di oggetti
     * @param {string} query - Query di ricerca
     * @param {Array} fields - Campi su cui cercare
     * @returns {Array} Array filtrato
     */
    searchItems(items, query, fields) {
        if (!query || query.trim() === '') return items;
        
        const normalizedQuery = this.normalizeString(query);
        
        return items.filter(item => {
            return fields.some(field => {
                const value = item[field];
                if (value === null || value === undefined) return false;
                return this.normalizeString(String(value)).includes(normalizedQuery);
            });
        });
    },

    /**
     * Ordina array per campo
     * @param {Array} items - Array da ordinare
     * @param {string} field - Campo di ordinamento
     * @param {string} direction - 'asc' | 'desc'
     * @returns {Array} Array ordinato
     */
    sortBy(items, field, direction = 'asc') {
        return [...items].sort((a, b) => {
            let valA = a[field];
            let valB = b[field];
            
            // Gestione null/undefined
            if (valA === null || valA === undefined) return 1;
            if (valB === null || valB === undefined) return -1;
            
            // Confronto
            if (typeof valA === 'string') {
                valA = this.normalizeString(valA);
                valB = this.normalizeString(valB);
            }
            
            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    },

    /**
     * Raggruppa array per campo
     * @param {Array} items - Array da raggruppare
     * @param {string} field - Campo di raggruppamento
     * @returns {Object} Oggetto con chiavi = valori del campo
     */
    groupBy(items, field) {
        return items.reduce((groups, item) => {
            const key = item[field] || 'Altro';
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item);
            return groups;
        }, {});
    },

    /**
     * Debounce function per ottimizzare ricerche
     * @param {Function} func - Funzione da eseguire
     * @param {number} wait - Millisecondi di attesa
     * @returns {Function} Funzione debounced
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Mostra toast notification
     * @param {string} message - Messaggio da mostrare
     * @param {string} type - 'success' | 'error' | 'warning' | 'info'
     */
    showToast(message, type = 'info') {
        // Crea container se non esiste
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999;';
            document.body.appendChild(container);
        }

        // Mappa tipo a classe Bootstrap
        const typeMap = {
            success: 'bg-success',
            error: 'bg-danger',
            warning: 'bg-warning',
            info: 'bg-info'
        };

        // Crea toast
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white ${typeMap[type] || typeMap.info} border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        container.appendChild(toast);

        // Inizializza e mostra
        const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
        bsToast.show();

        // Rimuovi dopo nascondimento
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    },

    /**
     * Valida Codice Fiscale italiano
     * @param {string} cf - Codice fiscale
     * @returns {boolean} True se valido
     */
    validateCodiceFiscale(cf) {
        if (!cf) return false;
        const regex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
        return regex.test(cf.toUpperCase());
    },

    /**
     * Salva in localStorage
     * @param {string} key - Chiave
     * @param {*} value - Valore (verrà serializzato in JSON)
     */
    saveToStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Errore salvataggio localStorage:', e);
            return false;
        }
    },

    /**
     * Carica da localStorage
     * @param {string} key - Chiave
     * @returns {*} Valore deserializzato o null
     */
    loadFromStorage(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('Errore caricamento localStorage:', e);
            return null;
        }
    },

    /**
     * Rimuove da localStorage
     * @param {string} key - Chiave
     */
    removeFromStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Errore rimozione localStorage:', e);
            return false;
        }
    },

    /**
     * Genera ID univoco semplice
     * @returns {string} ID univoco
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Escape HTML per prevenire XSS
     * @param {string} text - Testo da escape
     * @returns {string} Testo escaped
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    },

    /**
     * Ottieni badge CSS class per categoria nota
     * @param {string} categoria - Categoria nota
     * @returns {string} Classe CSS
     */
    getNotaCategoriaClass(categoria) {
        const map = {
            'Residenza': 'cat-residenza',
            'Pagamenti': 'cat-pagamenti',
            'Degenze': 'cat-degenze',
            'Amministrazione Sostegno': 'cat-amministrazione',
            'Generiche': 'cat-generiche'
        };
        return map[categoria] || 'cat-generiche';
    },

    /**
     * Ottieni classe colore per priorità evidenza
     * @param {string} priorita - Priorità
     * @returns {string} Classe Bootstrap
     */
    getPrioritaClass(priorita) {
        const map = {
            'Alta': 'danger',
            'Media': 'warning',
            'Bassa': 'info'
        };
        return map[priorita] || 'secondary';
    },

    /**
     * Carica file JSON
     * @param {string} url - URL del file JSON
     * @returns {Promise<Object>} Promise con dati JSON
     */
    async loadJSON(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Errore caricamento ${url}:`, error);
            throw error;
        }
    }
};

// Export per uso come modulo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}

/* ========================================
   ASSE InCiSo - Editor.js
   Gestione configurazione sistema
   ======================================== */

const EditorApp = {
    tipiComunicazioni: [],
    tipiEvidenze: [],

    /**
     * Inizializza l'applicazione
     */
    async init() {
        console.log('Inizializzazione Editor Configurazione...');
        
        try {
            // Carica dati
            await this.loadData();
            
            // Renderizza template
            this.renderTemplateList();
            
            // Renderizza tipi evidenza
            this.renderTipiEvidenza();
            
            // Setup event listeners
            this.setupEventListeners();
            
            Utils.showToast('Editor pronto', 'success');
        } catch (error) {
            console.error('Errore inizializzazione:', error);
            Utils.showToast('Errore caricamento dati', 'error');
        }
    },

    /**
     * Carica dati
     */
    async loadData() {
        const [tipiComunicazioni, tipiEvidenze] = await Promise.all([
            Utils.loadJSON('data/tipo_comunicazioni.json'),
            Utils.loadJSON('data/tipo_evidenze.json')
        ]);

        this.tipiComunicazioni = tipiComunicazioni;
        this.tipiEvidenze = tipiEvidenze;
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Form parametri
        const formParametri = document.getElementById('formParametri');
        if (formParametri) {
            formParametri.addEventListener('submit', (e) => {
                e.preventDefault();
                this.salvaParametri();
            });
        }

        // Pulsanti nuovi template/regole (placeholder)
        const btnNuovoTemplate = document.getElementById('btnNuovoTemplate');
        if (btnNuovoTemplate) {
            btnNuovoTemplate.addEventListener('click', () => {
                Utils.showToast('Funzionalità in sviluppo', 'info');
            });
        }

        const btnNuovaRegola = document.getElementById('btnNuovaRegola');
        if (btnNuovaRegola) {
            btnNuovaRegola.addEventListener('click', () => {
                Utils.showToast('Funzionalità in sviluppo', 'info');
            });
        }
    },

    /**
     * Renderizza lista template
     */
    renderTemplateList() {
        const tbody = document.getElementById('tbodyTemplate');
        if (!tbody) return;

        tbody.innerHTML = this.tipiComunicazioni.map(tipo => `
            <tr>
                <td><code>${tipo.codice}</code></td>
                <td>${Utils.escapeHtml(tipo.descrizione)}</td>
                <td>${tipo.template}</td>
                <td><span class="badge bg-info">${tipo.canale}</span></td>
                <td><span class="badge bg-success">Attivo</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" title="Modifica">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-success" title="Scarica">
                        <i class="bi bi-download"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" title="Anteprima">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Placeholder event listeners
        tbody.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                Utils.showToast('Funzionalità in sviluppo', 'info');
            });
        });
    },

    /**
     * Renderizza tipi evidenza
     */
    renderTipiEvidenza() {
        const container = document.getElementById('tipiEvidenzaList');
        if (!container) return;

        container.innerHTML = `
            <div class="list-group">
                ${this.tipiEvidenze.map(tipo => `
                    <div class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <span class="badge bg-${tipo.colore} me-2">
                                <i class="${tipo.icona}"></i>
                            </span>
                            <strong>${Utils.escapeHtml(tipo.descrizione)}</strong>
                            <br>
                            <small class="text-muted">Codice: ${tipo.codice}</small>
                        </div>
                        <button class="btn btn-sm btn-outline-primary" title="Modifica">
                            <i class="bi bi-pencil"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;

        // Placeholder event listeners
        container.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                Utils.showToast('Funzionalità in sviluppo', 'info');
            });
        });
    },

    /**
     * Salva parametri
     */
    salvaParametri() {
        // In un'applicazione reale, qui si salverebbero i parametri via API
        Utils.showToast('Parametri salvati con successo', 'success');
    }
};

// Inizializza app quando DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    EditorApp.init();
});

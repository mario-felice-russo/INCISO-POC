/* ========================================
   ASSE InCiSo - App.js
   Inizializzazione applicazione Dashboard
   ======================================== */

const App = {
    note: [],
    currentNoteFilter: 'Tutte',
    
    /**
     * Inizializza l'applicazione
     */
    async init() {
        console.log('Inizializzazione ASSE InCiSo Dashboard...');
        
        try {
            // Mostra loading
            this.showLoading();

            // Carica dati
            await Promise.all([
                EvidenzeManager.init(),
                this.loadNote()
            ]);

            // Setup UI
            this.setupEventListeners();
            this.setupTabs();
            this.renderInitialData();

            // Nascondi loading
            this.hideLoading();

            Utils.showToast('Dashboard caricata con successo', 'success');
            
        } catch (error) {
            console.error('Errore inizializzazione:', error);
            Utils.showToast('Errore caricamento dashboard', 'error');
            this.hideLoading();
        }
    },

    /**
     * Carica note da JSON
     */
    async loadNote() {
        try {
            this.note = await Utils.loadJSON('data/note.json');
        } catch (error) {
            console.error('Errore caricamento note:', error);
            this.note = [];
        }
    },

    /**
     * Mostra schermata loading
     */
    showLoading() {
        const loadingHtml = `
            <div id="loading-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                 background: rgba(255,255,255,0.9); z-index: 9999; display: flex; 
                 align-items: center; justify-content: center;">
                <div class="text-center">
                    <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                        <span class="visually-hidden">Caricamento...</span>
                    </div>
                    <p class="mt-3 text-muted">Caricamento dati...</p>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('afterbegin', loadingHtml);
    },

    /**
     * Nascondi schermata loading
     */
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search evidenze
        const searchEvidenze = document.getElementById('searchEvidenze');
        if (searchEvidenze) {
            searchEvidenze.addEventListener('input', Utils.debounce((e) => {
                EvidenzeManager.setFilter('searchQuery', e.target.value);
                this.refreshCurrentEvidenzeTab();
            }, 300));
        }

        // Filtro categoria evidenze
        const filterCategoria = document.getElementById('categoriaFilter');
        if (filterCategoria) {
            filterCategoria.addEventListener('change', (e) => {
                EvidenzeManager.setFilter('categoria', e.target.value);
                this.refreshCurrentEvidenzeTab();
            });
        }

        // Filtri note per categoria
        const categoriaNotaFilter = document.getElementById('categoriaNotaFilter');
        if (categoriaNotaFilter) {
            categoriaNotaFilter.addEventListener('change', (e) => {
                const categoria = e.target.value || 'Tutte';
                const categoriaMap = {
                    'residenza': 'Residenza',
                    'pagamenti': 'Pagamenti',
                    'degenze': 'Degenze',
                    'amministrazione': 'Amministrazione Sostegno',
                    'generiche': 'Generiche',
                    '': 'Tutte'
                };
                this.filterNote(categoriaMap[categoria]);
            });
        }

        // Pulsante salva nota
        const btnSalvaNota = document.getElementById('btnSalvaNota');
        if (btnSalvaNota) {
            btnSalvaNota.addEventListener('click', () => {
                this.salvaNota();
            });
        }
    },

    /**
     * Setup tabs evidenze
     */
    setupTabs() {
        const tabs = document.querySelectorAll('#evidenzeTabs button[data-bs-toggle="tab"]');
        tabs.forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const target = e.target.getAttribute('data-bs-target');
                const stato = target.replace('#', '');
                
                // Mappa tab a stato evidenza
                const statoMap = {
                    'scadute': 'Scaduta',
                    'correnti': 'Corrente',
                    'future': 'Futura'
                };
                
                // Container corretto
                const containerMap = {
                    'scadute': 'evidenzeScaduteContainer',
                    'correnti': 'evidenzeCorrentiContainer',
                    'future': 'evidenzeFutureContainer'
                };
                
                EvidenzeManager.setFilter('stato', statoMap[stato]);
                EvidenzeManager.renderEvidenze(containerMap[stato]);
            });
        });
    },

    /**
     * Renderizza dati iniziali
     */
    renderInitialData() {
        // Aggiorna badge tabs
        EvidenzeManager.updateTabBadges();
        
        // Renderizza evidenze scadute (tab attivo di default)
        EvidenzeManager.setFilter('stato', 'Scaduta');
        EvidenzeManager.renderEvidenze('evidenzeScaduteContainer');
        
        // Popola select categoria
        this.populateFilterCategoria();
        
        // Renderizza note
        this.renderNote();
    },

    /**
     * Popola select filtro categoria
     */
    populateFilterCategoria() {
        const select = document.getElementById('categoriaFilter');
        if (!select) return;

        // Opzione "Tutte" già presente nell'HTML
        // Aggiungi categorie da tipo_evidenze se necessario
    },

    /**
     * Refresh evidenze tab corrente
     */
    refreshCurrentEvidenzeTab() {
        const activeTabPane = document.querySelector('#evidenzeTabContent .tab-pane.active');
        if (activeTabPane) {
            const containerId = activeTabPane.querySelector('.evidenze-container').id;
            EvidenzeManager.renderEvidenze(containerId);
        }
    },

    /**
     * Refresh evidenze
     */
    async refreshEvidenze() {
        try {
            Utils.showToast('Aggiornamento evidenze...', 'info');
            await EvidenzeManager.init();
            EvidenzeManager.updateTabBadges();
            this.refreshCurrentEvidenzeTab();
            Utils.showToast('Evidenze aggiornate', 'success');
        } catch (error) {
            Utils.showToast('Errore aggiornamento evidenze', 'error');
        }
    },

    /**
     * Filtra note per categoria
     */
    filterNote(categoria) {
        this.currentNoteFilter = categoria;
        this.renderNote();
    },

    /**
     * Cerca note
     */
    searchNote(query) {
        this.renderNote(query);
    },

    /**
     * Ottieni note filtrate
     */
    getFilteredNote(searchQuery = '') {
        let filtered = [...this.note];

        // Filtra per categoria
        if (this.currentNoteFilter !== 'Tutte') {
            filtered = filtered.filter(n => n.categoria === this.currentNoteFilter);
        }

        // Filtra per ricerca
        if (searchQuery) {
            filtered = Utils.searchItems(filtered, searchQuery, 
                ['titolo', 'testo', 'assistito', 'operatore']);
        }

        // Ordina per data (prima le più recenti)
        return Utils.sortBy(filtered, 'dataCreazione', 'desc');
    },

    /**
     * Renderizza note
     */
    renderNote(searchQuery = '') {
        const container = document.getElementById('noteContainer');
        if (!container) return;

        const filtered = this.getFilteredNote(searchQuery);

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>
                    Nessuna nota trovata.
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(nota => this.renderNotaCard(nota)).join('');

        // Aggiungi event listeners
        container.querySelectorAll('.view-nota-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-nota-id'));
                this.viewNotaDetails(id);
            });
        });
    },

    /**
     * Renderizza card nota
     */
    renderNotaCard(nota) {
        const categoriaClass = Utils.getNotaCategoriaClass(nota.categoria);
        const principale = nota.principale ? 'nota-principale' : '';

        return `
            <div class="card nota-card ${principale}" data-nota-id="${nota.id}">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <div>
                        <span class="badge nota-categoria-badge ${categoriaClass} text-white">${Utils.escapeHtml(nota.categoria)}</span>
                        ${nota.principale ? '<i class="bi bi-star-fill text-warning ms-2" title="Nota principale"></i>' : ''}
                    </div>
                    <small class="text-muted">${Utils.formatDateTime(nota.dataCreazione)}</small>
                </div>
                <div class="card-body">
                    <h6 class="card-title">${Utils.escapeHtml(nota.titolo)}</h6>
                    <p class="nota-testo">${Utils.escapeHtml(nota.testo)}</p>
                    <div class="nota-footer">
                        <div class="d-flex justify-content-between align-items-center">
                            <small>
                                <i class="bi bi-person me-1"></i>${Utils.escapeHtml(nota.assistito)}
                            </small>
                            <button class="btn btn-sm btn-outline-secondary view-nota-btn" data-nota-id="${nota.id}">
                                <i class="bi bi-eye"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Mostra dettagli nota in modal
     */
    viewNotaDetails(id) {
        const nota = this.note.find(n => n.id === id);
        if (!nota) return;

        const categoriaClass = Utils.getNotaCategoriaClass(nota.categoria);

        let modal = document.getElementById('notaModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.id = 'notaModal';
            modal.setAttribute('tabindex', '-1');
            modal.innerHTML = `
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Dettagli Nota</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="notaModalBody"></div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        modal.querySelector('#notaModalBody').innerHTML = `
            <div class="row">
                <div class="col-12 mb-3">
                    <span class="badge nota-categoria-badge ${categoriaClass} text-white fs-6">${Utils.escapeHtml(nota.categoria)}</span>
                    ${nota.principale ? '<span class="badge bg-warning text-dark ms-2"><i class="bi bi-star-fill"></i> Nota Principale</span>' : ''}
                </div>
                <div class="col-12 mb-3">
                    <label class="form-label fw-bold">Titolo</label>
                    <p class="fs-5">${Utils.escapeHtml(nota.titolo)}</p>
                </div>
                <div class="col-12 mb-3">
                    <label class="form-label fw-bold">Testo</label>
                    <p>${Utils.escapeHtml(nota.testo)}</p>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label fw-bold">Assistito</label>
                    <p>${Utils.escapeHtml(nota.assistito)}</p>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label fw-bold">Codice Fiscale</label>
                    <p><code>${nota.cf}</code></p>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label fw-bold">Data Creazione</label>
                    <p>${Utils.formatDateTime(nota.dataCreazione)}</p>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label fw-bold">Operatore</label>
                    <p><i class="bi bi-person me-1"></i>${Utils.escapeHtml(nota.operatore)}</p>
                </div>
            </div>
        `;

        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    },

    /**
     * Mostra modal per nuova nota
     */
    showNotaModal() {
        const modal = document.getElementById('nuovaNotaModal');
        if (modal) {
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
        }
    },

    /**
     * Salva nuova nota
     */
    salvaNota() {
        const form = document.getElementById('formNuovaNota');
        if (!form) return;

        // Valida form
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        // Raccoglie dati
        const categoriaMap = {
            'residenza': 'Residenza',
            'pagamenti': 'Pagamenti',
            'degenze': 'Degenze',
            'amministrazione': 'Amministrazione Sostegno',
            'generiche': 'Generiche'
        };
        
        const cfValue = form.querySelector('#notaCF').value;
        const categoriaValue = form.querySelector('#notaCategoria').value;
        
        const newNota = {
            id: parseInt(Math.random() * 10000),
            cf: cfValue,
            assistito: 'Assistito ' + cfValue.substr(0, 6),
            categoria: categoriaMap[categoriaValue] || categoriaValue,
            titolo: 'Nota del ' + new Date().toLocaleDateString('it-IT'),
            testo: form.querySelector('#notaTesto').value,
            dataCreazione: new Date().toISOString(),
            operatore: 'Operatore Corrente',
            principale: form.querySelector('#notaPrincipale').checked
        };

        // Aggiungi alla lista
        this.note.unshift(newNota);

        // Aggiorna UI
        this.renderNote();

        // Chiudi modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('nuovaNotaModal'));
        if (modal) modal.hide();

        // Reset form
        form.reset();
        form.classList.remove('was-validated');

        Utils.showToast('Nota salvata con successo', 'success');
    }
};

// Inizializza app quando DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

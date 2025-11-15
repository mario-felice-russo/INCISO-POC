/* ========================================
   ASSE InCiSo - App.js
   Inizializzazione applicazione Dashboard
   ======================================== */

const App = {
    note: [],
    currentNoteFilter: 'Tutte',
    evidenzeViewMode: 'table', // 'table' o 'card'
    noteViewMode: 'table', // 'table' o 'card'
    
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
                const idTipo = e.target.value;
                if (idTipo) {
                    const tipo = EvidenzeManager.tipoEvidenze.find(t => t.id === Number.parseInt(idTipo));
                    EvidenzeManager.setFilter('categoria', tipo ? tipo.descrizione : 'Tutte');
                } else {
                    EvidenzeManager.setFilter('categoria', 'Tutte');
                }
                this.refreshCurrentEvidenzeTab();
            });
        }

        // Filtro tipo evidenza (select duplicato - sincronizza con categoriaFilter)
        const tipoEvidenzaFilter = document.getElementById('tipoEvidenzaFilter');
        if (tipoEvidenzaFilter) {
            tipoEvidenzaFilter.addEventListener('change', (e) => {
                EvidenzeManager.setFilter('categoria', e.target.value || 'Tutte');
                this.refreshCurrentEvidenzeTab();
            });
        }

        // Pulsante esporta evidenze
        const btnExportEvidenze = document.getElementById('exportEvidenze');
        if (btnExportEvidenze) {
            btnExportEvidenze.addEventListener('click', () => {
                this.esportaEvidenze();
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
                    'redditi': 'Redditi',
                    'varie': 'Varie',
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

        // Bottoni visualizzazione evidenze
        const btnEvidenzeTabella = document.getElementById('btnEvidenzeTabella');
        const btnEvidenzeCard = document.getElementById('btnEvidenzeCard');
        if (btnEvidenzeTabella && btnEvidenzeCard) {
            btnEvidenzeTabella.addEventListener('click', () => {
                this.cambiaVistaEvidenze('table');
                btnEvidenzeTabella.classList.add('active');
                btnEvidenzeCard.classList.remove('active');
            });
            btnEvidenzeCard.addEventListener('click', () => {
                this.cambiaVistaEvidenze('card');
                btnEvidenzeCard.classList.add('active');
                btnEvidenzeTabella.classList.remove('active');
            });
        }

        // Bottoni visualizzazione note
        const btnNoteTabella = document.getElementById('btnNoteTabella');
        const btnNoteCard = document.getElementById('btnNoteCard');
        if (btnNoteTabella && btnNoteCard) {
            btnNoteTabella.addEventListener('click', () => {
                this.cambiaVistaNote('table');
                btnNoteTabella.classList.add('active');
                btnNoteCard.classList.remove('active');
            });
            btnNoteCard.addEventListener('click', () => {
                this.cambiaVistaNote('card');
                btnNoteCard.classList.add('active');
                btnNoteTabella.classList.remove('active');
            });
        }

        // Pulsante esporta note
        const btnExportNote = document.getElementById('exportNote');
        if (btnExportNote) {
            btnExportNote.addEventListener('click', () => {
                this.esportaNote();
            });
        }

        // Pulsante nuova evidenza
        const btnNuovaEvidenza = document.getElementById('btnNuovaEvidenza');
        if (btnNuovaEvidenza) {
            btnNuovaEvidenza.addEventListener('click', () => {
                const modal = new bootstrap.Modal(document.getElementById('modalNuovaEvidenza'));
                modal.show();
            });
        }

        // Pulsante salva evidenza
        const btnSalvaEvidenza = document.getElementById('btnSalvaEvidenza');
        if (btnSalvaEvidenza) {
            btnSalvaEvidenza.addEventListener('click', () => {
                this.salvaEvidenza();
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
        // Le opzioni sono già nell'HTML per categoriaFilter
        // Popola tipoEvidenzaFilter con i dati dinamici
        const tipoEvidenzaFilter = document.getElementById('tipoEvidenzaFilter');
        if (tipoEvidenzaFilter) {
            EvidenzeManager.tipoEvidenze.forEach(tipo => {
                const option = document.createElement('option');
                option.value = tipo.descrizione;
                option.textContent = tipo.descrizione;
                tipoEvidenzaFilter.appendChild(option);
            });
        }
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
     * Cambia vista evidenze
     */
    cambiaVistaEvidenze(mode) {
        this.evidenzeViewMode = mode;
        EvidenzeManager.setViewMode(mode);
        this.refreshCurrentEvidenzeTab();
        Utils.showToast(`Visualizzazione ${mode === 'table' ? 'tabella' : 'card'} attivata`, 'info');
    },

    /**
     * Cambia vista note
     */
    cambiaVistaNote(mode) {
        this.noteViewMode = mode;
        this.renderNote();
        Utils.showToast(`Visualizzazione ${mode === 'table' ? 'tabella' : 'card'} attivata`, 'info');
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

        // Renderizza in base alla modalità
        if (this.noteViewMode === 'table') {
            container.innerHTML = this.renderNoteTabella(filtered);
        } else {
            container.innerHTML = filtered.map(nota => this.renderNotaCard(nota)).join('');
        }

        // Aggiungi event listeners
        container.querySelectorAll('.view-nota-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-nota-id'));
                this.viewNotaDetails(id);
            });
        });
    },

    /**
     * Renderizza note in formato tabella
     */
    renderNoteTabella(note) {
        return `
            <div class="table-responsive">
                <table class="table table-hover table-sm">
                    <thead class="table-light">
                        <tr>
                            <th>Categoria</th>
                            <th>Assistito</th>
                            <th>CF</th>
                            <th>Nota</th>
                            <th>Data</th>
                            <th class="text-center">Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${note.map(nota => `
                            <tr>
                                <td>
                                    <span class="badge" ${Utils.getNotaCategoriaClass(nota.categoria)} style="font-size: 0.85rem; padding: 0.4rem 0.6rem;">
                                        ${Utils.escapeHtml(nota.categoria)}
                                    </span>
                                    ${nota.principale ? '<i class="bi bi-star-fill text-warning ms-1"></i>' : ''}
                                </td>
                                <td>${Utils.escapeHtml(nota.assistito)}</td>
                                <td><code class="small">${nota.cf}</code></td>
                                <td>
                                    <div class="text-truncate" style="max-width: 250px;">
                                        ${Utils.escapeHtml(nota.testo)}
                                    </div>
                                </td>
                                <td class="small text-muted">${Utils.formatDateTime(nota.dataCreazione)}</td>
                                <td class="text-center">
                                    <button class="btn btn-sm btn-outline-secondary view-nota-btn" data-nota-id="${nota.id}">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Esporta note in CSV
     */
    esportaNote() {
        const filtered = this.getFilteredNote();
        if (filtered.length === 0) {
            Utils.showToast('Nessuna nota da esportare', 'warning');
            return;
        }

        let csv = 'ID;Categoria;Assistito;CF;Testo;Data Creazione;Operatore;Principale\n';
        filtered.forEach(nota => {
            csv += `"${nota.id}";"${nota.categoria}";"${nota.assistito}";"${nota.cf}";"${nota.testo}";"${Utils.formatDateTime(nota.dataCreazione)}";"${nota.operatore}";"${nota.principale ? 'Sì' : 'No'}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `note_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        Utils.showToast('Note esportate con successo', 'success');
    },

    /**
     * Salva nuova evidenza
     */
    salvaEvidenza() {
        const form = document.getElementById('formNuovaEvidenza');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const categoria = document.getElementById('evidenzaCategoria').value;
        const tipo = document.getElementById('evidenzaTipo').value;
        const cf = document.getElementById('evidenzaCF').value;
        const scadenza = document.getElementById('evidenzaScadenza').value;
        const descrizione = document.getElementById('evidenzaDescrizione').value;

        // Qui dovresti salvare l'evidenza nel backend
        console.log('Salvataggio evidenza:', { categoria, tipo, cf, scadenza, descrizione });

        Utils.showToast('Evidenza salvata con successo', 'success');
        
        // Chiudi modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalNuovaEvidenza'));
        modal.hide();
        
        // Reset form
        form.reset();
        
        // Ricarica evidenze
        this.refreshEvidenze();
    },

    /**
     * Renderizza card nota
     */
    renderNotaCard(nota) {
        const categoriaStyle = Utils.getNotaCategoriaClass(nota.categoria);
        const principale = nota.principale ? 'nota-principale' : '';

        return `
            <div class="card nota-card ${principale}" data-nota-id="${nota.id}">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <div>
                        <span class="badge" ${categoriaStyle} style="font-size: 0.85rem; padding: 0.4rem 0.6rem;">${Utils.escapeHtml(nota.categoria)}</span>
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

        const categoriaStyle = Utils.getNotaCategoriaClass(nota.categoria);

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
                    <span class="badge" ${categoriaStyle} style="font-size: 1rem; padding: 0.5rem 0.8rem;">${Utils.escapeHtml(nota.categoria)}</span>
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
    },

    /**
     * Esporta evidenze visibili in CSV
     */
    esportaEvidenze() {
        const evidenze = EvidenzeManager.getFilteredEvidenze();
        
        if (evidenze.length === 0) {
            Utils.showToast('Nessuna evidenza da esportare', 'warning');
            return;
        }

        // Crea CSV
        let csv = 'ID;Assistito;CF;Tipo Evidenza;Descrizione;Data Scadenza;Priorità;Stato;Data Inserimento;Note;Operatore\n';
        
        evidenze.forEach(e => {
            csv += `"${e.id}";"${e.assistito}";"${e.cf}";"${e.tipoEvidenza}";"${e.descrizione}";"${Utils.formatDate(e.dataScadenza)}";"${e.priorita}";"${e.stato}";"${Utils.formatDate(e.dataInserimento)}";"${e.note || ''}";"${e.operatore}"\n`;
        });

        // Download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `evidenze_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        Utils.showToast(`Esportate ${evidenze.length} evidenze`, 'success');
    }
};

// Inizializza app quando DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

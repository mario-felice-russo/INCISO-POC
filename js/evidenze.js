/* ========================================
   ASSE InCiSo - Evidenze.js
   Gestione evidenze/promemoria
   ======================================== */

const EvidenzeManager = {
    evidenze: [],
    tipoEvidenze: [],
    currentFilter: {
        stato: 'Corrente',
        categoria: 'Tutte',
        searchQuery: ''
    },
    viewMode: 'table', // 'table' o 'card'

    /**
     * Inizializza il manager caricando i dati
     */
    async init() {
        try {
            this.evidenze = await Utils.loadJSON('data/evidenze.json');
            this.tipoEvidenze = await Utils.loadJSON('data/tipo_evidenze.json');
            
            // Aggiorna stato dinamico in base a data scadenza
            this.updateEvidenzeStati();
            
            return true;
        } catch (error) {
            console.error('Errore inizializzazione EvidenzeManager:', error);
            Utils.showToast('Errore caricamento evidenze', 'error');
            return false;
        }
    },

    /**
     * Aggiorna stati evidenze in base a data scadenza
     */
    updateEvidenzeStati() {
        this.evidenze.forEach(evidenza => {
            evidenza.stato = Utils.getEvidenzaStato(evidenza.dataScadenza);
        });
    },

    /**
     * Ottieni evidenze filtrate
     */
    getFilteredEvidenze() {
        let filtered = [...this.evidenze];

        // Filtro per stato
        if (this.currentFilter.stato !== 'Tutte') {
            filtered = filtered.filter(e => e.stato === this.currentFilter.stato);
        }

        // Filtro per categoria
        if (this.currentFilter.categoria !== 'Tutte') {
            filtered = filtered.filter(e => e.tipoEvidenza === this.currentFilter.categoria);
        }

        // Filtro per ricerca
        if (this.currentFilter.searchQuery) {
            filtered = Utils.searchItems(filtered, this.currentFilter.searchQuery, 
                ['assistito', 'descrizione', 'note', 'cf']);
        }

        // Ordina per data scadenza (prima le più vicine)
        return Utils.sortBy(filtered, 'dataScadenza', 'asc');
    },

    /**
     * Ottieni evidenze per CF
     */
    getEvidenzeByCF(cf) {
        return this.evidenze.filter(e => e.cf === cf);
    },

    /**
     * Ottieni evidenza per ID
     */
    getEvidenzaById(id) {
        return this.evidenze.find(e => e.id === id);
    },

    /**
     * Ottieni statistiche evidenze
     */
    getStatistiche() {
        const grouped = Utils.groupBy(this.evidenze, 'stato');
        return {
            scadute: (grouped['Scaduta'] || []).length,
            correnti: (grouped['Corrente'] || []).length,
            future: (grouped['Futura'] || []).length,
            totale: this.evidenze.length
        };
    },

    /**
     * Imposta filtro
     */
    setFilter(filterType, value) {
        this.currentFilter[filterType] = value;
    },

    /**
     * Imposta modalità di visualizzazione
     */
    setViewMode(mode) {
        this.viewMode = mode;
    },

    /**
     * Renderizza evidenza come HTML card
     */
    renderEvidenzaCard(evidenza) {
        const tipo = this.tipoEvidenze.find(t => t.id === evidenza.idTipoEvidenza);
        const colore = tipo ? tipo.colore : 'secondary';
        const icona = tipo ? tipo.icona : 'bi-bell';
        
        const giorni = Utils.daysFromNow(evidenza.dataScadenza);
        let badgeStato = '';
        let badgeClass = '';
        
        if (giorni !== null) {
            if (giorni < 0) {
                badgeStato = `Scaduta da ${Math.abs(giorni)} giorni`;
                badgeClass = 'bg-danger';
            } else if (giorni === 0) {
                badgeStato = 'Scade oggi';
                badgeClass = 'bg-danger';
            } else if (giorni <= 7) {
                badgeStato = `Scade tra ${giorni} giorni`;
                badgeClass = 'bg-warning';
            } else if (giorni <= 30) {
                badgeStato = `Scade tra ${giorni} giorni`;
                badgeClass = 'bg-info';
            } else {
                badgeStato = `Scade tra ${giorni} giorni`;
                badgeClass = 'bg-secondary';
            }
        }

        return `
            <div class="card evidenza-card border-${colore}" data-evidenza-id="${evidenza.id}">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span>
                        <i class="bi ${icona} me-2"></i>
                        <strong>${Utils.escapeHtml(evidenza.assistito)}</strong>
                    </span>
                    <span class="badge evidenza-categoria bg-${colore}">${Utils.escapeHtml(evidenza.tipoEvidenza)}</span>
                </div>
                <div class="card-body">
                    <h6 class="card-title">${Utils.escapeHtml(evidenza.descrizione)}</h6>
                    <p class="mb-2">
                        <i class="bi bi-calendar-event me-1"></i>
                        <span class="evidenza-scadenza text-${colore}">
                            ${Utils.formatDate(evidenza.dataScadenza)}
                        </span>
                    </p>
                    ${badgeStato ? `<p class="mb-2"><span class="badge ${badgeClass}">${badgeStato}</span></p>` : ''}
                    <p class="mb-2">
                        <i class="bi bi-exclamation-triangle me-1"></i>
                        Priorità: <span class="badge bg-${Utils.getPrioritaClass(evidenza.priorita)}">${evidenza.priorita}</span>
                    </p>
                    ${evidenza.note ? `
                    <p class="text-muted small mb-0">
                        <i class="bi bi-sticky me-1"></i>
                        ${Utils.escapeHtml(evidenza.note)}
                    </p>` : ''}
                    <hr class="my-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            <i class="bi bi-person me-1"></i>${Utils.escapeHtml(evidenza.operatore)}
                        </small>
                        <button class="btn btn-sm btn-outline-primary view-evidenza-btn" data-evidenza-id="${evidenza.id}">
                            <i class="bi bi-eye"></i> Dettagli
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Renderizza evidenza in formato tabella
     */
    renderEvidenzaTabella(evidenze) {
        return `
            <div class="table-responsive">
                <table class="table table-hover table-sm">
                    <thead class="table-light">
                        <tr>
                            <th>Tipo</th>
                            <th>Assistito</th>
                            <th>CF</th>
                            <th>Descrizione</th>
                            <th>Scadenza</th>
                            <th>Priorità</th>
                            <th class="text-center">Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${evidenze.map(evidenza => {
                            const tipo = this.tipoEvidenze.find(t => t.id === evidenza.idTipoEvidenza);
                            const colore = tipo ? tipo.colore : 'secondary';
                            const giorni = Utils.daysFromNow(evidenza.dataScadenza);
                            let statoClass = '';
                            if (giorni !== null) {
                                if (giorni < 0) statoClass = 'text-danger fw-bold';
                                else if (giorni <= 7) statoClass = 'text-warning fw-bold';
                            }
                            
                            return `
                                <tr>
                                    <td>
                                        <span class="badge bg-${colore}" style="font-size: 0.85rem; padding: 0.4rem 0.6rem;">
                                            ${Utils.escapeHtml(evidenza.tipoEvidenza)}
                                        </span>
                                    </td>
                                    <td>${Utils.escapeHtml(evidenza.assistito)}</td>
                                    <td><code class="small">${evidenza.cf}</code></td>
                                    <td>
                                        <div class="text-truncate" style="max-width: 250px;">
                                            ${Utils.escapeHtml(evidenza.descrizione)}
                                        </div>
                                    </td>
                                    <td class="${statoClass}">${Utils.formatDate(evidenza.dataScadenza)}</td>
                                    <td>
                                        <span class="badge bg-${Utils.getPrioritaClass(evidenza.priorita)}">
                                            ${evidenza.priorita}
                                        </span>
                                    </td>
                                    <td class="text-center">
                                        <button class="btn btn-sm btn-outline-primary view-evidenza-btn" data-evidenza-id="${evidenza.id}">
                                            <i class="bi bi-eye"></i>
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Renderizza lista evidenze in container
     */
    renderEvidenze(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container #${containerId} non trovato`);
            return;
        }

        const filtered = this.getFilteredEvidenze();

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>
                    Nessuna evidenza trovata con i filtri applicati.
                </div>
            `;
            return;
        }

        // Renderizza in base alla modalità
        if (this.viewMode === 'table') {
            container.innerHTML = this.renderEvidenzaTabella(filtered);
        } else {
            container.innerHTML = filtered.map(e => this.renderEvidenzaCard(e)).join('');
        }

        // Aggiungi event listeners ai pulsanti
        container.querySelectorAll('.view-evidenza-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-evidenza-id'));
                this.viewEvidenzaDetails(id);
            });
        });
    },

    /**
     * Mostra dettagli evidenza in modal
     */
    viewEvidenzaDetails(id) {
        const evidenza = this.getEvidenzaById(id);
        if (!evidenza) return;

        const tipo = this.tipoEvidenze.find(t => t.id === evidenza.idTipoEvidenza);
        const colore = tipo ? tipo.colore : 'secondary';

        // Crea o aggiorna modal
        let modal = document.getElementById('evidenzaModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.id = 'evidenzaModal';
            modal.setAttribute('tabindex', '-1');
            modal.innerHTML = `
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-${colore} text-white">
                            <h5 class="modal-title" id="evidenzaModalLabel">Dettagli Evidenza</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="evidenzaModalBody"></div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button>
                            <a href="dettaglio.html?cf=${evidenza.cf}" class="btn btn-primary">
                                <i class="bi bi-folder2-open me-1"></i> Vai al Fascicolo
                            </a>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Aggiorna header colore
        modal.querySelector('.modal-header').className = `modal-header bg-${colore} text-white`;

        // Popola body
        const giorni = Utils.daysFromNow(evidenza.dataScadenza);
        let badgeGiorni = '';
        if (giorni !== null) {
            if (giorni < 0) {
                badgeGiorni = `<span class="badge bg-danger">Scaduta da ${Math.abs(giorni)} giorni</span>`;
            } else if (giorni === 0) {
                badgeGiorni = `<span class="badge bg-danger">Scade oggi!</span>`;
            } else if (giorni <= 7) {
                badgeGiorni = `<span class="badge bg-warning text-dark">Scade tra ${giorni} giorni</span>`;
            } else {
                badgeGiorni = `<span class="badge bg-info">Scade tra ${giorni} giorni</span>`;
            }
        }

        modal.querySelector('#evidenzaModalBody').innerHTML = `
            <div class="row">
                <div class="col-md-6 mb-3">
                    <label class="form-label fw-bold">Assistito</label>
                    <p>${Utils.escapeHtml(evidenza.assistito)}</p>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label fw-bold">Codice Fiscale</label>
                    <p><code>${evidenza.cf}</code></p>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label fw-bold">Tipologia</label>
                    <p><span class="badge bg-${colore}">${Utils.escapeHtml(evidenza.tipoEvidenza)}</span></p>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label fw-bold">Priorità</label>
                    <p><span class="badge bg-${Utils.getPrioritaClass(evidenza.priorita)}">${evidenza.priorita}</span></p>
                </div>
                <div class="col-12 mb-3">
                    <label class="form-label fw-bold">Descrizione</label>
                    <p>${Utils.escapeHtml(evidenza.descrizione)}</p>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label fw-bold">Data Scadenza</label>
                    <p class="text-${colore} fs-5 fw-bold">${Utils.formatDate(evidenza.dataScadenza)}</p>
                    ${badgeGiorni}
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label fw-bold">Data Inserimento</label>
                    <p>${Utils.formatDate(evidenza.dataInserimento)}</p>
                </div>
                <div class="col-12 mb-3">
                    <label class="form-label fw-bold">Note</label>
                    <p class="text-muted">${evidenza.note ? Utils.escapeHtml(evidenza.note) : '-'}</p>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label fw-bold">Operatore</label>
                    <p><i class="bi bi-person me-1"></i>${Utils.escapeHtml(evidenza.operatore)}</p>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label fw-bold">Stato</label>
                    <p><span class="badge bg-${colore}">${evidenza.stato}</span></p>
                </div>
            </div>
        `;

        // Mostra modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    },

    /**
     * Aggiorna badge contatori tabs
     */
    updateTabBadges() {
        const stats = this.getStatistiche();
        
        const badgeScadute = document.getElementById('badgeScadute');
        const badgeCorrenti = document.getElementById('badgeCorrenti');
        const badgeFuture = document.getElementById('badgeFuture');

        if (badgeScadute) badgeScadute.textContent = stats.scadute;
        if (badgeCorrenti) badgeCorrenti.textContent = stats.correnti;
        if (badgeFuture) badgeFuture.textContent = stats.future;
    }
};

/* ========================================
   ASSE InCiSo - Ricerca.js
   Gestione ricerca assistiti
   ======================================== */

const RicercaApp = {
    assistiti: [],
    risultati: [],
    currentPage: 1,
    itemsPerPage: 10,
    currentView: 'table',

    /**
     * Inizializza l'applicazione
     */
    async init() {
        console.log('Inizializzazione Ricerca Assistiti...');
        
        try {
            // Carica dati
            this.assistiti = await Utils.loadJSON('data/assistiti.json');
            
            // Setup event listeners
            this.setupEventListeners();
            
            Utils.showToast('Ricerca pronta', 'success');
        } catch (error) {
            console.error('Errore inizializzazione:', error);
            Utils.showToast('Errore caricamento dati', 'error');
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Form submit
        const form = document.getElementById('formRicerca');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.eseguiRicerca();
            });
        }

        // Reset
        const btnReset = document.getElementById('btnResetRicerca');
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                this.resetRicerca();
            });
        }

        // Esporta
        const btnEsporta = document.getElementById('btnEsportaRisultati');
        if (btnEsporta) {
            btnEsporta.addEventListener('click', () => {
                this.esportaRisultati();
            });
        }

        // Cambio vista
        const btnViewTable = document.getElementById('btnViewTable');
        const btnViewGrid = document.getElementById('btnViewGrid');
        
        if (btnViewTable) {
            btnViewTable.addEventListener('click', () => {
                this.cambiaVista('table');
                btnViewTable.classList.add('active');
                btnViewGrid.classList.remove('active');
            });
        }
        
        if (btnViewGrid) {
            btnViewGrid.addEventListener('click', () => {
                this.cambiaVista('grid');
                btnViewGrid.classList.add('active');
                btnViewTable.classList.remove('active');
            });
        }
    },

    /**
     * Esegui ricerca
     */
    eseguiRicerca() {
        const criteri = {
            cf: document.getElementById('searchCF').value.trim().toUpperCase(),
            cognome: document.getElementById('searchCognome').value.trim(),
            nome: document.getElementById('searchNome').value.trim(),
            dataNascita: document.getElementById('searchDataNascita').value,
            comune: document.getElementById('searchComune').value.trim(),
            stato: document.getElementById('searchStato').value,
            operatore: document.getElementById('searchOperatore').value.trim()
        };

        // Verifica che almeno un criterio sia compilato
        const hasFilters = Object.values(criteri).some(v => v !== '');
        if (!hasFilters) {
            Utils.showToast('Inserire almeno un criterio di ricerca', 'warning');
            return;
        }

        // Filtra assistiti
        this.risultati = this.assistiti.filter(assistito => {
            let match = true;

            if (criteri.cf && !assistito.cf.includes(criteri.cf)) {
                match = false;
            }
            if (criteri.cognome && !Utils.normalizeString(assistito.cognome).includes(Utils.normalizeString(criteri.cognome))) {
                match = false;
            }
            if (criteri.nome && !Utils.normalizeString(assistito.nome).includes(Utils.normalizeString(criteri.nome))) {
                match = false;
            }
            if (criteri.dataNascita && assistito.dataNascita !== criteri.dataNascita) {
                match = false;
            }
            if (criteri.comune && !Utils.normalizeString(assistito.comune).includes(Utils.normalizeString(criteri.comune))) {
                match = false;
            }
            if (criteri.stato && assistito.stato !== criteri.stato) {
                match = false;
            }
            if (criteri.operatore && !Utils.normalizeString(assistito.operatoreRiferimento).includes(Utils.normalizeString(criteri.operatore))) {
                match = false;
            }

            return match;
        });

        // Reset paginazione
        this.currentPage = 1;

        // Mostra risultati
        this.renderRisultati();
        
        Utils.showToast(`Trovati ${this.risultati.length} risultati`, 'info');
    },

    /**
     * Reset ricerca
     */
    resetRicerca() {
        document.getElementById('formRicerca').reset();
        this.risultati = [];
        this.currentPage = 1;
        
        // Reset vista
        const tbody = document.getElementById('tbodyRisultati');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted py-5">
                        <i class="bi bi-search display-4"></i>
                        <p class="mt-3">Utilizza i filtri sopra per cercare assistiti</p>
                    </td>
                </tr>
            `;
        }
        
        document.getElementById('badgeRisultati').textContent = '0';
        document.getElementById('paginazione').style.display = 'none';
        
        Utils.showToast('Ricerca resettata', 'info');
    },

    /**
     * Renderizza risultati
     */
    renderRisultati() {
        // Aggiorna badge
        document.getElementById('badgeRisultati').textContent = this.risultati.length;

        if (this.risultati.length === 0) {
            const tbody = document.getElementById('tbodyRisultati');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center text-muted py-4">
                            <i class="bi bi-inbox display-4"></i>
                            <p class="mt-3">Nessun risultato trovato con i criteri specificati</p>
                        </td>
                    </tr>
                `;
            }
            document.getElementById('paginazione').style.display = 'none';
            return;
        }

        if (this.currentView === 'table') {
            this.renderTable();
        } else {
            this.renderGrid();
        }

        // Renderizza paginazione se necessario
        if (this.risultati.length > this.itemsPerPage) {
            this.renderPaginazione();
        } else {
            document.getElementById('paginazione').style.display = 'none';
        }
    },

    /**
     * Renderizza tabella
     */
    renderTable() {
        const tbody = document.getElementById('tbodyRisultati');
        if (!tbody) return;

        // Calcola pagina corrente
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const paginatedItems = this.risultati.slice(start, end);

        tbody.innerHTML = paginatedItems.map(assistito => `
            <tr>
                <td><code>${assistito.cf}</code></td>
                <td>${Utils.escapeHtml(assistito.cognome)}</td>
                <td>${Utils.escapeHtml(assistito.nome)}</td>
                <td>${Utils.formatDate(assistito.dataNascita)}</td>
                <td>${Utils.escapeHtml(assistito.comune)}</td>
                <td>
                    <span class="badge ${assistito.stato === 'Attivo' ? 'bg-success' : 'bg-warning'}">
                        ${assistito.stato}
                    </span>
                </td>
                <td>${Utils.escapeHtml(assistito.operatoreRiferimento)}</td>
                <td>
                    <a href="dettaglio.html?cf=${assistito.cf}" class="btn btn-sm btn-primary">
                        <i class="bi bi-folder2-open"></i> Fascicolo
                    </a>
                </td>
            </tr>
        `).join('');
    },

    /**
     * Renderizza griglia
     */
    renderGrid() {
        const grid = document.getElementById('gridRisultati');
        if (!grid) return;

        // Calcola pagina corrente
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const paginatedItems = this.risultati.slice(start, end);

        grid.innerHTML = paginatedItems.map(assistito => `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card h-100">
                    <div class="card-header bg-primary text-white">
                        <h6 class="mb-0">
                            <i class="bi bi-person"></i> 
                            ${Utils.escapeHtml(assistito.cognome)} ${Utils.escapeHtml(assistito.nome)}
                        </h6>
                    </div>
                    <div class="card-body">
                        <p class="mb-2">
                            <strong>CF:</strong> <code>${assistito.cf}</code>
                        </p>
                        <p class="mb-2">
                            <strong>Data Nascita:</strong> ${Utils.formatDate(assistito.dataNascita)}
                        </p>
                        <p class="mb-2">
                            <strong>Comune:</strong> ${Utils.escapeHtml(assistito.comune)}
                        </p>
                        <p class="mb-2">
                            <strong>Telefono:</strong> ${assistito.telefono || '-'}
                        </p>
                        <p class="mb-2">
                            <strong>Email:</strong> ${assistito.email || '-'}
                        </p>
                        <p class="mb-2">
                            <strong>Stato:</strong>
                            <span class="badge ${assistito.stato === 'Attivo' ? 'bg-success' : 'bg-warning'}">
                                ${assistito.stato}
                            </span>
                        </p>
                        <p class="mb-0">
                            <strong>Operatore:</strong> ${Utils.escapeHtml(assistito.operatoreRiferimento)}
                        </p>
                    </div>
                    <div class="card-footer bg-white">
                        <a href="dettaglio.html?cf=${assistito.cf}" class="btn btn-primary btn-sm w-100">
                            <i class="bi bi-folder2-open"></i> Apri Fascicolo
                        </a>
                    </div>
                </div>
            </div>
        `).join('');
    },

    /**
     * Renderizza paginazione
     */
    renderPaginazione() {
        const totalPages = Math.ceil(this.risultati.length / this.itemsPerPage);
        const paginationList = document.getElementById('paginationList');
        
        if (!paginationList) return;

        let html = '';

        // Previous
        html += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage - 1}">
                    <i class="bi bi-chevron-left"></i>
                </a>
            </li>
        `;

        // Pages
        for (let i = 1; i <= totalPages; i++) {
            // Mostra solo alcune pagine intorno a quella corrente
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                html += `
                    <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" data-page="${i}">${i}</a>
                    </li>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        // Next
        html += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage + 1}">
                    <i class="bi bi-chevron-right"></i>
                </a>
            </li>
        `;

        paginationList.innerHTML = html;

        // Event listeners
        paginationList.querySelectorAll('a.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.currentTarget.getAttribute('data-page'));
                if (page && page !== this.currentPage && page >= 1 && page <= totalPages) {
                    this.currentPage = page;
                    this.renderRisultati();
                    window.scrollTo(0, 0);
                }
            });
        });

        document.getElementById('paginazione').style.display = 'block';
    },

    /**
     * Cambia vista
     */
    cambiaVista(view) {
        this.currentView = view;
        
        const viewTable = document.getElementById('viewTable');
        const viewGrid = document.getElementById('viewGrid');

        if (view === 'table') {
            viewTable.style.display = 'block';
            viewGrid.style.display = 'none';
        } else {
            viewTable.style.display = 'none';
            viewGrid.style.display = 'block';
        }

        // Re-render se ci sono risultati
        if (this.risultati.length > 0) {
            this.renderRisultati();
        }
    },

    /**
     * Esporta risultati in CSV
     */
    esportaRisultati() {
        if (this.risultati.length === 0) {
            Utils.showToast('Nessun risultato da esportare', 'warning');
            return;
        }

        // Crea CSV
        let csv = 'Codice Fiscale;Cognome;Nome;Data Nascita;Luogo Nascita;Sesso;Indirizzo;Comune;CAP;Provincia;Telefono;Email;Stato;Data Iscrizione;Operatore\n';
        
        this.risultati.forEach(a => {
            csv += `"${a.cf}";"${a.cognome}";"${a.nome}";"${Utils.formatDate(a.dataNascita)}";"${a.luogoNascita}";"${a.sesso}";"${a.indirizzo}";"${a.comune}";"${a.cap}";"${a.provincia}";"${a.telefono || ''}";"${a.email || ''}";"${a.stato}";"${Utils.formatDate(a.dataIscrizione)}";"${a.operatoreRiferimento}"\n`;
        });

        // Download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `assistiti_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        Utils.showToast('Esportazione completata', 'success');
    }
};

// Inizializza app quando DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    RicercaApp.init();
});

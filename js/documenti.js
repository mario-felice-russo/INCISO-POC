/* ========================================
   ASSE InCiSo - Documenti.js
   Gestione documenti protocollati
   ======================================== */

const DocumentiApp = {
    comunicazioni: [],
    tipiComunicazioni: [],
    risultati: [],
    currentPage: 1,
    itemsPerPage: 15,

    /**
     * Inizializza l'applicazione
     */
    async init() {
        console.log('Inizializzazione Documenti Protocollati...');
        
        try {
            // Carica dati
            await this.loadData();
            
            // Popola select
            this.populateSelects();
            
            // Aggiorna statistiche
            this.updateStats();
            
            // Setup event listeners
            this.setupEventListeners();
            
            Utils.showToast('Documenti pronti', 'success');
        } catch (error) {
            console.error('Errore inizializzazione:', error);
            Utils.showToast('Errore caricamento dati', 'error');
        }
    },

    /**
     * Carica dati
     */
    async loadData() {
        const [comunicazioni, tipiComunicazioni] = await Promise.all([
            Utils.loadJSON('data/comunicazioni.json'),
            Utils.loadJSON('data/tipo_comunicazioni.json')
        ]);

        this.comunicazioni = comunicazioni;
        this.tipiComunicazioni = tipiComunicazioni;
    },

    /**
     * Popola select con dati
     */
    populateSelects() {
        const selectTipo = document.getElementById('searchTipoComunicazione');
        if (selectTipo) {
            this.tipiComunicazioni.forEach(tipo => {
                const option = document.createElement('option');
                option.value = tipo.descrizione;
                option.textContent = tipo.descrizione;
                selectTipo.appendChild(option);
            });
        }
    },

    /**
     * Aggiorna statistiche
     */
    updateStats() {
        const grouped = Utils.groupBy(this.comunicazioni, 'stato');
        
        document.getElementById('statTotali').textContent = this.comunicazioni.length;
        document.getElementById('statProtocollate').textContent = (grouped['Protocollata'] || []).length;
        document.getElementById('statCaricate').textContent = (grouped['Caricata'] || []).length + (grouped['Generata'] || []).length;
        document.getElementById('statErrore').textContent = (grouped['Errore'] || []).length;
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Form submit
        const form = document.getElementById('formRicercaDocumenti');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.eseguiRicerca();
            });
        }

        // Reset
        const btnReset = document.getElementById('btnResetDocumenti');
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                this.resetRicerca();
            });
        }

        // Esporta
        const btnEsporta = document.getElementById('btnEsportaDocumenti');
        if (btnEsporta) {
            btnEsporta.addEventListener('click', () => {
                this.esportaRisultati();
            });
        }
    },

    /**
     * Esegui ricerca
     */
    eseguiRicerca() {
        const criteri = {
            numeroProtocollo: document.getElementById('searchNumeroProtocollo').value.trim(),
            cf: document.getElementById('searchCFDocumento').value.trim().toUpperCase(),
            tipoComunicazione: document.getElementById('searchTipoComunicazione').value,
            stato: document.getElementById('searchStatoDocumento').value,
            dataDa: document.getElementById('searchDataDa').value,
            dataA: document.getElementById('searchDataA').value,
            canale: document.getElementById('searchCanale').value,
            operatore: document.getElementById('searchOperatoreDoc').value.trim()
        };

        // Filtra comunicazioni
        this.risultati = this.comunicazioni.filter(com => {
            let match = true;

            if (criteri.numeroProtocollo && (!com.numeroProtocollo || !com.numeroProtocollo.includes(criteri.numeroProtocollo))) {
                match = false;
            }
            if (criteri.cf && !com.cf.includes(criteri.cf)) {
                match = false;
            }
            if (criteri.tipoComunicazione && com.tipoComunicazione !== criteri.tipoComunicazione) {
                match = false;
            }
            if (criteri.stato && com.stato !== criteri.stato) {
                match = false;
            }
            if (criteri.dataDa && com.dataGenerazione < criteri.dataDa) {
                match = false;
            }
            if (criteri.dataA && com.dataGenerazione > criteri.dataA) {
                match = false;
            }
            if (criteri.canale && com.canale !== criteri.canale) {
                match = false;
            }
            if (criteri.operatore && !Utils.normalizeString(com.operatore).includes(Utils.normalizeString(criteri.operatore))) {
                match = false;
            }

            return match;
        });

        // Reset paginazione
        this.currentPage = 1;

        // Mostra risultati
        this.renderRisultati();
        
        Utils.showToast(`Trovati ${this.risultati.length} documenti`, 'info');
    },

    /**
     * Reset ricerca
     */
    resetRicerca() {
        document.getElementById('formRicercaDocumenti').reset();
        this.risultati = [];
        this.currentPage = 1;
        
        const tbody = document.getElementById('tbodyDocumenti');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center text-muted py-5">
                        <i class="bi bi-search display-4"></i>
                        <p class="mt-3">Utilizza i filtri sopra per cercare documenti</p>
                    </td>
                </tr>
            `;
        }
        
        document.getElementById('badgeRisultatiDoc').textContent = '0';
        document.getElementById('paginazioneDoc').style.display = 'none';
        
        Utils.showToast('Ricerca resettata', 'info');
    },

    /**
     * Renderizza risultati
     */
    renderRisultati() {
        document.getElementById('badgeRisultatiDoc').textContent = this.risultati.length;

        if (this.risultati.length === 0) {
            const tbody = document.getElementById('tbodyDocumenti');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="10" class="text-center text-muted py-4">
                            <i class="bi bi-inbox display-4"></i>
                            <p class="mt-3">Nessun documento trovato con i criteri specificati</p>
                        </td>
                    </tr>
                `;
            }
            document.getElementById('paginazioneDoc').style.display = 'none';
            return;
        }

        this.renderTable();

        // Renderizza paginazione se necessario
        if (this.risultati.length > this.itemsPerPage) {
            this.renderPaginazione();
        } else {
            document.getElementById('paginazioneDoc').style.display = 'none';
        }
    },

    /**
     * Renderizza tabella
     */
    renderTable() {
        const tbody = document.getElementById('tbodyDocumenti');
        if (!tbody) return;

        // Ordina per data generazione (più recenti prima)
        const sorted = Utils.sortBy(this.risultati, 'dataGenerazione', 'desc');

        // Calcola pagina corrente
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const paginatedItems = sorted.slice(start, end);

        tbody.innerHTML = paginatedItems.map(doc => {
            const statoClass = doc.stato === 'Protocollata' ? 'protocollata' : 
                              doc.stato === 'Caricata' ? 'caricata' : 
                              doc.stato === 'Errore' ? 'errore' : 'generata';

            return `
                <tr class="comunicazione-row">
                    <td>
                        ${doc.numeroProtocollo ? `<code>${doc.numeroProtocollo}</code>` : '-'}
                    </td>
                    <td>
                        <span class="badge bg-primary">${Utils.escapeHtml(doc.tipoComunicazione)}</span>
                    </td>
                    <td>${Utils.escapeHtml(doc.assistito)}</td>
                    <td><code>${doc.cf}</code></td>
                    <td>${Utils.formatDate(doc.dataGenerazione)}</td>
                    <td>${doc.dataProtocollo ? Utils.formatDate(doc.dataProtocollo) : '-'}</td>
                    <td><span class="badge bg-info">${doc.canale}</span></td>
                    <td><span class="stato-comunicazione ${statoClass}">${doc.stato}</span></td>
                    <td>${Utils.escapeHtml(doc.operatore)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary btn-view-doc" 
                                data-doc-id="${doc.id}" title="Visualizza">
                            <i class="bi bi-eye"></i>
                        </button>
                        ${doc.numeroProtocollo ? `
                        <button class="btn btn-sm btn-outline-success" title="Scarica">
                            <i class="bi bi-download"></i>
                        </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');

        // Aggiungi event listeners
        tbody.querySelectorAll('.btn-view-doc').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-doc-id'));
                this.viewDettaglio(id);
            });
        });
    },

    /**
     * Renderizza paginazione
     */
    renderPaginazione() {
        const totalPages = Math.ceil(this.risultati.length / this.itemsPerPage);
        const paginationList = document.getElementById('paginationListDoc');
        
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

        document.getElementById('paginazioneDoc').style.display = 'block';
    },

    /**
     * Visualizza dettaglio documento
     */
    viewDettaglio(id) {
        const doc = this.comunicazioni.find(c => c.id === id);
        if (!doc) return;

        const modalBody = document.getElementById('modalDettaglioDocBody');
        if (!modalBody) return;

        const statoClass = doc.stato === 'Protocollata' ? 'success' : 
                          doc.stato === 'Caricata' ? 'info' : 
                          doc.stato === 'Errore' ? 'danger' : 'secondary';

        modalBody.innerHTML = `
            <div class="row">
                <div class="col-md-6 mb-3">
                    <label class="form-label fw-bold">Tipo Comunicazione</label>
                    <p><span class="badge bg-primary fs-6">${Utils.escapeHtml(doc.tipoComunicazione)}</span></p>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label fw-bold">Stato</label>
                    <p><span class="badge bg-${statoClass} fs-6">${doc.stato}</span></p>
                </div>
                <div class="col-12 mb-3">
                    <label class="form-label fw-bold">Oggetto</label>
                    <p>${Utils.escapeHtml(doc.oggetto)}</p>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label fw-bold">Assistito</label>
                    <p>${Utils.escapeHtml(doc.assistito)}</p>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label fw-bold">Codice Fiscale</label>
                    <p><code>${doc.cf}</code></p>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label fw-bold">Data Generazione</label>
                    <p>${Utils.formatDate(doc.dataGenerazione)}</p>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label fw-bold">Data Invio</label>
                    <p>${doc.dataInvio ? Utils.formatDate(doc.dataInvio) : '-'}</p>
                </div>
                ${doc.numeroProtocollo ? `
                <div class="col-md-6 mb-3">
                    <label class="form-label fw-bold">Numero Protocollo</label>
                    <p><code class="fs-5">${doc.numeroProtocollo}</code></p>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label fw-bold">Data Protocollo</label>
                    <p>${Utils.formatDate(doc.dataProtocollo)}</p>
                </div>
                ` : ''}
                <div class="col-md-6 mb-3">
                    <label class="form-label fw-bold">Canale</label>
                    <p><span class="badge bg-info">${doc.canale}</span></p>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label fw-bold">Destinatario</label>
                    <p>${doc.destinatario || '-'}</p>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label fw-bold">Operatore</label>
                    <p><i class="bi bi-person"></i> ${Utils.escapeHtml(doc.operatore)}</p>
                </div>
                ${doc.note ? `
                <div class="col-12 mb-3">
                    <label class="form-label fw-bold">Note</label>
                    <p class="text-muted">${Utils.escapeHtml(doc.note)}</p>
                </div>
                ` : ''}
            </div>
        `;

        const modal = new bootstrap.Modal(document.getElementById('modalDettaglioDoc'));
        modal.show();
    },

    /**
     * Esporta risultati in CSV
     */
    esportaRisultati() {
        if (this.risultati.length === 0) {
            Utils.showToast('Nessun risultato da esportare', 'warning');
            return;
        }

        let csv = 'ID;Protocollo;Tipo;Assistito;CF;Data Generazione;Data Invio;Data Protocollo;Canale;Destinatario;Stato;Operatore;Note\n';
        
        this.risultati.forEach(d => {
            csv += `"${d.id}";"${d.numeroProtocollo || ''}";"${d.tipoComunicazione}";"${d.assistito}";"${d.cf}";"${Utils.formatDate(d.dataGenerazione)}";"${d.dataInvio ? Utils.formatDate(d.dataInvio) : ''}";"${d.dataProtocollo ? Utils.formatDate(d.dataProtocollo) : ''}";"${d.canale}";"${d.destinatario || ''}";"${d.stato}";"${d.operatore}";"${d.note || ''}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `documenti_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        Utils.showToast('Esportazione completata', 'success');
    }
};

// Inizializza app quando DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    DocumentiApp.init();
});

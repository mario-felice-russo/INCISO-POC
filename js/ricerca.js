/* ========================================
   ASSE InCiSo - Ricerca.js
   Gestione ricerca assistiti
   ======================================== */

const RicercaApp = {
    assistiti: [],
    verbali: [],
    risultati: [],
    currentPage: 1,
    itemsPerPage: 50,
    currentView: 'table',

    /**
     * Inizializza l'applicazione
     */
    async init() {
        console.log('Inizializzazione Ricerca Assistiti...');
        
        try {
            // Carica dati
            this.assistiti = await Utils.loadJSON('data/assistiti.json');
            this.verbali = await Utils.loadJSON('data/verbali.json');
            
            // Integra percentuali dai verbali negli assistiti
            this.integraPercentualiDaVerbali();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Visualizza tutti gli assistiti all'inizio
            this.risultati = [...this.assistiti];
            this.renderRisultati();
            
            Utils.showToast('Ricerca pronta', 'success');
        } catch (error) {
            console.error('Errore inizializzazione:', error);
            Utils.showToast('Errore caricamento dati', 'error');
        }
    },

    /**
     * Integra percentuali dai verbali attivi
     */
    integraPercentualiDaVerbali() {
        this.assistiti.forEach(assistito => {
            // Trova verbali attivi per questo assistito
            const verbaliAssistito = this.verbali.filter(v => 
                v.cf === assistito.cf && v.stato === 'Attivo'
            );
            
            verbaliAssistito.forEach(verbale => {
                if (!assistito.invalidita) {
                    assistito.invalidita = {};
                }
                
                // Mappa i tipi di verbale alle proprietà invalidità
                if (verbale.tipo === 'Invalidità Civile' && verbale.percentuale !== null) {
                    if (typeof assistito.invalidita.civile === 'boolean') {
                        assistito.invalidita.civile = { 
                            attivo: assistito.invalidita.civile,
                            percentuale: verbale.percentuale 
                        };
                    } else if (assistito.invalidita.civile) {
                        assistito.invalidita.civile.percentuale = verbale.percentuale;
                    } else {
                        assistito.invalidita.civile = { 
                            attivo: true,
                            percentuale: verbale.percentuale 
                        };
                    }
                }
                
                // Mappatura per Cecità
                if (verbale.tipo === 'Cecità' && verbale.percentuale !== null) {
                    if (typeof assistito.invalidita.cecita === 'boolean') {
                        assistito.invalidita.cecita = { 
                            attivo: assistito.invalidita.cecita,
                            percentuale: verbale.percentuale 
                        };
                    } else if (assistito.invalidita.cecita) {
                        assistito.invalidita.cecita.percentuale = verbale.percentuale;
                    } else {
                        assistito.invalidita.cecita = { 
                            attivo: true,
                            percentuale: verbale.percentuale 
                        };
                    }
                }
                
                // Mappatura per Sordità
                if (verbale.tipo === 'Sordità' && verbale.percentuale !== null) {
                    if (typeof assistito.invalidita.sordita === 'boolean') {
                        assistito.invalidita.sordita = { 
                            attivo: assistito.invalidita.sordita,
                            percentuale: verbale.percentuale 
                        };
                    } else if (assistito.invalidita.sordita) {
                        assistito.invalidita.sordita.percentuale = verbale.percentuale;
                    } else {
                        assistito.invalidita.sordita = { 
                            attivo: true,
                            percentuale: verbale.percentuale 
                        };
                    }
                }
            });
            
            // Assicura che ogni tipo di invalidità impostato abbia una percentuale
            // Se non c'è verbale ma l'invalidità è true, imposta percentuali di default
            if (assistito.invalidita) {
                if (assistito.invalidita.civile === true) {
                    // Percentuale di default per invalidità civile senza verbale
                    assistito.invalidita.civile = { attivo: true, percentuale: 50 };
                }
                if (assistito.invalidita.cecita === true) {
                    // Cecità richiede sempre una percentuale - default 100%
                    assistito.invalidita.cecita = { attivo: true, percentuale: 100 };
                }
                if (assistito.invalidita.sordita === true) {
                    // Sordità richiede sempre una percentuale - default 100%
                    assistito.invalidita.sordita = { attivo: true, percentuale: 100 };
                }
            }
        });
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
        // Criteri di ricerca
        const criteri = {
            cf: document.getElementById('searchCF')?.value.trim().toUpperCase() || '',
            cognome: document.getElementById('searchCognome')?.value.trim() || '',
            nome: document.getElementById('searchNome')?.value.trim() || '',
            dataNascita: document.getElementById('searchDataNascita')?.value || '',
            dataDecesso: document.getElementById('searchDataDecesso')?.value || '',
            tipoRL: document.getElementById('searchTipoRL')?.value || '',
            rappresentanteLegale: document.getElementById('searchRL')?.value.trim() || '',
            percInvalidita: document.getElementById('searchPercInvalidita')?.value || '',
            percCecita: document.getElementById('searchPercCecita')?.value || '',
            percSordita: document.getElementById('searchPercSordita')?.value || '',
            tipologie: this.getTipologieSelezionate()
        };

        // Se non ci sono filtri, mostra tutti gli assistiti
        const hasFilters = Object.values(criteri).some(v => {
            if (Array.isArray(v)) return v.length > 0;
            return v !== '' && v !== undefined;
        });
        
        if (!hasFilters) {
            this.risultati = [...this.assistiti];
            this.currentPage = 1;
            this.renderRisultati();
            Utils.showToast('Visualizzati tutti gli assistiti', 'info');
            return;
        }

        // Filtra assistiti
        this.risultati = this.assistiti.filter(assistito => {
            let match = true;

            // Criteri specifici
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
            if (criteri.dataDecesso && assistito.dataDecesso !== criteri.dataDecesso) {
                match = false;
            }
            if (criteri.tipoRL && (!assistito.rappresentanteLegale || assistito.rappresentanteLegale.tipo !== criteri.tipoRL)) {
                match = false;
            }
            if (criteri.rappresentanteLegale && (!assistito.rappresentanteLegale || !Utils.normalizeString(assistito.rappresentanteLegale.nome).includes(Utils.normalizeString(criteri.rappresentanteLegale)))) {
                match = false;
            }
            if (criteri.percInvalidita && assistito.invalidita?.civile) {
                const perc = typeof assistito.invalidita.civile === 'object' ? 
                    assistito.invalidita.civile.percentuale : null;
                if (perc && !this.matchPercentuale(perc, criteri.percInvalidita)) match = false;
            }
            if (criteri.percCecita && assistito.invalidita?.cecita) {
                const perc = typeof assistito.invalidita.cecita === 'object' ? 
                    assistito.invalidita.cecita.percentuale : null;
                if (perc && !this.matchPercentuale(perc, criteri.percCecita)) match = false;
            }
            if (criteri.percSordita && assistito.invalidita?.sordita) {
                const perc = typeof assistito.invalidita.sordita === 'object' ? 
                    assistito.invalidita.sordita.percentuale : null;
                if (perc && !this.matchPercentuale(perc, criteri.percSordita)) match = false;
            }
            if (criteri.tipologie.length > 0) {
                const hasTipologia = criteri.tipologie.some(tipo => assistito.invalidita?.[tipo]);
                if (!hasTipologia) match = false;
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
     * Ottieni tipologie selezionate dai badge
     */
    getTipologieSelezionate() {
        const tipologie = [];
        if (document.getElementById('tipoCivile')?.checked) tipologie.push('civile');
        if (document.getElementById('tipoCecita')?.checked) tipologie.push('cecita');
        if (document.getElementById('tipoSordita')?.checked) tipologie.push('sordita');
        return tipologie;
    },

    /**
     * Match percentuale con range
     */
    matchPercentuale(perc, range) {
        if (!range || !perc) return true;
        if (range === '0-33') return perc >= 0 && perc <= 33;
        if (range === '34-66') return perc >= 34 && perc <= 66;
        if (range === '67-99') return perc >= 67 && perc <= 99;
        if (range === '100') return perc === 100;
        if (range === '1-99') return perc >= 1 && perc <= 99;
        return true;
    },

    /**
     * Ottieni colore per tipologia invalidità
     */
    getColoreTipologia(assistito) {
        if (!assistito.invalidita) return null;
        
        // Gestisce sia booleani che oggetti
        const hasCivile = typeof assistito.invalidita.civile === 'object' ? 
            assistito.invalidita.civile.attivo : assistito.invalidita.civile;
        const hasCecita = typeof assistito.invalidita.cecita === 'object' ? 
            assistito.invalidita.cecita.attivo : assistito.invalidita.cecita;
        const hasSordita = typeof assistito.invalidita.sordita === 'object' ? 
            assistito.invalidita.sordita.attivo : assistito.invalidita.sordita;
        
        // Priorità: civile > cecità > sordità
        if (hasCivile) {
            return { bg: 'rgba(0, 102, 204, 0.1)', border: '#0066CC', badge: 'primary' };
        }
        if (hasCecita) {
            return { bg: 'rgba(255, 193, 7, 0.1)', border: '#FFC107', badge: 'warning' };
        }
        if (hasSordita) {
            return { bg: 'rgba(23, 162, 184, 0.1)', border: '#17A2B8', badge: 'info' };
        }
        return null;
    },

    /**
     * Reset ricerca
     */
    resetRicerca() {
        document.getElementById('formRicerca').reset();
        this.risultati = [...this.assistiti];
        this.currentPage = 1;
        
        // Visualizza tutti gli assistiti
        this.renderRisultati();
        
        Utils.showToast('Visualizzati tutti gli assistiti', 'info');
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
                        <td colspan="11" class="text-center text-muted py-4">
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

        tbody.innerHTML = paginatedItems.map(assistito => {
            // Colore in base a tipologia invalidità
            const colore = this.getColoreTipologia(assistito);
            const rowStyle = colore ? 
                `cursor: pointer; background-color: ${colore.bg}; border-left: 3px solid ${colore.border};` : 
                'cursor: pointer;';
            
            // Badge tipologia - mostra tutti i badge presenti
            let badgesTipologia = [];
            if (assistito.invalidita) {
                // Gestisce sia booleani che oggetti
                const hasCivile = typeof assistito.invalidita.civile === 'object' ? 
                    assistito.invalidita.civile.attivo : assistito.invalidita.civile;
                const hasCecita = typeof assistito.invalidita.cecita === 'object' ? 
                    assistito.invalidita.cecita.attivo : assistito.invalidita.cecita;
                const hasSordita = typeof assistito.invalidita.sordita === 'object' ? 
                    assistito.invalidita.sordita.attivo : assistito.invalidita.sordita;
                
                if (hasCivile) {
                    badgesTipologia.push('<span class="badge" style="background-color: #0066CC; color: white;"><i class="bi bi-person-wheelchair"></i> Inv. Civile</span>');
                }
                if (hasCecita) {
                    badgesTipologia.push('<span class="badge" style="background-color: #FFA500; color: white;"><i class="bi bi-eye-slash"></i> Cecità</span>');
                }
                if (hasSordita) {
                    badgesTipologia.push('<span class="badge" style="background-color: #00B4D8; color: white;"><i class="bi bi-ear"></i> Sordità</span>');
                }
            }
            const badgesHtml = badgesTipologia.length > 0 ? 
                badgesTipologia.join(' ') : 
                '<span class="text-muted">-</span>';
            
            // Tipo rappresentante legale
            const tipoRL = assistito.rappresentanteLegale?.tipo || '-';
            const nomeRL = assistito.rappresentanteLegale?.nome || '-';
            
            // Percentuali - ogni invalidità attiva DEVE avere una percentuale
            const getPercentuale = (invalidita) => {
                if (!invalidita) return '-';
                if (typeof invalidita === 'object' && invalidita.percentuale !== undefined && invalidita.percentuale !== null) {
                    return `${invalidita.percentuale}%`;
                }
                // Se l'invalidità è presente ma manca la percentuale, mostra errore
                return invalidita ? '<span class="text-danger">ERR</span>' : '-';
            };
            
            const percINV = getPercentuale(assistito.invalidita?.civile);
            const percCecita = getPercentuale(assistito.invalidita?.cecita);
            const percSordita = getPercentuale(assistito.invalidita?.sordita);
            
            return `
                <tr style="${rowStyle}" onclick="LayoutManager.loadPage('dettaglio'); setTimeout(() => { if(typeof DettaglioApp !== 'undefined') DettaglioApp.loadAssistito('${assistito.cf}'); }, 100);">
                    <td>${badgesHtml}</td>
                    <td><code class="user-select-all">${assistito.cf}</code></td>
                    <td><strong>${Utils.escapeHtml(assistito.cognome)}</strong></td>
                    <td>${Utils.escapeHtml(assistito.nome)}</td>
                    <td>${Utils.formatDate(assistito.dataNascita)}</td>
                    <td>${Utils.escapeHtml(tipoRL)}</td>
                    <td>${Utils.escapeHtml(nomeRL)}</td>
                    <td class="text-center"><strong>${percINV}</strong></td>
                    <td class="text-center"><strong>${percCecita}</strong></td>
                    <td class="text-center"><strong>${percSordita}</strong></td>
                    <td class="text-center">
                        <i class="bi bi-folder2-open text-primary"></i>
                    </td>
                </tr>
            `;
        }).join('');
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

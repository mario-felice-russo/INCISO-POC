/* ======================================== 
   ASSE InCiSo - Dettaglio.js
   Gestione fascicolo personale assistito
   ======================================== */

const DettaglioApp = {
    cf: null,
    assistito: null,
    prestazioni: [],
    verbali: [],
    comunicazioni: [],
    evidenze: [],
    note: [],
    tabsLoaded: {
        riepilogo: false,
        prestazioni: false,
        verbali: false,
        comunicazioni: false,
        evidenze: false,
        note: false,
        log: false
    },

    /**
     * Inizializza l'applicazione
     */
    async init() {
        console.log('Inizializzazione Fascicolo Personale...');
        
        // Estrai CF da URL
        const params = new URLSearchParams(window.location.search);
        this.cf = params.get('cf');

        if (!this.cf) {
            Utils.showToast('Codice Fiscale mancante', 'error');
            window.location.href = 'ricerca.html';
            return;
        }

        try {
            // Carica tutti i dati
            await this.loadAllData();
            
            // Rend header
            this.renderHeader();
            
            // Renderizza tab riepilogo (attivo di default)
            this.loadTabRiepilogo();
            
            // Setup event listeners per tabs
            this.setupTabListeners();
            
        } catch (error) {
            console.error('Errore inizializzazione:', error);
            Utils.showToast('Errore caricamento fascicolo', 'error');
        }
    },

    /**
     * Carica tutti i dati necessari
     */
    async loadAllData() {
        const [assistiti, prestazioni, verbali, comunicazioni, evidenze, note] = await Promise.all([
            Utils.loadJSON('data/assistiti.json'),
            Utils.loadJSON('data/prestazioni.json'),
            Utils.loadJSON('data/verbali.json'),
            Utils.loadJSON('data/comunicazioni.json'),
            Utils.loadJSON('data/evidenze.json'),
            Utils.loadJSON('data/note.json')
        ]);

        this.assistito = assistiti.find(a => a.cf === this.cf);
        if (!this.assistito) {
            throw new Error('Assistito non trovato');
        }

        this.prestazioni = prestazioni.filter(p => p.cf === this.cf);
        this.verbali = verbali.filter(v => v.cf === this.cf);
        this.comunicazioni = comunicazioni.filter(c => c.cf === this.cf);
        this.evidenze = evidenze.filter(e => e.cf === this.cf);
        this.note = note.filter(n => n.cf === this.cf);
    },

    /**
     * Renderizza header assistito
     */
    renderHeader() {
        const header = document.getElementById('assistitoHeader');
        if (!header) return;

        header.innerHTML = `
            <h2><i class="bi bi-person-circle"></i> ${Utils.escapeHtml(this.assistito.cognome)} ${Utils.escapeHtml(this.assistito.nome)}</h2>
            <div class="info-row">
                <div class="info-item">
                    <i class="bi bi-credit-card"></i>
                    <strong>CF:</strong> <span class="cf-highlight">${this.assistito.cf}</span>
                </div>
                <div class="info-item">
                    <i class="bi bi-calendar3"></i>
                    <strong>Nato il:</strong> ${Utils.formatDate(this.assistito.dataNascita)} - ${this.assistito.luogoNascita}
                </div>
                <div class="info-item">
                    <i class="bi bi-geo-alt"></i>
                    <strong>Residenza:</strong> ${Utils.escapeHtml(this.assistito.indirizzo)}, ${Utils.escapeHtml(this.assistito.comune)}
                </div>
                <div class="info-item">
                    <span class="badge ${this.assistito.stato === 'Attivo' ? 'bg-success' : 'bg-warning'}">
                        ${this.assistito.stato}
                    </span>
                </div>
            </div>
        `;
    },

    /**
     * Setup event listeners per tabs
     */
    setupTabListeners() {
        const tabs = document.querySelectorAll('#fascicoloTabs button[data-bs-toggle="tab"]');
        tabs.forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const target = e.target.getAttribute('data-bs-target').replace('#', '');
                const methodName = `loadTab${target.charAt(0).toUpperCase() + target.slice(1)}`;
                
                if (this[methodName] && !this.tabsLoaded[target]) {
                    this[methodName]();
                    this.tabsLoaded[target] = true;
                }
            });
        });
    },

    /**
     * TAB RIEPILOGO
     */
    loadTabRiepilogo() {
        if (this.tabsLoaded.riepilogo) return;

        // Dati anagrafici
        const datiContainer = document.getElementById('datiAnagrafici');
        if (datiContainer) {
            datiContainer.innerHTML = `
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <strong>Codice Fiscale:</strong><br>
                        <code>${this.assistito.cf}</code>
                    </div>
                    <div class="col-md-6 mb-3">
                        <strong>Data Nascita:</strong><br>
                        ${Utils.formatDate(this.assistito.dataNascita)}
                    </div>
                    <div class="col-md-6 mb-3">
                        <strong>Luogo Nascita:</strong><br>
                        ${Utils.escapeHtml(this.assistito.luogoNascita)}
                    </div>
                    <div class="col-md-6 mb-3">
                        <strong>Sesso:</strong><br>
                        ${this.assistito.sesso === 'M' ? 'Maschile' : 'Femminile'}
                    </div>
                    <div class="col-12 mb-3">
                        <strong>Indirizzo:</strong><br>
                        ${Utils.escapeHtml(this.assistito.indirizzo)}<br>
                        ${this.assistito.cap} ${Utils.escapeHtml(this.assistito.comune)} (${this.assistito.provincia})
                    </div>
                    <div class="col-md-6 mb-3">
                        <strong>Telefono:</strong><br>
                        ${this.assistito.telefono || '-'}
                    </div>
                    <div class="col-md-6 mb-3">
                        <strong>Email:</strong><br>
                        ${this.assistito.email || '-'}
                    </div>
                    <div class="col-md-6 mb-3">
                        <strong>Data Iscrizione:</strong><br>
                        ${Utils.formatDate(this.assistito.dataIscrizione)}
                    </div>
                    <div class="col-md-6 mb-3">
                        <strong>Operatore Riferimento:</strong><br>
                        ${Utils.escapeHtml(this.assistito.operatoreRiferimento)}
                    </div>
                </div>
            `;
        }

        // Statistiche
        const statsContainer = document.getElementById('statistiche');
        if (statsContainer) {
            const evidenzeScadute = this.evidenze.filter(e => Utils.getEvidenzaStato(e.dataScadenza) === 'Scaduta').length;
            const evidenzeCorrenti = this.evidenze.filter(e => Utils.getEvidenzaStato(e.dataScadenza) === 'Corrente').length;
            const prestazioniAttive = this.prestazioni.filter(p => p.stato === 'Concessa').length;

            statsContainer.innerHTML = `
                <div class="row g-3">
                    <div class="col-md-6">
                        <div class="card stat-card stat-success">
                            <div class="card-body">
                                <div class="stat-value">${prestazioniAttive}</div>
                                <div class="stat-label">Prestazioni Attive</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card stat-card stat-danger">
                            <div class="card-body">
                                <div class="stat-value">${evidenzeScadute}</div>
                                <div class="stat-label">Evidenze Scadute</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card stat-card stat-warning">
                            <div class="card-body">
                                <div class="stat-value">${evidenzeCorrenti}</div>
                                <div class="stat-label">Evidenze Correnti</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card stat-card stat-info">
                            <div class="card-body">
                                <div class="stat-value">${this.verbali.filter(v => v.stato === 'Attivo').length}</div>
                                <div class="stat-label">Verbali Attivi</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Evidenze recenti
        const evidenzeRecentiContainer = document.getElementById('evidenzeRecenti');
        if (evidenzeRecentiContainer) {
            const recenti = this.evidenze
                .sort((a, b) => new Date(b.dataInserimento) - new Date(a.dataInserimento))
                .slice(0, 5);

            if (recenti.length === 0) {
                evidenzeRecentiContainer.innerHTML = '<p class="text-muted">Nessuna evidenza registrata</p>';
            } else {
                evidenzeRecentiContainer.innerHTML = recenti.map(e => `
                    <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                        <div>
                            <strong>${Utils.escapeHtml(e.descrizione)}</strong><br>
                            <small class="text-muted">${Utils.escapeHtml(e.tipoEvidenza)} - ${Utils.formatDate(e.dataScadenza)}</small>
                        </div>
                        <span class="badge bg-${Utils.getPrioritaClass(e.priorita)}">${e.priorita}</span>
                    </div>
                `).join('');
            }
        }

        this.tabsLoaded.riepilogo = true;
    },

    /**
     * TAB PRESTAZIONI
     */
    loadTabPrestazioni() {
        const container = document.getElementById('prestazioniContent');
        if (!container) return;

        if (this.prestazioni.length === 0) {
            container.innerHTML = '<p class="text-muted">Nessuna prestazione registrata</p>';
            return;
        }

        container.innerHTML = this.prestazioni.map(p => {
            const statoClass = p.stato === 'Concessa' ? 'prestazione-concessa' : 
                              p.stato === 'Sospesa' ? 'prestazione-sospesa' : 'prestazione-revocata';
            
            return `
                <div class="card prestazione-card ${statoClass} mb-3">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-8">
                                <h5>${Utils.escapeHtml(p.tipoPrestazione)}</h5>
                                <p class="mb-2"><strong>Codice:</strong> ${p.codice}</p>
                                <p class="mb-2"><strong>Decorrenza:</strong> ${Utils.formatDate(p.dataDecorrenza)}</p>
                                ${p.dataScadenza ? `<p class="mb-2"><strong>Scadenza:</strong> ${Utils.formatDate(p.dataScadenza)}</p>` : ''}
                                <p class="mb-0"><strong>Stato:</strong> <span class="badge bg-${p.stato === 'Concessa' ? 'success' : p.stato === 'Sospesa' ? 'warning' : 'danger'}">${p.stato}</span></p>
                            </div>
                            <div class="col-md-4 text-end">
                                <div class="importo-prestazione ${p.stato === 'Sospesa' ? 'sospeso' : p.stato === 'Revocata' ? 'revocato' : ''}">
                                    ${Utils.formatCurrency(p.importoMensile)}
                                </div>
                                <small class="text-muted">Importo mensile</small>
                            </div>
                        </div>
                        ${p.note ? `<p class="mt-2 text-muted small"><i class="bi bi-info-circle"></i> ${Utils.escapeHtml(p.note)}</p>` : ''}
                        
                        <!-- Griglia mensilità -->
                        ${p.mensilita && p.mensilita.length > 0 ? `
                            <hr>
                            <h6>Mensilità</h6>
                            <div class="griglia-mensilita">
                                ${p.mensilita.map(m => `
                                    <div class="mese-cell ${m.stato}">
                                        <div class="mese-nome">${m.mese}</div>
                                        <div class="mese-importo">${Utils.formatCurrency(m.importo)}</div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * TAB VERBALI
     */
    loadTabVerbali() {
        const container = document.getElementById('verbaliContent');
        if (!container) return;

        if (this.verbali.length === 0) {
            container.innerHTML = '<p class="text-muted">Nessun verbale registrato</p>';
            return;
        }

        // Ordina per data emissione (più recenti prima)
        const verbaliOrdinati = this.verbali.sort((a, b) => new Date(b.dataEmissione) - new Date(a.dataEmissione));

        container.innerHTML = `
            <div class="verbale-timeline">
                ${verbaliOrdinati.map(v => `
                    <div class="verbale-item ${v.stato === 'Attivo' ? 'verbale-attivo' : 'verbale-superato'}">
                        <div class="verbale-card ${v.stato === 'Superato' ? 'verbale-superato' : ''}">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                    <h6 class="mb-1">${Utils.escapeHtml(v.tipo)}</h6>
                                    <small class="text-muted">${v.numero}</small>
                                </div>
                                <span class="badge ${v.stato === 'Attivo' ? 'bg-success' : 'bg-secondary'}">${v.stato}</span>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-2">
                                    <strong>Data Emissione:</strong> ${Utils.formatDate(v.dataEmissione)}
                                </div>
                                <div class="col-md-6 mb-2">
                                    <strong>Data Scadenza:</strong> ${v.dataScadenza ? Utils.formatDate(v.dataScadenza) : 'Permanente'}
                                </div>
                                ${v.percentuale ? `
                                <div class="col-md-6 mb-2">
                                    <strong>Percentuale:</strong> ${v.percentuale}%
                                </div>
                                ` : ''}
                                <div class="col-12 mb-2">
                                    <strong>Commissione:</strong> ${Utils.escapeHtml(v.commissione)}
                                </div>
                                <div class="col-12 mb-2">
                                    <strong>Esito:</strong> ${Utils.escapeHtml(v.esito)}
                                </div>
                                ${v.note ? `
                                <div class="col-12">
                                    <small class="text-muted"><i class="bi bi-info-circle"></i> ${Utils.escapeHtml(v.note)}</small>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    /**
     * TAB COMUNICAZIONI
     */
    loadTabComunicazioni() {
        const container = document.getElementById('comunicazioniContent');
        if (!container) return;

        if (this.comunicazioni.length === 0) {
            container.innerHTML = '<p class="text-muted">Nessuna comunicazione registrata</p>';
            return;
        }

        // Ordina per data generazione (più recenti prima)
        const comunicazioniOrdinate = this.comunicazioni.sort((a, b) => new Date(b.dataGenerazione) - new Date(a.dataGenerazione));

        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Tipo</th>
                            <th>Oggetto</th>
                            <th>Data Generazione</th>
                            <th>Data Invio</th>
                            <th>Protocollo</th>
                            <th>Canale</th>
                            <th>Stato</th>
                            <th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${comunicazioniOrdinate.map(c => `
                            <tr class="comunicazione-row">
                                <td><span class="badge bg-primary">${Utils.escapeHtml(c.tipoComunicazione)}</span></td>
                                <td>${Utils.escapeHtml(c.oggetto)}</td>
                                <td>${Utils.formatDate(c.dataGenerazione)}</td>
                                <td>${c.dataInvio ? Utils.formatDate(c.dataInvio) : '-'}</td>
                                <td>${c.numeroProtocollo ? `<code>${c.numeroProtocollo}</code>` : '-'}</td>
                                <td><span class="badge bg-info">${c.canale}</span></td>
                                <td><span class="stato-comunicazione ${c.stato.toLowerCase()}">${c.stato}</span></td>
                                <td>
                                    <button class="btn btn-sm btn-outline-primary" title="Visualizza">
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
     * TAB EVIDENZE
     */
    loadTabEvidenze() {
        const container = document.getElementById('evidenzeContent');
        if (!container) return;

        if (this.evidenze.length === 0) {
            container.innerHTML = '<p class="text-muted">Nessuna evidenza registrata</p>';
            return;
        }

        // Aggiorna stati dinamici
        this.evidenze.forEach(e => {
            e.stato = Utils.getEvidenzaStato(e.dataScadenza);
        });

        // Ordina per data scadenza
        const evidenzeOrdinate = this.evidenze.sort((a, b) => new Date(a.dataScadenza) - new Date(b.dataScadenza));

        container.innerHTML = evidenzeOrdinate.map(e => {
            const giorni = Utils.daysFromNow(e.dataScadenza);
            let badgeGiorni = '';
            let badgeClass = '';

            if (giorni !== null) {
                if (giorni < 0) {
                    badgeGiorni = `Scaduta da ${Math.abs(giorni)} giorni`;
                    badgeClass = 'bg-danger';
                } else if (giorni === 0) {
                    badgeGiorni = 'Scade oggi';
                    badgeClass = 'bg-danger';
                } else if (giorni <= 7) {
                    badgeGiorni = `Scade tra ${giorni} giorni`;
                    badgeClass = 'bg-warning';
                } else {
                    badgeGiorni = `Scade tra ${giorni} giorni`;
                    badgeClass = 'bg-info';
                }
            }

            return `
                <div class="card evidenza-card border-${Utils.getPrioritaClass(e.priorita)} mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6>${Utils.escapeHtml(e.descrizione)}</h6>
                            <span class="badge bg-${Utils.getPrioritaClass(e.priorita)}">${e.priorita}</span>
                        </div>
                        <p class="mb-2">
                            <span class="badge bg-secondary">${Utils.escapeHtml(e.tipoEvidenza)}</span>
                        </p>
                        <p class="mb-2">
                            <strong>Scadenza:</strong> ${Utils.formatDate(e.dataScadenza)}
                            ${badgeGiorni ? `<span class="badge ${badgeClass} ms-2">${badgeGiorni}</span>` : ''}
                        </p>
                        ${e.note ? `<p class="text-muted small mb-0"><i class="bi bi-sticky"></i> ${Utils.escapeHtml(e.note)}</p>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * TAB NOTE
     */
    loadTabNote() {
        const container = document.getElementById('noteContent');
        if (!container) return;

        if (this.note.length === 0) {
            container.innerHTML = '<p class="text-muted">Nessuna nota registrata</p>';
            return;
        }

        // Ordina per data creazione (più recenti prime)
        const noteOrdinate = this.note.sort((a, b) => new Date(b.dataCreazione) - new Date(a.dataCreazione));

        container.innerHTML = noteOrdinate.map(n => {
            const categoriaClass = Utils.getNotaCategoriaClass(n.categoria);
            return `
                <div class="card nota-card ${n.principale ? 'nota-principale' : ''} mb-3">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <div>
                            <span class="badge nota-categoria-badge ${categoriaClass} text-white">${Utils.escapeHtml(n.categoria)}</span>
                            ${n.principale ? '<i class="bi bi-star-fill text-warning ms-2"></i>' : ''}
                        </div>
                        <small class="text-muted">${Utils.formatDateTime(n.dataCreazione)}</small>
                    </div>
                    <div class="card-body">
                        <h6>${Utils.escapeHtml(n.titolo)}</h6>
                        <p class="nota-testo">${Utils.escapeHtml(n.testo)}</p>
                        <div class="nota-footer">
                            <small><i class="bi bi-person"></i> ${Utils.escapeHtml(n.operatore)}</small>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * TAB LOG
     */
    loadTabLog() {
        const container = document.getElementById('logContent');
        if (!container) return;

        // Genera log fittizio per demo
        const logEntries = [
            { data: '2024-03-01T10:30:00', operatore: 'Dott. Bianchi', operazione: 'MODIFICA_ANAGRAFICA', descrizione: 'Aggiornamento indirizzo residenza' },
            { data: '2024-02-28T14:15:00', operatore: 'Dott. Bianchi', operazione: 'INSERIMENTO_NOTA', descrizione: 'Aggiunta nota IBAN errato' },
            { data: '2024-02-20T09:00:00', operatore: 'Dott. Bianchi', operazione: 'VISUALIZZAZIONE_FASCICOLO', descrizione: 'Consultazione fascicolo' },
            { data: '2024-02-15T16:45:00', operatore: 'Dott. Bianchi', operazione: 'GENERAZIONE_COMUNICAZIONE', descrizione: 'Generata comunicazione richiesta documenti' }
        ];

        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-sm log-table">
                    <thead>
                        <tr>
                            <th>Data/Ora</th>
                            <th>Operatore</th>
                            <th>Operazione</th>
                            <th>Descrizione</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${logEntries.map(log => `
                            <tr>
                                <td>${Utils.formatDateTime(log.data)}</td>
                                <td>${Utils.escapeHtml(log.operatore)}</td>
                                <td><code class="log-operazione">${log.operazione}</code></td>
                                <td>${Utils.escapeHtml(log.descrizione)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
};

// Inizializza app quando DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    DettaglioApp.init();
});

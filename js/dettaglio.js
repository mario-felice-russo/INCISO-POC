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
        'invalidita-civile': false,
        sordita: false,
        cecita: false,
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
        
        // Setup event listeners per tabs
        this.setupTabListeners();
        
        // Estrai CF da URL (per accesso diretto)
        const params = new URLSearchParams(window.location.search);
        const cfFromUrl = params.get('cf');
        
        if (cfFromUrl) {
            await this.loadAssistito(cfFromUrl);
        }
    },
    
    /**
     * Carica dati di un assistito specifico
     */
    async loadAssistito(codiceFiscale) {
        this.cf = codiceFiscale;
        
        if (!this.cf) {
            Utils.showToast('Codice Fiscale mancante', 'error');
            return;
        }

        try {
            // Reset tabs loaded
            Object.keys(this.tabsLoaded).forEach(key => this.tabsLoaded[key] = false);
            
            // Carica tutti i dati
            await this.loadAllData();
            
            // Rendi header
            this.renderHeader();
            
            // Renderizza tab riepilogo (attivo di default)
            this.loadTabRiepilogo();
            
            Utils.showToast(`Fascicolo di ${this.assistito.cognome} ${this.assistito.nome} caricato`, 'success');
            
        } catch (error) {
            console.error('Errore caricamento assistito:', error);
            Utils.showToast('Errore caricamento fascicolo', 'error');
        }
    },

    /**
     * Carica tutti i dati necessari
     */
    async loadAllData() {
        // Prova a caricare l'anagrafica completa da file dedicato
        let anagraficaCompleta = null;
        try {
            anagraficaCompleta = await Utils.loadJSON(`data/anagrafica-${this.cf}.json`);
        } catch (error) {
            console.log('File anagrafica non trovato, uso dati base da assistiti.json');
        }

        const [assistiti, prestazioni, verbali, comunicazioni, evidenze, note, prestazioniInvalidita] = await Promise.all([
            Utils.loadJSON('data/assistiti.json'),
            Utils.loadJSON('data/prestazioni.json'),
            Utils.loadJSON('data/verbali.json'),
            Utils.loadJSON('data/comunicazioni.json'),
            Utils.loadJSON('data/evidenze.json'),
            Utils.loadJSON('data/note.json'),
            Utils.loadJSON('data/prestazioni-invalidita.json')
        ]);

        this.assistito = assistiti.find(a => a.cf === this.cf);
        if (!this.assistito) {
            throw new Error('Assistito non trovato');
        }

        // Se abbiamo l'anagrafica completa, mergia i dati
        if (anagraficaCompleta) {
            this.assistito = { ...this.assistito, ...anagraficaCompleta };
        }

        // Aggiungi campi mancanti con valori di default se necessario
        if (!this.assistito.residenza && this.assistito.indirizzo) {
            this.assistito.residenza = {
                indirizzo: this.assistito.indirizzo,
                cap: this.assistito.cap,
                comune: this.assistito.comune,
                provincia: this.assistito.provincia
            };
        }

        this.prestazioni = prestazioni.filter(p => p.cf === this.cf);
        this.verbali = verbali.filter(v => v.cf === this.cf);
        this.comunicazioni = comunicazioni.filter(c => c.cf === this.cf);
        this.evidenze = evidenze.filter(e => e.cf === this.cf);
        this.note = note.filter(n => n.cf === this.cf);
        this.prestazioniInvalidita = prestazioniInvalidita.find(p => p.cf === this.cf) || null;
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
                
                // Converti nome tab in camelCase per nome metodo
                // invalidita-civile -> InvaliditaCivile
                const methodName = 'loadTab' + target
                    .split('-')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join('');
                
                console.log('Tab activated:', target, 'Method:', methodName);
                
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

        // Riepilogo Prestazioni
        this.renderRiepilogoPrestazioni();

        // Dati anagrafici
        const datiContainer = document.getElementById('datiAnagrafici');
        if (datiContainer) {
            // Determina stato SABES/ASDAA in base ai verbali
            let statoSABES = 'Da Valutare';
            let badgeClass = 'bg-secondary';
            
            if (this.verbali.length > 0) {
                const verbaleAttivo = this.verbali.find(v => v.stato === 'Attivo');
                if (verbaleAttivo) {
                    statoSABES = 'Verbale Attivo';
                    badgeClass = 'bg-success';
                } else {
                    statoSABES = 'In Revisione';
                    badgeClass = 'bg-warning';
                }
            }
            
            datiContainer.innerHTML = `
                <!-- Header con Badge Stato e Pulsante Stampa -->
                <div class="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                    <div>
                        <span class="badge ${badgeClass} me-2" style="font-size: 0.9rem; padding: 0.5rem 0.75rem;">
                            <i class="bi bi-file-medical"></i> ${statoSABES}
                        </span>
                        ${this.assistito.stato === 'Attivo' ? 
                            '<span class="badge bg-success" style="font-size: 0.9rem; padding: 0.5rem 0.75rem;"><i class="bi bi-check-circle"></i> Attivo</span>' : 
                            '<span class="badge bg-secondary" style="font-size: 0.9rem; padding: 0.5rem 0.75rem;"><i class="bi bi-dash-circle"></i> ' + this.assistito.stato + '</span>'}
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="window.print()">
                        <i class="bi bi-printer"></i> Stampa Fascicolo
                    </button>
                </div>
                
                <!-- Dati Generali -->
                <h6 class="text-primary mb-3"><i class="bi bi-person"></i> Dati Generali</h6>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <strong>Codice Fiscale:</strong><br>
                        <code class="fs-6">${this.assistito.cf}</code>
                    </div>
                    <div class="col-md-6 mb-3">
                        <strong>Sesso:</strong><br>
                        ${this.assistito.sesso === 'M' ? 'Maschile' : 'Femminile'}
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
                        <strong>Stato Civile:</strong><br>
                        ${this.assistito.statoCivile || 'Non specificato'}
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
                </div>
                
                <!-- Cittadinanza e Lingua -->
                <hr>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <div class="alert alert-warning mb-0 py-2" style="border-left: 4px solid #ffc107;">
                            <strong><i class="bi bi-globe"></i> Cittadinanza:</strong><br>
                            <span class="fw-bold">${this.assistito.cittadinanza || 'Italiana'}</span>
                        </div>
                    </div>
                    <div class="col-md-6 mb-3">
                        <strong><i class="bi bi-translate"></i> Lingua Preferita:</strong><br>
                        <select class="form-select" id="linguaPreferita">
                            <option value="IT" ${(!this.assistito.linguaPreferita || this.assistito.linguaPreferita === 'IT') ? 'selected' : ''}>Italiano</option>
                            <option value="DE" ${this.assistito.linguaPreferita === 'DE' ? 'selected' : ''}>Tedesco</option>
                            <option value="EN" ${this.assistito.linguaPreferita === 'EN' ? 'selected' : ''}>Inglese</option>
                        </select>
                    </div>
                </div>
                
                <!-- Residenza -->
                <hr>
                <h6 class="text-primary mb-3"><i class="bi bi-house"></i> Residenza</h6>
                <div class="card bg-light mb-3">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-12 mb-2">
                                <strong>Indirizzo:</strong><br>
                                ${Utils.escapeHtml(this.assistito.residenza?.indirizzo || this.assistito.indirizzo)}
                            </div>
                            <div class="col-md-4">
                                <strong>CAP:</strong><br>
                                ${this.assistito.residenza?.cap || this.assistito.cap}
                            </div>
                            <div class="col-md-4">
                                <strong>Comune:</strong><br>
                                ${Utils.escapeHtml(this.assistito.residenza?.comune || this.assistito.comune)}
                            </div>
                            <div class="col-md-4">
                                <strong>Provincia:</strong><br>
                                ${this.assistito.residenza?.provincia || this.assistito.provincia}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Domicilio -->
                <h6 class="text-primary mb-3"><i class="bi bi-mailbox"></i> Domicilio</h6>
                <div class="card bg-light mb-3">
                    <div class="card-body">
                        ${this.assistito.domicilio ? `
                        <div class="row">
                            <div class="col-12 mb-2">
                                <strong>Indirizzo:</strong><br>
                                ${Utils.escapeHtml(this.assistito.domicilio.indirizzo)}
                            </div>
                            <div class="col-md-4">
                                <strong>CAP:</strong><br>
                                ${this.assistito.domicilio.cap}
                            </div>
                            <div class="col-md-4">
                                <strong>Comune:</strong><br>
                                ${Utils.escapeHtml(this.assistito.domicilio.comune)}
                            </div>
                            <div class="col-md-4">
                                <strong>Provincia:</strong><br>
                                ${this.assistito.domicilio.provincia}
                            </div>
                        </div>
                        ` : '<p class="text-muted mb-0">Coincide con la residenza</p>'}
                    </div>
                </div>
                
                <!-- Estremi Pagamento -->
                <hr>
                <h6 class="text-primary mb-3"><i class="bi bi-credit-card"></i> Estremi Pagamento</h6>
                <div class="alert alert-success" style="border-left: 4px solid #198754;">
                    <div class="row">
                        <div class="col-md-8 mb-2">
                            <strong>IBAN:</strong><br>
                            <input type="text" class="form-control" id="ibanAssistito" 
                                   value="${this.assistito.iban || ''}" 
                                   placeholder="IT00 0000 0000 0000 0000 0000 000"
                                   maxlength="27" disabled>
                        </div>
                        <div class="col-md-4 mb-2">
                            <strong>Intestatario:</strong><br>
                            ${this.assistito.intestatarioIban || this.assistito.cognome + ' ' + this.assistito.nome}
                        </div>
                    </div>
                </div>
                
                <!-- Rappresentante Legale -->
                ${this.assistito.rappresentanteLegale ? `
                <hr>
                <h6 class="text-primary mb-3"><i class="bi bi-person-badge"></i> Rappresentante Legale</h6>
                <div class="card border-warning mb-3">
                    <div class="card-body bg-warning bg-opacity-10">
                        <div class="row">
                            <div class="col-md-6 mb-2">
                                <strong>Tipo:</strong><br>
                                <span class="badge bg-warning text-dark">${Utils.escapeHtml(this.assistito.rappresentanteLegale.tipo)}</span>
                            </div>
                            <div class="col-md-6 mb-2">
                                <strong>Nome:</strong><br>
                                ${Utils.escapeHtml(this.assistito.rappresentanteLegale.nome)}
                            </div>
                            <div class="col-md-6 mb-2">
                                <strong>Codice Fiscale:</strong><br>
                                <code>${this.assistito.rappresentanteLegale.cf}</code>
                            </div>
                            <div class="col-md-6 mb-2">
                                <strong>Rapporto:</strong><br>
                                ${Utils.escapeHtml(this.assistito.rappresentanteLegale.rapporto || 'Tutore legale')}
                            </div>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                <!-- Operatore Riferimento -->
                <hr>
                <div class="alert alert-info" style="border-left: 4px solid #0dcaf0;">
                    <strong><i class="bi bi-person-badge"></i> Operatore Riferimento:</strong><br>
                    <span class="fs-6 fw-bold">${Utils.escapeHtml(this.assistito.operatoreRiferimento)}</span>
                </div>
                
                <!-- Pulsanti Modifica/Salva -->
                <div class="d-flex gap-2 mt-3">
                    <button class="btn btn-warning" id="btnModificaAnagrafica">
                        <i class="bi bi-pencil"></i> Modifica
                    </button>
                    <button class="btn btn-success d-none" id="btnSalvaAnagrafica">
                        <i class="bi bi-save"></i> Salva Modifiche
                    </button>
                    <button class="btn btn-secondary d-none" id="btnAnnullaModifica">
                        <i class="bi bi-x-circle"></i> Annulla
                    </button>
                </div>
            `;
            
            // Setup event listeners per modifica
            this.setupEditListeners();
        }

        // Checklist Completezza Fascicolo
        const statsContainer = document.getElementById('statistiche');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="accordion" id="checklistAccordion">
                    <!-- I. Dati Anagrafici -->
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapse1">
                                <i class="bi bi-person-vcard me-2"></i> I. Dati Anagrafici e di Identificazione
                            </button>
                        </h2>
                        <div id="collapse1" class="accordion-collapse collapse show" data-bs-parent="#checklistAccordion">
                            <div class="accordion-body">
                                <div class="checklist-item complete">
                                    <i class="bi bi-check-circle-fill checklist-icon"></i>
                                    <span class="checklist-label">Dati Anagrafici Essenziali (CF, Nome, Data Nascita, Stato Civile)</span>
                                </div>
                                <div class="checklist-item ${this.assistito.indirizzo ? 'complete' : 'missing'}">
                                    <i class="bi bi-${this.assistito.indirizzo ? 'check-circle-fill' : 'x-circle-fill'} checklist-icon"></i>
                                    <span class="checklist-label">Residenza e Domicilio</span>
                                </div>
                                <div class="checklist-item optional">
                                    <i class="bi bi-circle checklist-icon"></i>
                                    <span class="checklist-label">Data Decesso (se applicabile)</span>
                                </div>
                                <div class="checklist-item optional">
                                    <i class="bi bi-circle checklist-icon"></i>
                                    <span class="checklist-label">Cittadinanza e Permesso di Soggiorno</span>
                                </div>
                                <div class="checklist-item optional">
                                    <i class="bi bi-circle checklist-icon"></i>
                                    <span class="checklist-label">Lingua di Comunicazione Preferita</span>
                                </div>
                                <div class="checklist-item optional">
                                    <i class="bi bi-circle checklist-icon"></i>
                                    <span class="checklist-label">Rappresentanza Legale (Tutore/Curatore/Amm. Sostegno)</span>
                                </div>
                                <div class="checklist-item optional">
                                    <i class="bi bi-circle checklist-icon"></i>
                                    <span class="checklist-label">Associazioni di Categoria</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- II. Documentazione Sanitaria -->
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse2">
                                <i class="bi bi-file-medical me-2"></i> II. Documentazione Sanitaria
                            </button>
                        </h2>
                        <div id="collapse2" class="accordion-collapse collapse" data-bs-parent="#checklistAccordion">
                            <div class="accordion-body">
                                <div class="checklist-item optional">
                                    <i class="bi bi-circle checklist-icon"></i>
                                    <span class="checklist-label">Domanda Iniziale SABES</span>
                                </div>
                                <div class="checklist-item optional">
                                    <i class="bi bi-circle checklist-icon"></i>
                                    <span class="checklist-label">Dati della Domanda (Data, Provenienza, Delega Patronato)</span>
                                </div>
                                <div class="checklist-item ${this.verbali.length > 0 ? 'complete' : 'missing'}">
                                    <i class="bi bi-${this.verbali.length > 0 ? 'check-circle-fill' : 'x-circle-fill'} checklist-icon"></i>
                                    <span class="checklist-label">Verbali di Accertamento</span>
                                </div>
                                <div class="checklist-item ${this.verbali.length > 0 ? 'complete' : 'missing'}">
                                    <i class="bi bi-${this.verbali.length > 0 ? 'check-circle-fill' : 'x-circle-fill'} checklist-icon"></i>
                                    <span class="checklist-label">Dettaglio Verbale Sanitario (%, Invalidità, Cecità, Sordità)</span>
                                </div>
                                <div class="checklist-item optional">
                                    <i class="bi bi-circle checklist-icon"></i>
                                    <span class="checklist-label">Dati di Revisione</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- III. Prestazioni e Dati Economici -->
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse3">
                                <i class="bi bi-coin me-2"></i> III. Prestazioni e Dati Economici
                            </button>
                        </h2>
                        <div id="collapse3" class="accordion-collapse collapse" data-bs-parent="#checklistAccordion">
                            <div class="accordion-body">
                                <div class="checklist-item ${this.prestazioni.length > 0 ? 'complete' : 'missing'}">
                                    <i class="bi bi-${this.prestazioni.length > 0 ? 'check-circle-fill' : 'x-circle-fill'} checklist-icon"></i>
                                    <span class="checklist-label">Elenco Prestazioni (con Stato e Decorrenza)</span>
                                </div>
                                <div class="checklist-item missing">
                                    <i class="bi bi-x-circle-fill checklist-icon"></i>
                                    <span class="checklist-label">Modalità di Pagamento (IBAN, Delegato)</span>
                                </div>
                                <div class="checklist-item optional">
                                    <i class="bi bi-circle checklist-icon"></i>
                                    <span class="checklist-label">Riepilogo Liquidazioni (Tabella Pivot Mesi/Prestazioni)</span>
                                </div>
                                <div class="checklist-item optional">
                                    <i class="bi bi-circle checklist-icon"></i>
                                    <span class="checklist-label">Redditi Dichiarati (Assistito e Coniuge)</span>
                                </div>
                                <div class="checklist-item optional">
                                    <i class="bi bi-circle checklist-icon"></i>
                                    <span class="checklist-label">Recuperi/Riaccrediti</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- IV. Dati di Controllo e Workflow -->
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse4">
                                <i class="bi bi-exclamation-triangle me-2"></i> IV. Dati di Controllo e Workflow
                            </button>
                        </h2>
                        <div id="collapse4" class="accordion-collapse collapse" data-bs-parent="#checklistAccordion">
                            <div class="accordion-body">
                                <div class="checklist-item ${this.evidenze.length > 0 ? 'complete' : 'optional'}">
                                    <i class="bi bi-${this.evidenze.length > 0 ? 'check-circle-fill' : 'circle'} checklist-icon"></i>
                                    <span class="checklist-label">Evidenze Aperte (Alert/Promemoria)</span>
                                </div>
                                <div class="checklist-item optional">
                                    <i class="bi bi-circle checklist-icon"></i>
                                    <span class="checklist-label">Storico Evidenze Chiuse/Evase</span>
                                </div>
                                <div class="checklist-item ${this.note.length > 0 ? 'complete' : 'optional'}">
                                    <i class="bi bi-${this.note.length > 0 ? 'check-circle-fill' : 'circle'} checklist-icon"></i>
                                    <span class="checklist-label">Note Operative Categorizzate</span>
                                </div>
                                <div class="checklist-item optional">
                                    <i class="bi bi-circle checklist-icon"></i>
                                    <span class="checklist-label">Log di Sistema (Cronologia Operazioni)</span>
                                </div>
                                <div class="checklist-item optional">
                                    <i class="bi bi-circle checklist-icon"></i>
                                    <span class="checklist-label">Decreti Storici (AS/400)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- V. Documentazione e Protocolli -->
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse5">
                                <i class="bi bi-folder2-open me-2"></i> V. Documentazione e Protocolli
                            </button>
                        </h2>
                        <div id="collapse5" class="accordion-collapse collapse" data-bs-parent="#checklistAccordion">
                            <div class="accordion-body">
                                <div class="checklist-item ${this.comunicazioni.length > 0 ? 'complete' : 'optional'}">
                                    <i class="bi bi-${this.comunicazioni.length > 0 ? 'check-circle-fill' : 'circle'} checklist-icon"></i>
                                    <span class="checklist-label">Protocolli in Entrata/Uscita</span>
                                </div>
                                <div class="checklist-item optional">
                                    <i class="bi bi-circle checklist-icon"></i>
                                    <span class="checklist-label">Dettagli Documentali (N° Protocollo, Data, Tipo, Oggetto)</span>
                                </div>
                                <div class="checklist-item optional">
                                    <i class="bi bi-circle checklist-icon"></i>
                                    <span class="checklist-label">Fascicolo di Protocollo EPROCS</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Evidenze Recenti (manteniamo questa sezione)
        const evidenzeContainer = document.getElementById('evidenzeRecenti');
        if (evidenzeContainer) {
            const evidenzeRecenti = this.evidenze.slice(0, 5);
            
            if (evidenzeRecenti.length === 0) {
                evidenzeContainer.innerHTML = `
                    <div class="text-center py-3 text-muted">
                        <i class="bi bi-check-circle display-4"></i>
                        <p class="mt-2">Nessuna evidenza presente</p>
                    </div>
                `;
            } else {
                evidenzeContainer.innerHTML = evidenzeRecenti.map(e => `
                    <div class="card evidenza-card border-${Utils.getEvidenzaStato(e.dataScadenza) === 'Scaduta' ? 'danger' : 'warning'} mb-2">
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 class="mb-1">${e.tipo ? Utils.escapeHtml(e.tipo) : 'N/D'}</h6>
                                    <p class="mb-1 small">${e.descrizione ? Utils.escapeHtml(e.descrizione) : ''}</p>
                                </div>
                                <span class="badge bg-${Utils.getEvidenzaStato(e.dataScadenza) === 'Scaduta' ? 'danger' : 'warning'}">
                                    ${e.dataScadenza ? Utils.formatDate(e.dataScadenza) : 'N/D'}
                                </span>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        }

        // Note Recenti
        const noteContainer = document.getElementById('noteRecenti');
        if (noteContainer) {
            const noteRecenti = this.note.slice(0, 3);
            
            let noteHTML = '';
            
            if (noteRecenti.length === 0) {
                noteHTML = `
                    <div class="text-center py-3 text-muted">
                        <i class="bi bi-journal-text display-4"></i>
                        <p class="mt-2">Nessuna nota presente</p>
                    </div>
                `;
            } else {
                noteHTML = noteRecenti.map(n => {
                    const categoriaStyle = Utils.getNotaCategoriaClass(n.categoria);
                    return `
                        <div class="card mb-2">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <span class="badge" ${categoriaStyle} style="font-size: 0.85rem; padding: 0.4rem 0.6rem;">${Utils.escapeHtml(n.categoria)}</span>
                                    <small class="text-muted">${Utils.formatDate(n.dataCreazione)}</small>
                                </div>
                                <h6 class="mb-1">${Utils.escapeHtml(n.titolo)}</h6>
                                <p class="mb-1 small text-muted">${Utils.escapeHtml(n.testo.substring(0, 100))}${n.testo.length > 100 ? '...' : ''}</p>
                                <small class="text-muted"><i class="bi bi-person"></i> ${Utils.escapeHtml(n.operatore)}</small>
                            </div>
                        </div>
                    `;
                }).join('');
            }
            
            noteContainer.innerHTML = `
                ${noteHTML}
                <button class="btn btn-success btn-sm w-100 mt-2" onclick="DettaglioApp.mostraFormNota()">
                    <i class="bi bi-plus-circle"></i> Aggiungi Nota
                </button>
            `;
        }

        // Documenti Fascicolo
        const documentiContainer = document.getElementById('documentiFascicolo');
        if (documentiContainer) {
            // Documenti mockup organizzati per categoria
            const documenti = [
                {
                    categoria: 'Dati Anagrafici',
                    items: [
                        { nome: 'Carta Identità', dataRicezione: '2023-01-15', protocollo: 'EPROCS-2023-001', link: '#' },
                        { nome: 'Codice Fiscale', dataRicezione: '2023-01-15', protocollo: 'EPROCS-2023-001', link: '#' }
                    ]
                },
                {
                    categoria: 'Documentazione Sanitaria',
                    items: [
                        { nome: 'Verbale Accertamento 74%', dataRicezione: '2023-03-10', protocollo: 'EPROCS-2023-045', link: '#' },
                        { nome: 'Certificato Medico', dataRicezione: '2023-03-08', protocollo: 'EPROCS-2023-042', link: '#' }
                    ]
                },
                {
                    categoria: 'Prestazioni e Dati Economici',
                    items: [
                        { nome: 'IBAN Bancario', dataRicezione: '2023-01-20', protocollo: 'EPROCS-2023-005', link: '#' },
                        { nome: 'RED 2024', dataRicezione: '2024-02-01', protocollo: 'EPROCS-2024-012', link: '#' },
                        { nome: 'Dichiarazione di Responsabilità (o Modulo Redditi)', dataRicezione: '2024-03-01', protocollo: 'EPROCS-2024-030', link: '#' }
                    ]
                },
                {
                    categoria: 'Documentazione e Protocolli',
                    items: [
                        { nome: 'Domanda Prestazione', dataRicezione: '2023-03-05', protocollo: 'EPROCS-2023-038', link: '#' }
                    ]
                }
            ];

            documentiContainer.innerHTML = `
                <div class="accordion" id="accordionDocumenti">
                    ${documenti.map((cat, idx) => `
                        <div class="accordion-item">
                            <h2 class="accordion-header">
                                <button class="accordion-button ${idx > 0 ? 'collapsed' : ''}" type="button" 
                                        data-bs-toggle="collapse" data-bs-target="#collapseDoc${idx}">
                                    ${Utils.escapeHtml(cat.categoria)} <span class="badge bg-primary ms-2">${cat.items.length}</span>
                                </button>
                            </h2>
                            <div id="collapseDoc${idx}" class="accordion-collapse collapse ${idx === 0 ? 'show' : ''}" 
                                 data-bs-parent="#accordionDocumenti">
                                <div class="accordion-body p-2">
                                    ${cat.items.map(doc => `
                                        <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                                            <div>
                                                <strong class="d-block">${Utils.escapeHtml(doc.nome)}</strong>
                                                <small class="text-muted">
                                                    <i class="bi bi-calendar3"></i> ${Utils.formatDate(doc.dataRicezione)} | 
                                                    <i class="bi bi-file-text"></i> ${doc.protocollo}
                                                </small>
                                            </div>
                                            <a href="${doc.link}" class="btn btn-sm btn-outline-primary" title="Apri documento">
                                                <i class="bi bi-download"></i>
                                            </a>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        this.tabsLoaded.riepilogo = true;
    },

    /**
     * Mostra form per aggiungere una nuova nota
     */
    mostraFormNota() {
        const noteContainer = document.getElementById('noteRecenti');
        if (!noteContainer) return;

        const formHTML = `
            <div class="card border-success mb-3" id="formNuovaNota">
                <div class="card-header bg-success text-white">
                    <strong><i class="bi bi-plus-circle"></i> Nuova Nota</strong>
                </div>
                <div class="card-body">
                    <div class="mb-2">
                        <label class="form-label"><strong>Categoria</strong></label>
                        <select class="form-select form-select-sm" id="notaCategoria">
                            <option value="Residenza">Residenza</option>
                            <option value="Pagamenti">Pagamenti</option>
                            <option value="Degenze">Degenze</option>
                            <option value="Amministrazione Sostegno">Amministrazione Sostegno</option>
                            <option value="Redditi">Redditi</option>
                            <option value="Varie">Varie</option>
                        </select>
                    </div>
                    <div class="mb-2">
                        <label class="form-label"><strong>Titolo</strong></label>
                        <input type="text" class="form-control form-control-sm" id="notaTitolo" placeholder="Titolo breve...">
                    </div>
                    <div class="mb-3">
                        <label class="form-label"><strong>Testo</strong></label>
                        <textarea class="form-control form-control-sm" id="notaTesto" rows="3" placeholder="Descrizione dettagliata..."></textarea>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-success btn-sm" onclick="DettaglioApp.salvaNotaRapida()">
                            <i class="bi bi-save"></i> Salva
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="DettaglioApp.loadTabRiepilogo()">
                            <i class="bi bi-x-circle"></i> Annulla
                        </button>
                    </div>
                </div>
            </div>
        `;

        noteContainer.innerHTML = formHTML;
        document.getElementById('notaCategoria').focus();
    },

    /**
     * Salva una nuova nota veloce
     */
    salvaNotaRapida() {
        const categoria = document.getElementById('notaCategoria').value;
        const titolo = document.getElementById('notaTitolo').value;
        const testo = document.getElementById('notaTesto').value;

        if (!titolo || !testo) {
            alert('Titolo e testo sono obbligatori');
            return;
        }

        // Crea nuova nota
        const nuovaNota = {
            id: 'N' + (this.note.length + 1),
            categoria: categoria,
            titolo: titolo,
            testo: testo,
            dataCreazione: new Date().toISOString(),
            operatore: 'Dott. Bianchi',
            principale: false
        };

        // Aggiungi all'inizio dell'array
        this.note.unshift(nuovaNota);

        // Simula salvataggio (in produzione: chiamata API)
        console.log('Nota salvata:', nuovaNota);

        // Ricarica la sezione
        this.loadTabRiepilogo();

        // Mostra messaggio di conferma
        setTimeout(() => {
            const noteContainer = document.getElementById('noteRecenti');
            if (noteContainer) {
                const alert = document.createElement('div');
                alert.className = 'alert alert-success alert-dismissible fade show';
                alert.innerHTML = `
                    <i class="bi bi-check-circle"></i> Nota aggiunta con successo
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                `;
                noteContainer.insertAdjacentElement('afterbegin', alert);

                setTimeout(() => {
                    alert.remove();
                }, 3000);
            }
        }, 100);
    },

    /**
     * Renderizza riepilogo prestazioni nel tab Riepilogo
     */
    renderRiepilogoPrestazioni() {
        const container = document.getElementById('riepilogoPrestazioniContent');
        if (!container) return;

        // Conta prestazioni per tipo
        let invaliditaCivileCount = { concessa: 0, negata: 0, assente: 0 };
        let sorditaCount = { concessa: 0, negata: 0, assente: 0 };
        let cecitaCount = { concessa: 0, negata: 0, assente: 0 };

        if (this.prestazioniInvalidita) {
            // Invalidità Civile
            if (this.prestazioniInvalidita.invaliditaCivile) {
                Object.values(this.prestazioniInvalidita.invaliditaCivile).forEach(p => {
                    if (p.stato === 'concessa') invaliditaCivileCount.concessa++;
                    else if (p.stato === 'negata') invaliditaCivileCount.negata++;
                    else invaliditaCivileCount.assente++;
                });
            }

            // Sordità
            if (this.prestazioniInvalidita.sordita) {
                Object.values(this.prestazioniInvalidita.sordita).forEach(p => {
                    if (p.stato === 'concessa') sorditaCount.concessa++;
                    else if (p.stato === 'negata') sorditaCount.negata++;
                    else sorditaCount.assente++;
                });
            }

            // Cecità
            if (this.prestazioniInvalidita.cecita) {
                Object.values(this.prestazioniInvalidita.cecita).forEach(p => {
                    if (p.stato === 'concessa') cecitaCount.concessa++;
                    else if (p.stato === 'negata') cecitaCount.negata++;
                    else cecitaCount.assente++;
                });
            }
        }

        container.innerHTML = `
            <div class="row g-3">
                <!-- Invalidità Civile -->
                <div class="col-md-4">
                    <div class="card h-100 border-primary" style="border-width: 2px;">
                        <div class="card-body">
                            <h6 class="card-title">
                                <i class="bi bi-person-wheelchair text-primary"></i> Invalidità Civile (Cod. 77)
                            </h6>
                            <div class="d-flex flex-wrap gap-2 mt-3">
                                ${invaliditaCivileCount.concessa > 0 ? `
                                    <span class="badge bg-success" style="font-size: 0.9rem; padding: 0.5rem 0.75rem;">
                                        <i class="bi bi-check-circle"></i> ${invaliditaCivileCount.concessa} Concessa/e
                                    </span>
                                ` : ''}
                                ${invaliditaCivileCount.negata > 0 ? `
                                    <span class="badge bg-danger" style="font-size: 0.9rem; padding: 0.5rem 0.75rem;">
                                        <i class="bi bi-x-circle"></i> ${invaliditaCivileCount.negata} Negata/e
                                    </span>
                                ` : ''}
                                ${invaliditaCivileCount.assente > 0 ? `
                                    <span class="badge bg-secondary" style="font-size: 0.9rem; padding: 0.5rem 0.75rem;">
                                        <i class="bi bi-dash-circle"></i> ${invaliditaCivileCount.assente} Assente/i
                                    </span>
                                ` : ''}
                                ${invaliditaCivileCount.concessa === 0 && invaliditaCivileCount.negata === 0 && invaliditaCivileCount.assente === 0 ? `
                                    <span class="badge bg-secondary" style="font-size: 0.9rem; padding: 0.5rem 0.75rem;">
                                        Nessun dato disponibile
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Sordità -->
                <div class="col-md-4">
                    <div class="card h-100 border-warning" style="border-width: 2px;">
                        <div class="card-body">
                            <h6 class="card-title">
                                <i class="bi bi-ear text-warning"></i> Sordità (Cod. 88)
                            </h6>
                            <div class="d-flex flex-wrap gap-2 mt-3">
                                ${sorditaCount.concessa > 0 ? `
                                    <span class="badge bg-success" style="font-size: 0.9rem; padding: 0.5rem 0.75rem;">
                                        <i class="bi bi-check-circle"></i> ${sorditaCount.concessa} Concessa/e
                                    </span>
                                ` : ''}
                                ${sorditaCount.negata > 0 ? `
                                    <span class="badge bg-danger" style="font-size: 0.9rem; padding: 0.5rem 0.75rem;">
                                        <i class="bi bi-x-circle"></i> ${sorditaCount.negata} Negata/e
                                    </span>
                                ` : ''}
                                ${sorditaCount.assente > 0 ? `
                                    <span class="badge bg-secondary" style="font-size: 0.9rem; padding: 0.5rem 0.75rem;">
                                        <i class="bi bi-dash-circle"></i> ${sorditaCount.assente} Assente/i
                                    </span>
                                ` : ''}
                                ${sorditaCount.concessa === 0 && sorditaCount.negata === 0 && sorditaCount.assente === 0 ? `
                                    <span class="badge bg-secondary" style="font-size: 0.9rem; padding: 0.5rem 0.75rem;">
                                        Nessun dato disponibile
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Cecità -->
                <div class="col-md-4">
                    <div class="card h-100 border-info" style="border-width: 2px;">
                        <div class="card-body">
                            <h6 class="card-title">
                                <i class="bi bi-eye-slash text-info"></i> Cecità (Cod. 99)
                            </h6>
                            <div class="d-flex flex-wrap gap-2 mt-3">
                                ${cecitaCount.concessa > 0 ? `
                                    <span class="badge bg-success" style="font-size: 0.9rem; padding: 0.5rem 0.75rem;">
                                        <i class="bi bi-check-circle"></i> ${cecitaCount.concessa} Concessa/e
                                    </span>
                                ` : ''}
                                ${cecitaCount.negata > 0 ? `
                                    <span class="badge bg-danger" style="font-size: 0.9rem; padding: 0.5rem 0.75rem;">
                                        <i class="bi bi-x-circle"></i> ${cecitaCount.negata} Negata/e
                                    </span>
                                ` : ''}
                                ${cecitaCount.assente > 0 ? `
                                    <span class="badge bg-secondary" style="font-size: 0.9rem; padding: 0.5rem 0.75rem;">
                                        <i class="bi bi-dash-circle"></i> ${cecitaCount.assente} Assente/i
                                    </span>
                                ` : ''}
                                ${cecitaCount.concessa === 0 && cecitaCount.negata === 0 && cecitaCount.assente === 0 ? `
                                    <span class="badge bg-secondary" style="font-size: 0.9rem; padding: 0.5rem 0.75rem;">
                                        Nessun dato disponibile
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * TAB INVALIDITÀ CIVILE
     */
    loadTabInvaliditaCivile() {
        this.renderPrestazioniInvaliditaCivile();
        
        // Setup toggle tabella/card
        const btnTabella = document.getElementById('btnInvaliditaCivileTabella');
        const btnCard = document.getElementById('btnInvaliditaCivileCard');
        
        if (btnTabella && btnCard) {
            btnTabella.addEventListener('click', () => {
                this.invaliditaCivileViewMode = 'table';
                btnTabella.classList.add('active');
                btnCard.classList.remove('active');
                this.renderPrestazioniInvaliditaCivile();
            });
            
            btnCard.addEventListener('click', () => {
                this.invaliditaCivileViewMode = 'card';
                btnCard.classList.add('active');
                btnTabella.classList.remove('active');
                this.renderPrestazioniInvaliditaCivile();
            });
        }
    },

    /**
     * TAB SORDITÀ
     */
    loadTabSordita() {
        this.renderPrestazioniSordita();
        
        // Setup toggle tabella/card
        const btnTabella = document.getElementById('btnSorditaTabella');
        const btnCard = document.getElementById('btnSorditaCard');
        
        if (btnTabella && btnCard) {
            btnTabella.addEventListener('click', () => {
                this.sorditaViewMode = 'table';
                btnTabella.classList.add('active');
                btnCard.classList.remove('active');
                this.renderPrestazioniSordita();
            });
            
            btnCard.addEventListener('click', () => {
                this.sorditaViewMode = 'card';
                btnCard.classList.add('active');
                btnTabella.classList.remove('active');
                this.renderPrestazioniSordita();
            });
        }
    },

    /**
     * TAB CECITÀ
     */
    loadTabCecita() {
        this.renderPrestazioniCecita();
        
        // Setup toggle tabella/card
        const btnTabella = document.getElementById('btnCecitaTabella');
        const btnCard = document.getElementById('btnCecitaCard');
        
        if (btnTabella && btnCard) {
            btnTabella.addEventListener('click', () => {
                this.cecitaViewMode = 'table';
                btnTabella.classList.add('active');
                btnCard.classList.remove('active');
                this.renderPrestazioniCecita();
            });
            
            btnCard.addEventListener('click', () => {
                this.cecitaViewMode = 'card';
                btnCard.classList.add('active');
                btnTabella.classList.remove('active');
                this.renderPrestazioniCecita();
            });
        }
    },

    /**
     * Render prestazioni Invalidità Civile
     */
    renderPrestazioniInvaliditaCivile() {
        const container = document.getElementById('prestazioniInvaliditaCivileContent');
        if (!container) return;

        // Template prestazioni Invalidità Civile (sempre visualizzate)
        const prestazioniTemplate = {
            pensioneInvalidoAssoluto: {
                nome: "Pensione invalido civile assoluto (100%)",
                stato: "assente",
                importoMensile: null,
                dataDecorrenza: null,
                note: "Dati non disponibili nel fascicolo"
            },
            invalidoParziale: {
                nome: "Invalido civile parziale (74%-99%)",
                stato: "assente",
                importoMensile: null,
                dataDecorrenza: null,
                note: "Dati non disponibili nel fascicolo"
            },
            indennitaAccompagnamento: {
                nome: "Indennità di accompagnamento",
                stato: "assente",
                importoMensile: null,
                dataDecorrenza: null,
                note: "Dati non disponibili nel fascicolo"
            },
            assegnoMinorenni: {
                nome: "Assegno mensile per invalidi civili parziali minorenni",
                stato: "assente",
                importoMensile: null,
                dataDecorrenza: null,
                note: "Dati non disponibili nel fascicolo"
            },
            incrementoPensione: {
                nome: "Incremento alla pensione",
                stato: "assente",
                importoMensile: null,
                dataDecorrenza: null,
                note: "Dati non disponibili nel fascicolo"
            }
        };

        // Se esistono dati, sostituisci il template con i dati reali
        let prestazioni = prestazioniTemplate;
        if (this.prestazioniInvalidita && this.prestazioniInvalidita.invaliditaCivile) {
            prestazioni = this.prestazioniInvalidita.invaliditaCivile;
        }

        const viewMode = this.invaliditaCivileViewMode || 'table';
        
        if (viewMode === 'card') {
            container.innerHTML = this.renderPrestazioniAsCards(prestazioni);
        } else {
            container.innerHTML = this.renderPrestazioniAsTable(prestazioni);
        }
    },

    /**
     * Render prestazioni Sordità
     */
    renderPrestazioniSordita() {
        const container = document.getElementById('prestazioniSorditaContent');
        if (!container) return;

        // Template prestazioni Sordità (sempre visualizzate)
        const prestazioniTemplate = {
            indennitaComunicazione: {
                nome: "Indennità di comunicazione per i sordi",
                stato: "assente",
                importoMensile: null,
                dataDecorrenza: null,
                note: "Dati non disponibili nel fascicolo"
            }
        };

        // Se esistono dati, sostituisci il template con i dati reali
        let prestazioni = prestazioniTemplate;
        if (this.prestazioniInvalidita && this.prestazioniInvalidita.sordita) {
            prestazioni = this.prestazioniInvalidita.sordita;
        }

        const viewMode = this.sorditaViewMode || 'table';
        
        if (viewMode === 'card') {
            container.innerHTML = this.renderPrestazioniAsCards(prestazioni);
        } else {
            container.innerHTML = this.renderPrestazioniAsTable(prestazioni);
        }
    },

    /**
     * Render prestazioni Cecità
     */
    renderPrestazioniCecita() {
        const container = document.getElementById('prestazioniCecitaContent');
        if (!container) return;

        // Template prestazioni Cecità (sempre visualizzate)
        const prestazioniTemplate = {
            pensioneCecita: {
                nome: "Pensione di cecità civile",
                stato: "assente",
                importoMensile: null,
                dataDecorrenza: null,
                note: "Dati non disponibili nel fascicolo"
            },
            assegnoIntegrativo: {
                nome: "Assegno integrativo",
                stato: "assente",
                importoMensile: null,
                dataDecorrenza: null,
                note: "Dati non disponibili nel fascicolo"
            },
            indennitaAccompagnamentoCiechi: {
                nome: "Indennità di accompagnamento per ciechi assoluti",
                stato: "assente",
                importoMensile: null,
                dataDecorrenza: null,
                note: "Dati non disponibili nel fascicolo"
            },
            indennitaSpecialeCiechi: {
                nome: "Indennità speciale per ciechi con residuo visivo",
                stato: "assente",
                importoMensile: null,
                dataDecorrenza: null,
                note: "Dati non disponibili nel fascicolo"
            }
        };

        // Se esistono dati, sostituisci il template con i dati reali
        let prestazioni = prestazioniTemplate;
        if (this.prestazioniInvalidita && this.prestazioniInvalidita.cecita) {
            prestazioni = this.prestazioniInvalidita.cecita;
        }

        const viewMode = this.cecitaViewMode || 'table';
        
        if (viewMode === 'card') {
            container.innerHTML = this.renderPrestazioniAsCards(prestazioni);
        } else {
            container.innerHTML = this.renderPrestazioniAsTable(prestazioni);
        }
    },

    /**
     * Render prestazioni come CARDS
     */
    renderPrestazioniAsCards(prestazioni) {
        return Object.values(prestazioni).map(p => {
            let icona = '';
            let borderClass = '';
            let bgClass = '';
            
            if (p.stato === 'concessa') {
                icona = '<i class="bi bi-check-circle-fill text-white" style="font-size: 2rem;"></i>';
                borderClass = 'border-success';
                bgClass = 'bg-success text-white';
            } else if (p.stato === 'negata') {
                icona = '<i class="bi bi-x-circle-fill text-white" style="font-size: 2rem;"></i>';
                borderClass = 'border-danger';
                bgClass = 'bg-danger text-white';
            } else {
                // assente
                icona = '';
                borderClass = 'border-light';
                bgClass = 'bg-light text-muted';
            }

            return `
                <div class="card mb-3 ${borderClass}" style="border-width: 2px;">
                    <div class="card-body">
                        <div class="d-flex align-items-start">
                            <div class="me-3" style="min-width: 50px; text-align: center;">
                                <div class="rounded-circle ${bgClass} d-inline-flex align-items-center justify-content-center" 
                                     style="width: 50px; height: 50px;">
                                    ${icona}
                                </div>
                            </div>
                            <div class="flex-grow-1">
                                <h6 class="mb-2">${Utils.escapeHtml(p.nome)}</h6>
                                ${p.stato === 'concessa' ? `
                                    <p class="mb-1"><strong>Importo mensile:</strong> <span class="text-success">${Utils.formatCurrency(p.importoMensile)}</span></p>
                                    <p class="mb-1"><strong>Decorrenza:</strong> ${Utils.formatDate(p.dataDecorrenza)}</p>
                                ` : ''}
                                <p class="mb-0 small ${p.stato === 'assente' ? 'text-muted' : ''}"><i class="bi bi-info-circle"></i> ${Utils.escapeHtml(p.note)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Render prestazioni come TABELLA
     */
    renderPrestazioniAsTable(prestazioni) {
        return `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead class="table-light">
                        <tr>
                            <th style="width: 50px;">Stato</th>
                            <th>Prestazione</th>
                            <th>Importo Mensile</th>
                            <th>Decorrenza</th>
                            <th>Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.values(prestazioni).map(p => {
                            let iconaStato = '';
                            let rowClass = '';
                            
                            if (p.stato === 'concessa') {
                                iconaStato = '<div class="rounded-circle bg-success d-inline-flex align-items-center justify-content-center" style="width: 30px; height: 30px;"><i class="bi bi-check text-white"></i></div>';
                                rowClass = 'table-success';
                            } else if (p.stato === 'negata') {
                                iconaStato = '<div class="rounded-circle bg-danger d-inline-flex align-items-center justify-content-center" style="width: 30px; height: 30px;"><i class="bi bi-x text-white"></i></div>';
                                rowClass = 'table-danger';
                            } else {
                                iconaStato = '-';
                                rowClass = 'text-muted';
                            }

                            return `
                                <tr class="${rowClass}">
                                    <td class="text-center">${iconaStato}</td>
                                    <td><strong>${Utils.escapeHtml(p.nome)}</strong></td>
                                    <td>${p.importoMensile ? Utils.formatCurrency(p.importoMensile) : '-'}</td>
                                    <td>${p.dataDecorrenza ? Utils.formatDate(p.dataDecorrenza) : '-'}</td>
                                    <td><small>${Utils.escapeHtml(p.note)}</small></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
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
            const categoriaStyle = Utils.getNotaCategoriaClass(n.categoria);
            return `
                <div class="card nota-card ${n.principale ? 'nota-principale' : ''} mb-3">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <div>
                            <span class="badge" ${categoriaStyle} style="font-size: 0.85rem; padding: 0.4rem 0.6rem;">${Utils.escapeHtml(n.categoria)}</span>
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
    },

    /**
     * Setup listeners per modifica dati anagrafici
     */
    setupEditListeners() {
        const btnModifica = document.getElementById('btnModificaAnagrafica');
        const btnSalva = document.getElementById('btnSalvaAnagrafica');
        const btnAnnulla = document.getElementById('btnAnnullaModifica');
        const linguaSelect = document.getElementById('linguaPreferita');
        const ibanInput = document.getElementById('ibanAssistito');

        if (!btnModifica || !btnSalva || !btnAnnulla) return;

        // Salva valori originali
        let valoriOriginali = {
            lingua: linguaSelect ? linguaSelect.value : null,
            iban: ibanInput ? ibanInput.value : null
        };

        // Disabilita inizialmente i campi editabili
        if (linguaSelect) linguaSelect.disabled = true;
        if (ibanInput) ibanInput.disabled = true;

        // Click su Modifica
        btnModifica.addEventListener('click', () => {
            // Abilita campi editabili
            if (linguaSelect) linguaSelect.disabled = false;
            if (ibanInput) ibanInput.disabled = false;

            // Salva valori originali
            valoriOriginali = {
                lingua: linguaSelect ? linguaSelect.value : null,
                iban: ibanInput ? ibanInput.value : null
            };

            // Mostra pulsanti Salva e Annulla, nascondi Modifica
            btnModifica.classList.add('d-none');
            btnSalva.classList.remove('d-none');
            btnAnnulla.classList.remove('d-none');

            // Focus sul primo campo editabile
            if (linguaSelect) linguaSelect.focus();
        });

        // Click su Annulla
        btnAnnulla.addEventListener('click', () => {
            // Ripristina valori originali
            if (linguaSelect && valoriOriginali.lingua !== null) {
                linguaSelect.value = valoriOriginali.lingua;
            }
            if (ibanInput && valoriOriginali.iban !== null) {
                ibanInput.value = valoriOriginali.iban;
            }

            // Disabilita campi
            if (linguaSelect) linguaSelect.disabled = true;
            if (ibanInput) ibanInput.disabled = true;

            // Ripristina pulsanti
            btnModifica.classList.remove('d-none');
            btnSalva.classList.add('d-none');
            btnAnnulla.classList.add('d-none');
        });

        // Click su Salva
        btnSalva.addEventListener('click', () => {
            // Valida IBAN
            if (ibanInput && ibanInput.value) {
                const ibanValue = ibanInput.value.replace(/\s/g, '').toUpperCase();
                const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;
                
                if (!ibanRegex.test(ibanValue)) {
                    alert('IBAN non valido. Formato atteso: IT00 0000 0000 0000 0000 0000 000');
                    ibanInput.focus();
                    return;
                }
                
                // Formatta IBAN con spazi
                ibanInput.value = ibanValue.match(/.{1,4}/g).join(' ');
            }

            // Aggiorna dati assistito
            if (linguaSelect) {
                this.assistito.linguaPreferita = linguaSelect.value;
            }
            if (ibanInput) {
                this.assistito.iban = ibanInput.value;
            }

            // Simula salvataggio (in produzione: chiamata API)
            console.log('Dati aggiornati:', {
                cf: this.assistito.cf,
                linguaPreferita: this.assistito.linguaPreferita,
                iban: this.assistito.iban
            });

            // Disabilita campi
            if (linguaSelect) linguaSelect.disabled = true;
            if (ibanInput) ibanInput.disabled = true;

            // Ripristina pulsanti
            btnModifica.classList.remove('d-none');
            btnSalva.classList.add('d-none');
            btnAnnulla.classList.add('d-none');

            // Mostra messaggio di conferma
            const alert = document.createElement('div');
            alert.className = 'alert alert-success alert-dismissible fade show mt-3';
            alert.innerHTML = `
                <i class="bi bi-check-circle"></i> Modifiche salvate con successo
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            btnSalva.parentElement.insertAdjacentElement('afterend', alert);

            // Rimuovi messaggio dopo 3 secondi
            setTimeout(() => {
                alert.remove();
            }, 3000);
        });
    }
};

// Inizializza app quando DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    DettaglioApp.init();
});

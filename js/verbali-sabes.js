/* ========================================
   ASSE InCiSo - Verbali SABES.js
   Gestione verbali SABES/ASDAA
   ======================================== */

const VerbaliSabesManager = {
    verbali: [],
    
    /**
     * Inizializza e carica verbali
     */
    async init() {
        try {
            this.verbali = await Utils.loadJSON('data/verbali_sabes.json');
            this.renderVerbali();
            return true;
        } catch (error) {
            console.error('Errore caricamento verbali SABES:', error);
            this.showError();
            return false;
        }
    },
    
    /**
     * Renderizza verbali nella tabella
     */
    renderVerbali() {
        const tbody = document.getElementById('verbaliTableBody');
        if (!tbody) return;
        
        // Ferma lo spinner
        const spinner = document.getElementById('verbaliSpinner');
        if (spinner) {
            spinner.style.display = 'none';
        }
        
        if (this.verbali.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center text-muted py-4">
                        <i class="bi bi-inbox display-4"></i>
                        <p class="mt-3">Nessun verbale disponibile</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.verbali.map(verbale => {
            // Formatta invalidità civile
            const invCivile = verbale.invaliditaCivile ? 
                `<div><strong>${verbale.invaliditaCivile.percentuale}%</strong></div>` : 
                '<span class="text-muted">-</span>';
            
            // Formatta cecità
            const cecita = verbale.cecita ? 
                `<div><strong>${verbale.cecita.percentuale}%</strong></div>` : 
                '<span class="text-muted">-</span>';
            
            // Formatta sordità
            const sordita = verbale.sordita ? 
                `<div><strong>${verbale.sordita.percentuale}%</strong></div>` : 
                '<span class="text-muted">-</span>';
            
            // Determina stato prestazione (prende il primo disponibile)
            let statoPrestazione = '-';
            let statoClass = 'secondary';
            
            if (verbale.invaliditaCivile) {
                statoPrestazione = verbale.invaliditaCivile.statoPrestazione;
            } else if (verbale.cecita) {
                statoPrestazione = verbale.cecita.statoPrestazione;
            } else if (verbale.sordita) {
                statoPrestazione = verbale.sordita.statoPrestazione;
            }
            
            // Colore badge stato
            switch(statoPrestazione) {
                case 'Concessa':
                    statoClass = 'success';
                    break;
                case 'Sospesa':
                    statoClass = 'warning';
                    break;
                case 'Revocata':
                    statoClass = 'danger';
                    break;
            }
            
            return `
                <tr style="cursor: pointer;" data-verbale-id="${verbale.id}">
                    <td><code class="user-select-all">${verbale.cf}</code></td>
                    <td><strong>${Utils.escapeHtml(verbale.cognome)}</strong></td>
                    <td>${Utils.escapeHtml(verbale.nome)}</td>
                    <td>${Utils.formatDate(verbale.dataNascita)}</td>
                    <td class="text-center">${invCivile}</td>
                    <td class="text-center">${cecita}</td>
                    <td class="text-center">${sordita}</td>
                <tr/>
            `;
            /*
                    <td class="text-center">
                        <span class="badge bg-${statoClass}" style="font-size: 0.85rem; padding: 0.4rem 0.6rem;">
                            ${statoPrestazione}
                        </span>
                    </td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-success me-1 btn-ricevibile" data-verbale-id="${verbale.id}">
                            <i class="bi bi-check-circle"></i> Ricevibile
                        </button>
                        <button class="btn btn-sm btn-danger btn-irricevibile" data-verbale-id="${verbale.id}">
                            <i class="bi bi-x-circle"></i> Irricevibile
                        </button>
                    </td>
                </tr>
            `;
            */
        }).join('');
        
        // Aggiungi event listeners
        this.attachEventListeners();
        
        // Aggiorna contatore
        const totaleElement = document.getElementById('totaleVerbali');
        if (totaleElement) {
            totaleElement.textContent = this.verbali.length;
        }
    },
    
    /**
     * Aggiungi event listeners ai bottoni
     */
    attachEventListeners() {
        // Bottoni ricevibile
        document.querySelectorAll('.btn-ricevibile').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.getAttribute('data-verbale-id'));
                this.marcaRicevibile(id);
            });
        });
        
        // Bottoni irricevibile
        document.querySelectorAll('.btn-irricevibile').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.getAttribute('data-verbale-id'));
                this.marcaIrricevibile(id);
            });
        });
        
        // Click su riga
        document.querySelectorAll('#verbaliTableBody tr[data-verbale-id]').forEach(row => {
            row.addEventListener('click', () => {
                const id = parseInt(row.getAttribute('data-verbale-id'));
                this.visualizzaDettaglio(id);
            });
        });
    },
    
    /**
     * Marca verbale come ricevibile
     */
    marcaRicevibile(id) {
        const verbale = this.verbali.find(v => v.id === id);
        if (!verbale) return;
        
        Utils.showToast(`Verbale di ${verbale.cognome} ${verbale.nome} marcato come RICEVIBILE`, 'success');
        console.log('Marcato ricevibile:', verbale);
    },
    
    /**
     * Marca verbale come irricevibile
     */
    marcaIrricevibile(id) {
        const verbale = this.verbali.find(v => v.id === id);
        if (!verbale) return;
        
        Utils.showToast(`Verbale di ${verbale.cognome} ${verbale.nome} marcato come IRRICEVIBILE`, 'warning');
        console.log('Marcato irricevibile:', verbale);
    },
    
    /**
     * Visualizza dettaglio verbale
     */
    visualizzaDettaglio(id) {
        const verbale = this.verbali.find(v => v.id === id);
        if (!verbale) return;
        
        console.log('Visualizza dettaglio verbale:', verbale);
        Utils.showToast(`Apertura dettaglio verbale di ${verbale.cognome} ${verbale.nome}`, 'info');
    },
    
    /**
     * Mostra errore caricamento
     */
    showError() {
        const tbody = document.getElementById('verbaliTableBody');
        if (!tbody) return;
        
        // Ferma lo spinner
        const spinner = document.getElementById('verbaliSpinner');
        if (spinner) {
            spinner.style.display = 'none';
        }
        
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-danger py-4">
                    <i class="bi bi-exclamation-triangle display-4"></i>
                    <p class="mt-3">Errore nel caricamento dei verbali</p>
                </td>
            </tr>
        `;
    },
    
    /**
     * Esporta verbali in CSV
     */
    esportaVerbali() {
        if (this.verbali.length === 0) {
            Utils.showToast('Nessun verbale da esportare', 'warning');
            return;
        }
        
        let csv = 'CF;Cognome;Nome;Data Nascita;% Invalidità Civile;Stato Inv. Civile;% Cecità;Stato Cecità;% Sordità;Stato Sordità\n';
        
        this.verbali.forEach(v => {
            const invCivile = v.invaliditaCivile ? v.invaliditaCivile.percentuale : '';
            const statoInvCivile = v.invaliditaCivile ? v.invaliditaCivile.statoPrestazione : '';
            const cecita = v.cecita ? v.cecita.percentuale : '';
            const statoCecita = v.cecita ? v.cecita.statoPrestazione : '';
            const sordita = v.sordita ? v.sordita.percentuale : '';
            const statoSordita = v.sordita ? v.sordita.statoPrestazione : '';
            
            csv += `"${v.cf}";"${v.cognome}";"${v.nome}";"${Utils.formatDate(v.dataNascita)}";"${invCivile}";"${statoInvCivile}";"${cecita}";"${statoCecita}";"${sordita}";"${statoSordita}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `verbali_sabes_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        Utils.showToast('Verbali esportati con successo', 'success');
    }
};

// L'inizializzazione viene gestita dal LayoutManager
// Aggiungi event listeners ai bottoni dopo l'inizializzazione
if (typeof window !== 'undefined') {
    window.VerbaliSabesManager = VerbaliSabesManager;
    
    // Aggiungi listener ai bottoni dopo un breve delay
    setTimeout(() => {
        const btnExport = document.getElementById('exportVerbali');
        if (btnExport) {
            btnExport.addEventListener('click', () => {
                VerbaliSabesManager.esportaVerbali();
            });
        }
        
        const btnAggiorna = document.getElementById('btnAggiornaMVerbali');
        if (btnAggiorna) {
            btnAggiorna.addEventListener('click', () => {
                VerbaliSabesManager.init();
            });
        }
    }, 1000);
}

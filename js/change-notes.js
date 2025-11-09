/**
 * Change Notes Manager
 * Gestisce le note sui cambiamenti richiesti per ogni pagina
 */
const ChangeNotesManager = {
    STORAGE_KEY: 'asse_inciso_change_notes',
    notes: [],

    /**
     * Inizializza il manager
     */
    init() {
        this.loadNotes();
        this.updateCounter();
        this.setupEventListeners();
    },

    /**
     * Carica le note dal localStorage
     */
    loadNotes() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            try {
                this.notes = JSON.parse(stored);
            } catch (e) {
                console.error('Errore caricamento note:', e);
                this.notes = [];
            }
        }
    },

    /**
     * Salva le note nel localStorage
     */
    saveNotes() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.notes));
        this.updateCounter();
    },

    /**
     * Ottiene il nome della pagina corrente
     */
    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop() || 'index.html';
        return page;
    },

    /**
     * Ottiene il titolo della pagina corrente
     */
    getCurrentPageTitle() {
        return document.title || 'Senza titolo';
    },

    /**
     * Aggiunge una nuova nota
     */
    addNote(text) {
        if (!text || text.trim() === '') {
            Utils.showToast('Inserisci del testo per la nota', 'warning');
            return;
        }

        const note = {
            id: Date.now(),
            page: this.getCurrentPage(),
            pageTitle: this.getCurrentPageTitle(),
            text: text.trim(),
            timestamp: new Date().toISOString(),
            url: window.location.href
        };

        this.notes.unshift(note); // Aggiungi all'inizio
        this.saveNotes();
        
        Utils.showToast('Nota salvata con successo', 'success');
        
        // Pulisci textarea
        const input = document.getElementById('changeNoteInput');
        if (input) input.value = '';
    },

    /**
     * Elimina una nota
     */
    deleteNote(id) {
        this.notes = this.notes.filter(n => n.id !== id);
        this.saveNotes();
        this.renderNotesList();
        Utils.showToast('Nota eliminata', 'info');
    },

    /**
     * Elimina tutte le note
     */
    clearAllNotes() {
        if (confirm('Sei sicuro di voler eliminare tutte le note?')) {
            this.notes = [];
            this.saveNotes();
            this.renderNotesList();
            Utils.showToast('Tutte le note sono state eliminate', 'success');
        }
    },

    /**
     * Aggiorna il contatore
     */
    updateCounter() {
        const counter = document.getElementById('changeNotesCount');
        if (counter) {
            counter.textContent = this.notes.length;
        }
    },

    /**
     * Renderizza la lista note nel modal
     */
    renderNotesList() {
        const container = document.getElementById('notesListContainer');
        if (!container) return;

        if (this.notes.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="bi bi-inbox display-4"></i>
                    <p class="mt-3">Nessuna nota registrata</p>
                </div>
            `;
            return;
        }

        // Raggruppa per pagina
        const groupedByPage = {};
        this.notes.forEach(note => {
            if (!groupedByPage[note.page]) {
                groupedByPage[note.page] = [];
            }
            groupedByPage[note.page].push(note);
        });

        let html = '';
        
        Object.keys(groupedByPage).forEach(page => {
            const pageNotes = groupedByPage[page];
            const pageTitle = pageNotes[0].pageTitle;
            
            html += `
                <div class="mb-4">
                    <h6 class="border-bottom pb-2 mb-3">
                        <i class="bi bi-file-earmark-text text-primary"></i> 
                        ${Utils.escapeHtml(pageTitle)}
                        <small class="text-muted">(${page})</small>
                        <span class="badge bg-secondary ms-2">${pageNotes.length}</span>
                    </h6>
            `;
            
            pageNotes.forEach(note => {
                const date = new Date(note.timestamp);
                const formattedDate = date.toLocaleString('it-IT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                html += `
                    <div class="card mb-2 border-start border-primary border-3">
                        <div class="card-body py-2">
                            <div class="d-flex justify-content-between align-items-start">
                                <div class="flex-grow-1">
                                    <p class="mb-1">${Utils.escapeHtml(note.text)}</p>
                                    <small class="text-muted">
                                        <i class="bi bi-clock"></i> ${formattedDate}
                                    </small>
                                </div>
                                <button class="btn btn-sm btn-outline-danger ms-2" 
                                        onclick="ChangeNotesManager.deleteNote(${note.id})"
                                        title="Elimina nota">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        });

        container.innerHTML = html;
    },

    /**
     * Esporta le note in JSON
     */
    exportNotes() {
        if (this.notes.length === 0) {
            Utils.showToast('Nessuna nota da esportare', 'warning');
            return;
        }

        const dataStr = JSON.stringify(this.notes, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `change-notes-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        Utils.showToast('Note esportate con successo', 'success');
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Salva nota
        const btnSave = document.getElementById('btnSaveChangeNote');
        if (btnSave) {
            btnSave.addEventListener('click', () => {
                const input = document.getElementById('changeNoteInput');
                if (input) {
                    this.addNote(input.value);
                }
            });
        }

        // Visualizza note
        const btnView = document.getElementById('btnViewChangeNotes');
        if (btnView) {
            btnView.addEventListener('click', () => {
                this.renderNotesList();
                const modal = new bootstrap.Modal(document.getElementById('modalViewNotes'));
                modal.show();
            });
        }

        // Esporta note
        const btnExport = document.getElementById('btnExportChangeNotes');
        if (btnExport) {
            btnExport.addEventListener('click', () => {
                this.exportNotes();
            });
        }

        // Elimina tutte
        const btnClearAll = document.getElementById('btnClearAllNotes');
        if (btnClearAll) {
            btnClearAll.addEventListener('click', () => {
                this.clearAllNotes();
            });
        }

        // Tasto Invio su textarea (con Ctrl) per salvare
        const input = document.getElementById('changeNoteInput');
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    this.addNote(input.value);
                }
            });
        }
    }
};

// Inizializza quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    // Attendi che il componente change-notes sia caricato
    setTimeout(() => {
        if (document.getElementById('changeNoteInput')) {
            ChangeNotesManager.init();
        }
    }, 200);
});

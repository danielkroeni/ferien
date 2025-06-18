const translations = {
    de: {
        title: 'Schweiz Ferienplaner',
        addPlanned: '📍 Geplanten Ort hinzufügen',
        addVisited: '✅ Besuchten Ort hinzufügen',
        clearAll: '🗑️ Alle löschen',
        plannedPlaces: 'Geplante Orte',
        visitedPlaces: 'Besuchte Orte',
        myPlaces: 'Meine Orte',
        clickOnMap: '🎯 Klicke auf die Karte',
        planned: 'Geplant',
        visited: 'Besucht',
        delete: 'Löschen',
        markAsVisited: 'Als besucht markieren',
        status: 'Status',
        showOnMap: 'Auf Karte zeigen',
        clearAllConfirm: 'Alle Orte löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
        locationError: 'Fehler beim Abrufen des Ortsnamens:'
    },
    fr: {
        title: 'Planificateur de vacances suisses',
        addPlanned: '📍 Ajouter un lieu prévu',
        addVisited: '✅ Ajouter un lieu visité',
        clearAll: '🗑️ Supprimer tout',
        plannedPlaces: 'Lieux prévus',
        visitedPlaces: 'Lieux visités',
        myPlaces: 'Mes lieux',
        clickOnMap: '🎯 Cliquez sur la carte',
        planned: 'Prévu',
        visited: 'Visité',
        delete: 'Supprimer',
        markAsVisited: 'Marquer comme visité',
        status: 'Statut',
        showOnMap: 'Montrer sur la carte',
        clearAllConfirm: 'Supprimer tous les lieux ? Cette action ne peut pas être annulée.',
        locationError: 'Erreur lors de la récupération du nom du lieu :'
    },
    it: {
        title: 'Pianificatore vacanze svizzere',
        addPlanned: '📍 Aggiungi luogo pianificato',
        addVisited: '✅ Aggiungi luogo visitato',
        clearAll: '🗑️ Elimina tutto',
        plannedPlaces: 'Luoghi pianificati',
        visitedPlaces: 'Luoghi visitati',
        myPlaces: 'I miei luoghi',
        clickOnMap: '🎯 Clicca sulla mappa',
        planned: 'Pianificato',
        visited: 'Visitato',
        delete: 'Elimina',
        markAsVisited: 'Segna come visitato',
        status: 'Stato',
        showOnMap: 'Mostra sulla mappa',
        clearAllConfirm: 'Eliminare tutti i luoghi? Questa azione non può essere annullata.',
        locationError: 'Errore nel recupero del nome del luogo:'
    }
};

class SwissVacationPlanner {
    constructor() {
        this.map = null;
        this.places = JSON.parse(localStorage.getItem('swissPlaces') || '[]');
        this.markers = new Map();
        this.addMode = null;
        this.currentLanguage = localStorage.getItem('swissPlannerLanguage') || 'de';
        
        this.init();
    }

    init() {
        this.initMap();
        this.initEventListeners();
        this.loadPlaces();
        this.updatePlacesList();
        this.updateLanguage();
    }

    t(key) {
        return translations[this.currentLanguage][key] || key;
    }

    setLanguage(lang) {
        this.currentLanguage = lang;
        localStorage.setItem('swissPlannerLanguage', lang);
        this.updateLanguage();
        this.updatePlacesList();
        this.updateAllMarkers();
    }

    updateLanguage() {
        document.title = this.t('title');
        document.querySelector('h1').textContent = `🏔️ ${this.t('title')}`;
        document.getElementById('add-planned').textContent = this.t('addPlanned');
        document.getElementById('add-visited').textContent = this.t('addVisited');
        document.getElementById('clear-all').textContent = this.t('clearAll');
        document.querySelector('.sidebar h3').textContent = this.t('myPlaces');
        
        const legendItems = document.querySelectorAll('.legend-item span:not(.legend-marker)');
        legendItems[0].textContent = this.t('plannedPlaces');
        legendItems[1].textContent = this.t('visitedPlaces');
        
        document.documentElement.lang = this.currentLanguage;
        
        document.querySelectorAll('.language-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === this.currentLanguage);
        });
    }

    initMap() {
        this.map = L.map('map').setView([46.8182, 8.2275], 8);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        this.map.on('click', (e) => {
            if (this.addMode) {
                this.addPlace(e.latlng.lat, e.latlng.lng, this.addMode);
                this.resetAddMode();
            }
        });
    }

    initEventListeners() {
        document.getElementById('add-planned').addEventListener('click', () => {
            this.setAddMode('planned');
        });

        document.getElementById('add-visited').addEventListener('click', () => {
            this.setAddMode('visited');
        });

        document.getElementById('clear-all').addEventListener('click', () => {
            this.clearAll();
        });

        document.querySelectorAll('.language-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setLanguage(btn.dataset.lang);
            });
        });
    }

    setAddMode(mode) {
        this.addMode = mode;
        document.body.classList.add('add-mode');
        document.getElementById('map').style.cursor = 'crosshair';
        
        const btn = document.getElementById(`add-${mode}`);
        btn.textContent = this.t('clickOnMap');
        btn.classList.add('active');
    }

    resetAddMode() {
        this.addMode = null;
        document.body.classList.remove('add-mode');
        document.getElementById('map').style.cursor = '';
        
        document.getElementById('add-planned').textContent = this.t('addPlanned');
        document.getElementById('add-visited').textContent = this.t('addVisited');
        
        document.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));
    }

    async addPlace(lat, lng, type) {
        const name = await this.getLocationName(lat, lng);
        
        const place = {
            id: Date.now(),
            name,
            lat,
            lng,
            type,
            date: new Date().toISOString()
        };

        this.places.push(place);
        this.saveData();
        this.addMarker(place);
        this.updatePlacesList();
    }

    async getLocationName(lat, lng) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`);
            const data = await response.json();
            
            if (data && data.display_name) {
                const parts = data.display_name.split(',');
                return parts[0].trim() || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            }
        } catch (error) {
            console.error(this.t('locationError'), error);
        }
        
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }

    addMarker(place) {
        const icon = L.divIcon({
            className: `custom-marker ${place.type}`,
            html: place.type === 'planned' ? '📍' : '✅',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });

        const marker = L.marker([place.lat, place.lng], { icon })
            .addTo(this.map)
            .bindPopup(`
                <div class="popup-content">
                    <h4>${place.name}</h4>
                    <p>${this.t('status')}: ${place.type === 'planned' ? this.t('planned') : this.t('visited')}</p>
                    <button onclick="planner.removePlace(${place.id})">${this.t('delete')}</button>
                    ${place.type === 'planned' ? 
                        `<button onclick="planner.markAsVisited(${place.id})">${this.t('markAsVisited')}</button>` : 
                        ''}
                </div>
            `);

        this.markers.set(place.id, marker);
    }

    removePlace(id) {
        this.places = this.places.filter(p => p.id !== id);
        
        if (this.markers.has(id)) {
            this.map.removeLayer(this.markers.get(id));
            this.markers.delete(id);
        }
        
        this.saveData();
        this.updatePlacesList();
    }

    markAsVisited(id) {
        const place = this.places.find(p => p.id === id);
        if (place) {
            place.type = 'visited';
            
            if (this.markers.has(id)) {
                this.map.removeLayer(this.markers.get(id));
                this.markers.delete(id);
            }
            
            this.addMarker(place);
            this.saveData();
            this.updatePlacesList();
        }
    }

    updateAllMarkers() {
        this.markers.forEach((marker, id) => {
            const place = this.places.find(p => p.id === id);
            if (place) {
                marker.setPopupContent(`
                    <div class="popup-content">
                        <h4>${place.name}</h4>
                        <p>${this.t('status')}: ${place.type === 'planned' ? this.t('planned') : this.t('visited')}</p>
                        <button onclick="planner.removePlace(${place.id})">${this.t('delete')}</button>
                        ${place.type === 'planned' ? 
                            `<button onclick="planner.markAsVisited(${place.id})">${this.t('markAsVisited')}</button>` : 
                            ''}
                    </div>
                `);
            }
        });
    }

    loadPlaces() {
        this.places.forEach(place => {
            this.addMarker(place);
        });
    }

    updatePlacesList() {
        const container = document.getElementById('places-list');
        const planned = this.places.filter(p => p.type === 'planned');
        const visited = this.places.filter(p => p.type === 'visited');

        container.innerHTML = `
            <div class="places-section">
                <h4>📍 ${this.t('plannedPlaces')} (${planned.length})</h4>
                ${planned.map(place => `
                    <div class="place-item">
                        <span>${place.name}</span>
                        <div class="place-actions">
                            <button onclick="planner.centerOnPlace(${place.id})" title="${this.t('showOnMap')}">📍</button>
                            <button onclick="planner.markAsVisited(${place.id})" title="${this.t('markAsVisited')}">✅</button>
                            <button onclick="planner.removePlace(${place.id})" title="${this.t('delete')}">🗑️</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="places-section">
                <h4>✅ ${this.t('visitedPlaces')} (${visited.length})</h4>
                ${visited.map(place => `
                    <div class="place-item visited">
                        <span>${place.name}</span>
                        <div class="place-actions">
                            <button onclick="planner.centerOnPlace(${place.id})" title="${this.t('showOnMap')}">📍</button>
                            <button onclick="planner.removePlace(${place.id})" title="${this.t('delete')}">🗑️</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    centerOnPlace(id) {
        const place = this.places.find(p => p.id === id);
        if (place) {
            this.map.setView([place.lat, place.lng], 12);
            this.markers.get(id).openPopup();
        }
    }

    clearAll() {
        if (confirm(this.t('clearAllConfirm'))) {
            this.places = [];
            this.markers.forEach(marker => this.map.removeLayer(marker));
            this.markers.clear();
            this.saveData();
            this.updatePlacesList();
        }
    }

    saveData() {
        localStorage.setItem('swissPlaces', JSON.stringify(this.places));
    }
}

const planner = new SwissVacationPlanner();
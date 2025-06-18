class SwissVacationPlanner {
    constructor() {
        this.map = null;
        this.places = JSON.parse(localStorage.getItem('swissPlaces') || '[]');
        this.markers = new Map();
        this.addMode = null;
        
        this.init();
    }

    init() {
        this.initMap();
        this.initEventListeners();
        this.loadPlaces();
        this.updatePlacesList();
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
    }

    setAddMode(mode) {
        this.addMode = mode;
        document.body.classList.add('add-mode');
        document.getElementById('map').style.cursor = 'crosshair';
        
        const btn = document.getElementById(`add-${mode}`);
        btn.textContent = mode === 'planned' ? '🎯 Klicke auf die Karte' : '🎯 Klicke auf die Karte';
        btn.classList.add('active');
    }

    resetAddMode() {
        this.addMode = null;
        document.body.classList.remove('add-mode');
        document.getElementById('map').style.cursor = '';
        
        document.getElementById('add-planned').textContent = '📍 Geplanten Ort hinzufügen';
        document.getElementById('add-visited').textContent = '✅ Besuchten Ort hinzufügen';
        
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
            console.error('Fehler beim Abrufen des Ortsnamens:', error);
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
                    <p>Status: ${place.type === 'planned' ? 'Geplant' : 'Besucht'}</p>
                    <button onclick="planner.removePlace(${place.id})">Löschen</button>
                    ${place.type === 'planned' ? 
                        `<button onclick="planner.markAsVisited(${place.id})">Als besucht markieren</button>` : 
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
                <h4>📍 Geplante Orte (${planned.length})</h4>
                ${planned.map(place => `
                    <div class="place-item">
                        <span>${place.name}</span>
                        <div class="place-actions">
                            <button onclick="planner.centerOnPlace(${place.id})" title="Auf Karte zeigen">📍</button>
                            <button onclick="planner.markAsVisited(${place.id})" title="Als besucht markieren">✅</button>
                            <button onclick="planner.removePlace(${place.id})" title="Löschen">🗑️</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="places-section">
                <h4>✅ Besuchte Orte (${visited.length})</h4>
                ${visited.map(place => `
                    <div class="place-item visited">
                        <span>${place.name}</span>
                        <div class="place-actions">
                            <button onclick="planner.centerOnPlace(${place.id})" title="Auf Karte zeigen">📍</button>
                            <button onclick="planner.removePlace(${place.id})" title="Löschen">🗑️</button>
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
        if (confirm('Alle Orte löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
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
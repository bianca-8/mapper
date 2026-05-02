class MapTracker {
    constructor() {
        this.map = null;
        this.watchId = null;
        this.currentMarker = null;
        this.visitedLocations = [];
        this.coloredLayer = null;
        this.maskCanvas = null;
        this.init();
    }

    init() {
        this.setupMap();
        this.startTracking();
    }

    setupMap() {
        this.map = L.map('map').setView([20, 0], 2);
        
        // gray base
        const baseLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            maxZoom: 17
        }).addTo(this.map);
        baseLayer.getContainer().style.filter = 'grayscale(0.85) brightness(0.95)';
        
        // color overlay
        this.coloredLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            maxZoom: 17
        }).addTo(this.map);
        
        this.createMaskOverlay();
        this.map.on('moveend zoomend', () => this.updateMask());
    }

    createMaskOverlay() {
        const mapContainer = document.getElementById('map');
        this.maskCanvas = document.createElement('canvas');
        this.maskCanvas.id = 'location-mask';
        this.maskCanvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            pointer-events: none;
            z-index: 400;
        `;
        mapContainer.appendChild(this.maskCanvas);
        
        setTimeout(() => {
            const coloredPane = document.querySelector('.leaflet-tile-pane');
            if (coloredPane) {
                const panes = coloredPane.parentElement.querySelectorAll('.leaflet-tile-pane');
                if (panes[1]) {
                    panes[1].style.mixBlendMode = 'screen';
                }
            }
        }, 100);
    }

    updateMask() {
        if (!this.maskCanvas) return;
        
        const mapContainer = document.getElementById('map');
        const rect = mapContainer.getBoundingClientRect();
        this.maskCanvas.width = rect.width;
        this.maskCanvas.height = rect.height;
        
        const ctx = this.maskCanvas.getContext('2d');
        ctx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
        
        // circle at visited location
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
        
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        const radius = 80;
        
        for (let location of this.visitedLocations) {
            const point = this.map.latLngToContainerPoint(location);
            ctx.beginPath();
            ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    startTracking() {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.centerMapOnLocation(position.coords);
            },
            (error) => {
                console.error('Geolocation error:', error.message);
            }
        );

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                const coords = position.coords;
                this.addVisitedLocation(coords.latitude, coords.longitude);
                this.updateDisplay(coords.latitude, coords.longitude);
                this.updateCurrentMarker(coords.latitude, coords.longitude);
            },
            (error) => {
                console.error('Watch error:', error.message);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }

    addVisitedLocation(lat, lon) {
        // add location if not too close to prev
        if (this.visitedLocations.length === 0 || 
            this.calculateDistance(this.visitedLocations[this.visitedLocations.length - 1].lat, 
                                 this.visitedLocations[this.visitedLocations.length - 1].lng, lat, lon) > 0.0001) {
            this.visitedLocations.push(L.latLng(lat, lon));
            this.updateMask();
        }
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
    }

    centerMapOnLocation(coords) {
        this.map.setView([coords.latitude, coords.longitude], 15);
        this.addVisitedLocation(coords.latitude, coords.longitude);
        this.updateCurrentMarker(coords.latitude, coords.longitude);
        this.updateDisplay(coords.latitude, coords.longitude);
    }

    updateCurrentMarker(lat, lon) {
        if (this.currentMarker) {
            this.currentMarker.setLatLng([lat, lon]);
        } else {
            this.currentMarker = L.circleMarker([lat, lon], {
                radius: 8,
                fillColor: '#000',
                color: '#fff',
                weight: 3,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(this.map);
        }
    }

    updateDisplay(lat, lon) {
        document.getElementById('coords').textContent = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    }
}

document.addEventListener('DOMContentLoaded', () => new MapTracker());

class MapTracker {
    constructor() {
        this.map = null;
        this.watchId = null;
        this.currentMarker = null;
        this.init();
    }

    init() {
        this.setupMap();
        this.startTracking();
    }

    setupMap() {
        this.map = L.map('map').setView([20, 0], 2);
        L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            maxZoom: 17
        }).addTo(this.map);
    }

    startTracking() {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.centerMapOnLocation(position.coords);
            },
        );

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                const coords = position.coords;
                this.updateDisplay(coords.latitude, coords.longitude);
                this.updateCurrentMarker(coords.latitude, coords.longitude);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }

    centerMapOnLocation(coords) {
        this.map.setView([coords.latitude, coords.longitude], 15);
        this.updateCurrentMarker(coords.latitude, coords.longitude);
        this.updateDisplay(coords.latitude, coords.longitude);
    }

    updateCurrentMarker(lat, lon) {
        if (this.currentMarker) {
            this.currentMarker.setLatLng([lat, lon]);
        } else {
            this.currentMarker = L.circleMarker([lat, lon], {
                radius: 10,
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

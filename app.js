const SUPABASE_URL = 'https://tlngsxgivvbxhtojihzu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsbmdzeGdpdnZieGh0b2ppaHp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NjM3MjYsImV4cCI6MjA5MjUzOTcyNn0.wIBL6jU2pezmZ88RuL18_NLnnckIMzMaNcfQXXOY_eA';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// auth
let isSignUp = false;

document.getElementById('auth-toggle').addEventListener('click', () => {
    isSignUp = !isSignUp;
    document.getElementById('auth-title').textContent = isSignUp ? 'Sign Up' : 'Sign In';
    document.getElementById('auth-submit').textContent = isSignUp ? 'Sign Up' : 'Sign In';
    document.getElementById('auth-toggle').textContent = isSignUp
        ? 'Have an account? Sign In'
        : 'No account? Sign Up';
    document.getElementById('auth-error').textContent = '';
});

document.getElementById('auth-submit').addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const errEl = document.getElementById('auth-error');
    errEl.textContent = '';

    const { error } = isSignUp
        ? await sb.auth.signUp({ email, password })
        : await sb.auth.signInWithPassword({ email, password });

    if (error) {
        errEl.textContent = error.message;
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    sb.auth.signOut();
});

let tracker = null;

sb.auth.onAuthStateChange(async (event, session) => {
    if (session) {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'flex';
        if (!tracker) {
            tracker = new MapTracker(session.user.id);
        }
    } else {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-screen').style.display = 'none';
        tracker = null;
    }
});

// map
class MapTracker {
    constructor(userId) {
        this.userId = userId;
        this.map = null;
        this.watchId = null;
        this.currentMarker = null;
        this.visitedLocations = [];
        this.maskCanvas = null;
        this.pendingSave = new Set();
        this.init();
    }

    async init() {
        this.setupMap();
        await this.loadLocationsFromDB();
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
        L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
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
            position: absolute; top: 0; left: 0;
            pointer-events: none; z-index: 400;
        `;
        mapContainer.appendChild(this.maskCanvas);

        setTimeout(() => {
            const panes = document.querySelectorAll('.leaflet-tile-pane');
            if (panes[1]) panes[1].style.mixBlendMode = 'screen';
        }, 100);
    }

    updateMask() {
        if (!this.maskCanvas) return;
        const mapContainer = document.getElementById('map');
        const rect = mapContainer.getBoundingClientRect();
        this.maskCanvas.width = rect.width;
        this.maskCanvas.height = rect.height;

        const ctx = this.maskCanvas.getContext('2d');

        // circle at visited location
        ctx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);

        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        const radiusM = 500; // circle radius (meters)

        for (const location of this.visitedLocations) {
            const point = this.map.latLngToContainerPoint(location);
            const latLng2 = L.latLng(location.lat + (radiusM / 111320), location.lng);
            const point2 = this.map.latLngToContainerPoint(latLng2);
            const pixelRadius = Math.abs(point2.y - point.y);
            ctx.beginPath();
            ctx.arc(point.x, point.y, pixelRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    async loadLocationsFromDB() {
        const { data, error } = await sb
            .from('visited_locations')
            .select('lat, lng')
            .eq('user_id', this.userId);

        if (error) {
            console.error('Error loading locations:', error.message);
            return;
        }

        for (const row of data) {
            this.visitedLocations.push(L.latLng(row.lat, row.lng));
        }
        this.updateMask();
    }

    async saveLocationToDB(lat, lng) {
        const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
        if (this.pendingSave.has(key)) return;
        this.pendingSave.add(key);

        const { error } = await sb
            .from('visited_locations')
            .insert({ user_id: this.userId, lat, lng });

        if (error) console.error('Error saving location:', error.message);
    }
    
    addVisitedLocation(lat, lon) {
        // add location if not too close to prev
        const last = this.visitedLocations[this.visitedLocations.length - 1];
        const isNew = !last || this.calculateDistance(last.lat, last.lng, lat, lon) > 0.0001;

        if (isNew) {
            this.visitedLocations.push(L.latLng(lat, lon));
            this.updateMask();
            this.saveLocationToDB(lat, lon);
        }
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
    }

    startTracking() {
        navigator.geolocation.getCurrentPosition(
            (position) => this.centerMapOnLocation(position.coords),
            (error) => console.error('Geolocation error:', error.message)
        );

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                this.addVisitedLocation(latitude, longitude);
                this.updateDisplay(latitude, longitude);
                this.updateCurrentMarker(latitude, longitude);
            },
            (error) => console.error('Watch error:', error.message),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
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

            // DEBUG
            let isDragging = false;
            this.currentMarker.on('mousedown', (e) => {
                if (e.originalEvent.shiftKey) {
                    isDragging = true;
                    L.DomEvent.preventDefault(e);
                }
            });

            this.map.on('mousemove', (e) => {
                if (isDragging) {
                    this.currentMarker.setLatLng(e.latlng);
                    this.updateDisplay(e.latlng.lat, e.latlng.lng);
                    this.addVisitedLocation(e.latlng.lat, e.latlng.lng);
                }
            });
            this.map.on('mouseup', () => { isDragging = false; });
            // END DEBUG
        }
    }

    updateDisplay(lat, lon) {
        document.getElementById('coords').textContent = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    }
}
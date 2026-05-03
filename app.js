const SUPABASE_URL = 'https://tlngsxgivvbxhtojihzu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsbmdzeGdpdnZieGh0b2ppaHp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NjM3MjYsImV4cCI6MjA5MjUzOTcyNn0.wIBL6jU2pezmZ88RuL18_NLnnckIMzMaNcfQXXOY_eA';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let tracker = null;
let currentProfile = null;

// profile
async function loadProfile(userId) {
    try {
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Profile query timeout')), 3000)
        );
        
        const queryPromise = sb.from('profiles').select('*').eq('id', userId).single();
        const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
        
        if (error) {
            const { error: createError } = await sb.from('profiles').insert({ 
                id: userId, 
                username: 'User', 
                color: '#ffffff' 
            });
            if (createError) {
                return null;
            }
            return { id: userId, username: 'User', color: '#ffffff' };
        }
        return data;
    } catch (e) {
        return null;
    }
}

function getContrastColor(hex) {
    if (!hex || hex.length < 7) return '#000';
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return (r*0.299 + g*0.587 + b*0.114) > 150 ? '#000' : '#fff';
}

function updateProfileButton(profile) {
    if (!profile) return;
    const btn = document.getElementById('profile-btn');
    const img = document.getElementById('profile-avatar');
    const initials = document.getElementById('profile-initials');
    btn.style.background = profile.color || '#ffffff';
    btn.style.color = getContrastColor(profile.color || '#ffffff');
    if (profile.avatar_url) {
        img.src = profile.avatar_url;
        img.style.display = 'block';
        initials.style.display = 'none';
    } else {
        img.style.display = 'none';
        initials.textContent = (profile.username || '?')[0].toUpperCase();
        initials.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {

// auth
let isSignUp = false;

document.getElementById('auth-toggle').addEventListener('click', () => {
    isSignUp = !isSignUp;
    document.getElementById('auth-title').textContent = isSignUp ? 'Sign Up' : 'Sign In';
    document.getElementById('auth-submit').textContent = isSignUp ? 'Sign Up' : 'Sign In';
    document.getElementById('auth-toggle').textContent = isSignUp
        ? 'Have an account? Sign In'
        : 'No account? Sign Up';
    document.getElementById('auth-username').style.display = isSignUp ? 'block' : 'none';
    document.getElementById('auth-error').textContent = '';
});

document.getElementById('auth-submit').addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const username = document.getElementById('auth-username').value.trim();
    const errEl = document.getElementById('auth-error');
    errEl.textContent = '';

    if (isSignUp) {
        if (!username) { errEl.textContent = 'Please choose a username.'; return; }
        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) { errEl.textContent = error.message; return; }
        const { error: profileError } = await sb.from('profiles').insert({ id: data.user.id, username, color: '#ffffff' });
        if (profileError) { 
            errEl.textContent = 'Account created but profile setup failed. Please try signing in.'; 
            return; 
        }
    } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) { errEl.textContent = error.message; return; }
    }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
    document.getElementById('profile-modal').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app-screen').style.display = 'none';
    await sb.auth.signOut();
});

function openProfileModal() {
    document.getElementById('profile-modal').style.display = 'flex';
    document.getElementById('profile-username').value = currentProfile?.username || '';
    document.getElementById('profile-color').value = currentProfile?.color || '#ffffff';
    document.getElementById('profile-status').textContent = '';

    const modalImg = document.getElementById('modal-avatar-img');
    const modalInitials = document.getElementById('modal-avatar-initials');
    if (currentProfile?.avatar_url) {
        modalImg.src = currentProfile.avatar_url;
        modalImg.style.display = 'block';
        modalInitials.style.display = 'none';
    } else {
        modalImg.style.display = 'none';
        modalInitials.textContent = (currentProfile?.username || '?')[0].toUpperCase();
        modalInitials.style.display = 'block';
    }

    const note = document.getElementById('username-note');
    const usernameInput = document.getElementById('profile-username');
    const saveUsernameBtn = document.getElementById('save-username');
    if (currentProfile?.username_changed_at) {
        const next = new Date(new Date(currentProfile.username_changed_at).getTime() + 30*24*60*60*1000);
        const daysLeft = Math.ceil((next - new Date()) / (1000*60*60*24));
        if (daysLeft > 0) {
            note.textContent = `Can change again in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`;
            usernameInput.disabled = true;
            saveUsernameBtn.disabled = true;
        } else {
            note.textContent = '';
            usernameInput.disabled = false;
            saveUsernameBtn.disabled = false;
        }
    } else {
        note.textContent = '';
        usernameInput.disabled = false;
        saveUsernameBtn.disabled = false;
    }
}

document.getElementById('profile-btn').addEventListener('click', openProfileModal);

document.getElementById('close-profile').addEventListener('click', () => {
    document.getElementById('profile-modal').style.display = 'none';
});

document.getElementById('profile-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('profile-modal'))
        document.getElementById('profile-modal').style.display = 'none';
});

document.getElementById('save-username').addEventListener('click', async () => {
    const newUsername = document.getElementById('profile-username').value.trim();
    const statusEl = document.getElementById('profile-status');
    if (!newUsername) { statusEl.textContent = 'Username cannot be empty.'; return; }
    const { data: sessionData } = await sb.auth.getSession();
    const { error } = await sb.from('profiles').update({
        username: newUsername,
        username_changed_at: new Date().toISOString()
    }).eq('id', sessionData.session.user.id);
    if (error) {
        statusEl.textContent = error.message.includes('unique') ? 'Username already taken.' : error.message;
    } else {
        currentProfile.username = newUsername;
        currentProfile.username_changed_at = new Date().toISOString();
        statusEl.textContent = 'Username saved!';
        updateProfileButton(currentProfile);
        openProfileModal();
    }
});

document.getElementById('save-color').addEventListener('click', async () => {
    const newColor = document.getElementById('profile-color').value;
    const statusEl = document.getElementById('profile-status');
    const { data: sessionData } = await sb.auth.getSession();
    const { error } = await sb.from('profiles').update({ color: newColor }).eq('id', sessionData.session.user.id);
    if (error) { statusEl.textContent = error.message; return; }
    currentProfile.color = newColor;
    statusEl.textContent = 'Colour saved!';
    updateProfileButton(currentProfile);
    if (tracker) tracker.setColor(newColor);
});

document.getElementById('avatar-upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const statusEl = document.getElementById('profile-status');
    statusEl.textContent = 'Uploading...';
    const { data: sessionData } = await sb.auth.getSession();
    const userId = sessionData.session.user.id;
    const ext = file.name.split('.').pop();
    const path = `${userId}/avatar.${ext}`;
    const { error: uploadError } = await sb.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadError) { statusEl.textContent = uploadError.message; return; }
    const { data: urlData } = sb.storage.from('avatars').getPublicUrl(path);
    const avatarUrl = urlData.publicUrl + '?t=' + Date.now();
    const { error: updateError } = await sb.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId);
    if (updateError) { statusEl.textContent = updateError.message; return; }
    currentProfile.avatar_url = avatarUrl;
    statusEl.textContent = 'Photo updated!';
    updateProfileButton(currentProfile);
    openProfileModal();
});

});

// map
class MapTracker {
    constructor(userId, color) {
        this.userId = userId;
        this.color = color || '#ffffff';
        this.map = null;
        this.watchId = null;
        this.currentMarker = null;
        this.visitedLocations = [];
        this.maskCanvas = null;
        this.pendingSave = new Set();
        this.init();
    }

    async init() {
        await new Promise(resolve => setTimeout(resolve, 100));
        this.setupMap();
        await this.loadLocationsFromDB();
        this.startTracking();
    }

    setColor(color) {
        this.color = color;
        this.updateMask();
    }

    setupMap() {
        try {
            this.map = L.map('map').setView([20, 0], 2);
            
            L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                maxZoom: 17
            }).addTo(this.map);

            this.createMaskOverlay();
            this.map.on('moveend zoomend', () => this.updateMask());
            
            setTimeout(() => {
                if (this.map) {
                    this.map.invalidateSize();
                }
            }, 300);
        } catch (e) {
        }
    }

    createMaskOverlay() {
        const mapContainer = document.getElementById('map');
        this.maskCanvas = document.createElement('canvas');
        this.maskCanvas.id = 'location-mask';
        this.maskCanvas.style.cssText = `
            position: absolute; top: 0; left: 0;
            pointer-events: none; z-index: 400;
            width: 100%; height: 100%;
        `;
        mapContainer.appendChild(this.maskCanvas);
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
            (error) => {}
        );

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                this.addVisitedLocation(latitude, longitude);
                this.updateDisplay(latitude, longitude);
                this.updateCurrentMarker(latitude, longitude);
            },
            (error) => {},
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

sb.auth.onAuthStateChange(async (event, session) => {
    if (session) {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'flex';
        
        // get rid of old tracker
        if (tracker && tracker.map) {
            tracker.map.remove();
            tracker = null;
        }
        
        currentProfile = await loadProfile(session.user.id);
        if (!currentProfile) {
            currentProfile = { id: session.user.id, username: 'User', color: '#ffffff' };
        }
        tracker = new MapTracker(session.user.id, currentProfile?.color || '#ffffff');
        updateProfileButton(currentProfile);
    } else {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-screen').style.display = 'none';
        document.getElementById('profile-modal').style.display = 'none';
        
        // get rid of tracker on logout
        if (tracker && tracker.map) {
            tracker.map.remove();
            tracker = null;
        }
        
        currentProfile = null;
    }
});
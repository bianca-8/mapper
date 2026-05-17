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
        
        const queryPromise = (async () => {
            const result = await sb.from('profiles').select('*').eq('id', userId).single();
            return result;
        })();
        
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
    const btn = document.getElementById('profile-btn');
    if (!profile) {
        btn.style.display = 'block';
        btn.style.background = '#808080';
        btn.style.color = '#fff';
        const img = document.getElementById('profile-avatar');
        const initials = document.getElementById('profile-initials');
        img.style.display = 'none';
        initials.textContent = '?';
        initials.style.display = 'block';
        return;
    }
    btn.style.display = 'block';
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

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('profile-modal').style.display = 'none';
    document.getElementById('add-friend-modal').style.display = 'none';
    document.getElementById('menu-dropdown').classList.add('hidden');
    
    await sb.auth.signOut();
    
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'flex';
    
    tracker = new MapTracker(null, '#ffffff');
    currentProfile = null;
    updateProfileButton(null);
    document.getElementById('show-friends-toggle').style.display = 'none';
    document.getElementById('heatmap-toggle').style.display = 'none';
    document.getElementById('menu-btn').style.display = 'none';

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
    document.getElementById('auth-screen').style.display = 'none';
    if (tracker) {
        tracker.visitedLocations = [];
        tracker._lastTrackedLocation = null;
        tracker.updateMask();
    }
    await sb.auth.signOut();
});

function openProfileModal() {
    document.getElementById('profile-modal').style.display = 'flex';
    document.getElementById('profile-username').value = currentProfile?.username || '';
    document.getElementById('profile-color').value = currentProfile?.color || '#ffffff';
    document.getElementById('profile-status').textContent = '';

    const modalImg = document.getElementById('modal-avatar-img');
    const modalInitials = document.getElementById('modal-avatar-initials');
    const avatarPreview = document.getElementById('avatar-preview');
    
    const userColor = currentProfile?.color || '#9ed3af';
    avatarPreview.style.background = userColor;
    avatarPreview.style.color = getContrastColor(userColor);
    
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
    note.textContent = '';
    usernameInput.disabled = false;
    saveUsernameBtn.disabled = false;
}

document.getElementById('profile-btn').addEventListener('click', () => {
    if (currentProfile) {
        openProfileModal();
    } else {
        document.getElementById('auth-screen').style.display = 'flex';
    }
});

document.getElementById('close-profile').addEventListener('click', () => {
    document.getElementById('profile-modal').style.display = 'none';
});

// menu button
const menuBtn = document.getElementById('menu-btn');
const menuDropdown = document.getElementById('menu-dropdown');
if (menuBtn && menuDropdown) {
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        menuDropdown.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
        if (e.target !== menuBtn && !menuDropdown.contains(e.target)) {
            menuDropdown.classList.add('hidden');
        }
    });
}

// heatmap slider toggle
let heatmapEnabled = false;
const heatmapToggle = document.getElementById('heatmap-toggle');
const heatmapSlider = document.getElementById('heatmap-slider');
const heatmapStatus = document.getElementById('heatmap-status');
if (heatmapToggle && heatmapSlider && heatmapStatus) {
    heatmapToggle.addEventListener('click', () => {
        heatmapSlider.checked = !heatmapSlider.checked;
        heatmapEnabled = heatmapSlider.checked;
        heatmapStatus.textContent = heatmapEnabled ? 'ON' : 'OFF';
        if (tracker) tracker.setHeatmapEnabled(heatmapEnabled);
    });
}

// show friends toggle
let showFriendsEnabled = false;
let friendsLoadInProgress = false;
const showFriendsToggle = document.getElementById('show-friends-toggle');
const showFriendsSlider = document.getElementById('show-friends-slider');
const showFriendsStatus = document.getElementById('show-friends-status');
if (showFriendsToggle && showFriendsSlider && showFriendsStatus) {
    showFriendsToggle.addEventListener('click', async () => {
        showFriendsSlider.checked = !showFriendsSlider.checked;
        showFriendsEnabled = showFriendsSlider.checked;
        showFriendsStatus.textContent = showFriendsEnabled ? 'ON' : 'OFF';
        
        if (showFriendsEnabled && tracker) {
            if (friendsLoadInProgress) return;
            friendsLoadInProgress = true;
            await tracker.loadFriendsLocations();
            friendsLoadInProgress = false;
        } else if (!showFriendsEnabled && tracker) {
            tracker.clearFriendsLocations();
        }
    });
}

// timestamps toggle
let timestampsEnabled = false;
const timestampsToggle = document.getElementById('timestamps-toggle');
const timestampsSlider = document.getElementById('timestamps-slider');
const timestampsStatus = document.getElementById('timestamps-status');
if (timestampsToggle) {
    timestampsToggle.addEventListener('click', () => {
        timestampsSlider.checked = !timestampsSlider.checked;
        timestampsEnabled = timestampsSlider.checked;
        timestampsStatus.textContent = timestampsEnabled ? 'ON' : 'OFF';
    });
}

// add friend
document.getElementById('add-friend-btn').addEventListener('click', async () => {
    if (currentProfile) {
        await openFriendsModal();
    }
});

document.getElementById('close-add-friend').addEventListener('click', () => {
    document.getElementById('add-friend-modal').style.display = 'none';
});

document.getElementById('tab-add-request').addEventListener('click', () => {
    switchFriendTab('add-request');
});
document.getElementById('tab-requests').addEventListener('click', () => {
    switchFriendTab('requests');
});
document.getElementById('tab-friends-list').addEventListener('click', () => {
    switchFriendTab('friends-list');
});

function switchFriendTab(tabName) {
    document.querySelectorAll('.friend-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.friend-tab-content').forEach(content => content.classList.remove('active'));
    
    if (tabName === 'add-request') {
        document.getElementById('tab-add-request').classList.add('active');
        document.getElementById('send-request-section').classList.add('active');
    } else if (tabName === 'requests') {
        document.getElementById('tab-requests').classList.add('active');
        document.getElementById('requests-section').classList.add('active');
    } else if (tabName === 'friends-list') {
        document.getElementById('tab-friends-list').classList.add('active');
        document.getElementById('friends-list-section').classList.add('active');
    }
}

let profileModalClickPos = null;
document.getElementById('profile-modal').addEventListener('mousedown', (e) => {
    profileModalClickPos = { x: e.clientX, y: e.clientY };
});
document.getElementById('profile-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('profile-modal')) {
        const endPos = { x: e.clientX, y: e.clientY };
        const distance = Math.sqrt(
            Math.pow(endPos.x - profileModalClickPos.x, 2) + 
            Math.pow(endPos.y - profileModalClickPos.y, 2)
        );
        if (distance < 5) {
            document.getElementById('profile-modal').style.display = 'none';
        }
    }
});

let addFriendModalClickPos = null;
document.getElementById('add-friend-modal').addEventListener('mousedown', (e) => {
    addFriendModalClickPos = { x: e.clientX, y: e.clientY };
});
document.getElementById('add-friend-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('add-friend-modal')) {
        const endPos = { x: e.clientX, y: e.clientY };
        const distance = Math.sqrt(
            Math.pow(endPos.x - addFriendModalClickPos.x, 2) + 
            Math.pow(endPos.y - addFriendModalClickPos.y, 2)
        );
        if (distance < 5) {
            document.getElementById('add-friend-modal').style.display = 'none';
        }
    }
});

let authScreenClickPos = null;
document.getElementById('auth-screen').addEventListener('mousedown', (e) => {
    authScreenClickPos = { x: e.clientX, y: e.clientY };
});
document.getElementById('auth-screen').addEventListener('click', (e) => {
    if (e.target === document.getElementById('auth-screen')) {
        const endPos = { x: e.clientX, y: e.clientY };
        const distance = Math.sqrt(
            Math.pow(endPos.x - authScreenClickPos.x, 2) + 
            Math.pow(endPos.y - authScreenClickPos.y, 2)
        );
        if (distance < 5) {
            document.getElementById('auth-screen').style.display = 'none';
        }
    }
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

document.getElementById('send-friend-request').addEventListener('click', async () => {
    const toUsername = document.getElementById('friend-username').value.trim();
    const statusEl = document.getElementById('friend-status');
    
    if (!toUsername) {
        statusEl.textContent = 'Please enter a username';
        return;
    }
    
    const result = await sendFriendRequest(currentProfile.id, toUsername);
    
    if (result.error) {
        statusEl.style.color = '#f44336';
        statusEl.textContent = result.error;
    } else {
        statusEl.style.color = '#4CAF50';
        statusEl.textContent = 'Request sent!';
        document.getElementById('friend-username').value = '';
        setTimeout(() => {
            openFriendsModal();
        }, 500);
    }
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
        this.customMarkerElement = null;
        this.visitedLocations = [];
        this.friendsLocations = {}; // {friendId: {color, locations: []}}
        this.maskCanvas = null;
        this.pendingSave = new Set();
        this.heatmapEnabled = false;
        this._lastTrackedLocation = null;
        this.init();
    }

    async init() {
        document.getElementById('map-loading').style.display = 'flex';
        try {
            await new Promise(resolve => setTimeout(resolve, 100));
            this.setupMap();
            await this.loadLocationsFromDB();
            this.startTracking();
        } finally {
            document.getElementById('map-loading').style.display = 'none';
        }
    }

    setColor(color) {
        this.color = color;
        this.updateMask();
    }

    setHeatmapEnabled(enabled) {
        this.heatmapEnabled = enabled;
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
            this.map.on('zoom', () => this.updateCustomMarkerPosition());
            this.map.on('move', () => this.updateCustomMarkerPosition());
            
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
        
        // custom marker
        this.customMarkerElement = document.createElement('div');
        this.customMarkerElement.id = 'custom-location-marker';
        mapContainer.appendChild(this.customMarkerElement);

        mapContainer.addEventListener('mousemove', (e) => {
        if (!Object.keys(this.friendsLocations).length && !this.visitedLocations.length) return;
        const rect = mapContainer.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const radiusM = 500;
        let found = null;
        let foundTs = null;

        const checkLocations = (locations, label) => {
            for (const loc of locations) {
                const ll = loc.latlng || loc;
                const point = this.map.latLngToContainerPoint(ll);
                const latLng2 = L.latLng(ll.lat + (radiusM / 111320), ll.lng);
                const point2 = this.map.latLngToContainerPoint(latLng2);
                const pixelRadius = Math.abs(point2.y - point.y);
                const dist = Math.sqrt((mx - point.x) ** 2 + (my - point.y) ** 2);
                if (dist <= pixelRadius) {
                    found = label;
                    foundTs = loc.ts || null;
                    return true;
                }
            }
            return false;
        };

        outer: for (const friendId in this.friendsLocations) {
            const friend = this.friendsLocations[friendId];
            if (checkLocations(friend.locations, friend.username || 'Friend')) break outer;
        }

        if (!found && timestampsEnabled) {
            checkLocations(this.visitedLocations, 'me');
        }

        const tooltip = document.getElementById('friend-tooltip');
        if (found) {
            let text = found === 'me' ? '' : found;
            if (timestampsEnabled && foundTs) {
                const d = new Date(foundTs);
                const ts = d.toLocaleString();
                text = text ? `${text} · ${ts}` : ts;
            }
            tooltip.textContent = text;
            tooltip.style.display = text ? 'block' : 'none';
            tooltip.style.left = (e.clientX + 12) + 'px';
            tooltip.style.top = (e.clientY - 10) + 'px';
        } else {
            tooltip.style.display = 'none';
        }
    });

    mapContainer.addEventListener('mouseleave', () => {
        document.getElementById('friend-tooltip').style.display = 'none';
    });
        
        this.circleCanvas = document.createElement('canvas');
    }

    updateMask() {
        if (!this.maskCanvas) return;
        const mapContainer = document.getElementById('map');
        const rect = mapContainer.getBoundingClientRect();
        this.maskCanvas.width = rect.width;
        this.maskCanvas.height = rect.height;
        this.circleCanvas.width = rect.width;
        this.circleCanvas.height = rect.height;

        const ctx = this.maskCanvas.getContext('2d');
        const circleCtx = this.circleCanvas.getContext('2d');

        ctx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
        
        // gray overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);

        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        
        const radiusM = 500; // circle radius (meters)

        // remove user locations from mask
        for (const location of this.visitedLocations) {
            const point = this.map.latLngToContainerPoint(location.latlng);
            const latLng2 = L.latLng(location.latlng.lat + (radiusM / 111320), location.latlng.lng);
            const point2 = this.map.latLngToContainerPoint(latLng2);
            const pixelRadius = Math.abs(point2.y - point.y);
            ctx.beginPath();
            ctx.arc(point.x, point.y, pixelRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // remove friend locations from mask
        for (const friendId in this.friendsLocations) {
            const friend = this.friendsLocations[friendId];
            for (const location of friend.locations) {
                const point = this.map.latLngToContainerPoint(location);
                const latLng2 = L.latLng(location.lat + (radiusM / 111320), location.lng);
                const point2 = this.map.latLngToContainerPoint(latLng2);
                const pixelRadius = Math.abs(point2.y - point.y);
                ctx.beginPath();
                ctx.arc(point.x, point.y, pixelRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        if (this.userId) {
            circleCtx.clearRect(0, 0, this.circleCanvas.width, this.circleCanvas.height);
            
            const hexToRgb = (hex) => {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                return { r, g, b };
            };
            
            const rgb = hexToRgb(this.color);
            
            if (this.heatmapEnabled) {
                // heatmap - friend locations
                for (const friendId in this.friendsLocations) {
                    const friend = this.friendsLocations[friendId];
                    const friendRgb = hexToRgb(friend.color);
                    circleCtx.fillStyle = `rgba(${friendRgb.r}, ${friendRgb.g}, ${friendRgb.b}, 0.3)`;
                    
                    for (const location of friend.locations) {
                        const point = this.map.latLngToContainerPoint(location);
                        const latLng2 = L.latLng(location.lat + (radiusM / 111320), location.lng);
                        const point2 = this.map.latLngToContainerPoint(latLng2);
                        const pixelRadius = Math.abs(point2.y - point.y);
                        circleCtx.beginPath();
                        circleCtx.arc(point.x, point.y, pixelRadius, 0, Math.PI * 2);
                        circleCtx.fill();
                    }
                }
                
                // heatmap - user locations
                circleCtx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`;
                circleCtx.globalCompositeOperation = 'source-over';
                
                for (const location of this.visitedLocations) {
                    const point = this.map.latLngToContainerPoint(location.latlng);
                    const latLng2 = L.latLng(location.latlng.lat + (radiusM / 111320), location.latlng.lng);
                    const point2 = this.map.latLngToContainerPoint(latLng2);
                    const pixelRadius = Math.abs(point2.y - point.y);
                    circleCtx.beginPath();
                    circleCtx.arc(point.x, point.y, pixelRadius, 0, Math.PI * 2);
                    circleCtx.fill();
                }  
            } else {
                // non-heatmap - draw on own canvas then flood fill

                const drawPersonFlat = (locations, personRgb) => {
                    const tmp = document.createElement('canvas');
                    tmp.width  = this.circleCanvas.width;
                    tmp.height = this.circleCanvas.height;
                    const tc = tmp.getContext('2d');

                    // draw circles
                    tc.fillStyle = 'rgba(0,0,0,1)';
                    for (const location of locations) {
                        const ll = location.latlng || location;
                        const point  = this.map.latLngToContainerPoint(ll);
                        const latLng2 = L.latLng(ll.lat + (radiusM / 111320), ll.lng);
                        const point2 = this.map.latLngToContainerPoint(latLng2);
                        const pixelRadius = Math.abs(point2.y - point.y);
                        tc.beginPath();
                        tc.arc(point.x, point.y, pixelRadius, 0, Math.PI * 2);
                        tc.fill();
                    }

                    // flood fill
                    tc.globalCompositeOperation = 'source-in';
                    tc.fillStyle = `rgba(${personRgb.r}, ${personRgb.g}, ${personRgb.b}, 0.5)`;
                    tc.fillRect(0, 0, tmp.width, tmp.height);

                    // draw on circleCanvas
                    circleCtx.globalCompositeOperation = 'source-over';
                    circleCtx.drawImage(tmp, 0, 0);
                };

                // draw friends then user
                for (const friendId in this.friendsLocations) {
                    const friend = this.friendsLocations[friendId];
                    drawPersonFlat(friend.locations, hexToRgb(friend.color));
                }
                drawPersonFlat(this.visitedLocations, rgb);
            }
            
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(this.circleCanvas, 0, 0);
        }
    }

    async loadLocationsFromDB() {
        if (!this.userId) {
            return;
        }
        
        // paginate for 1000+ rows
        const pageSize = 1000;
        let page = 0;
        let allData = [];

        while (true) {
            const from = page * pageSize;
            const to = from + pageSize - 1;
            const { data, error } = await sb
                .from('visited_locations')
                .select('lat, lng, created_at')
                .eq('user_id', this.userId)
                .range(from, to);

            if (error) {
                console.error('loadLocationsFromDB error:', error);
                break;
            }

            if (!data || data.length === 0) break;

            allData = allData.concat(data);

            if (data.length < pageSize) break;
            page++;
        }

        for (const row of allData) {
            this.visitedLocations.push({ latlng: L.latLng(row.lat, row.lng), ts: row.created_at });
        }
        this.updateMask();
    }

    async loadFriendsLocations() {
        if (!this.userId) return;
        
        // list friends
        const { data: friendsData, error: friendsError } = await sb
            .from('friends')
            .select('id, user_id_1, user_id_2, friend1:user_id_1(username, color), friend2:user_id_2(username, color)')
            .or(`user_id_1.eq.${this.userId},user_id_2.eq.${this.userId}`);
        
        if (friendsError) {
            console.error('Error loading friends:', friendsError);
            return;
        }

        if (!friendsData || friendsData.length === 0) {
            return;
        }
        
        // load friend locations
        for (const friendship of friendsData) {
            const friendId = friendship.user_id_1 === this.userId ? friendship.user_id_2 : friendship.user_id_1;
            const friendInfo = friendship.user_id_1 === this.userId ? friendship.friend2 : friendship.friend1;
            
            const pageSize = 1000;
            let page = 0;
            let allLocations = [];

            while (true) {
                const from = page * pageSize;
                const to = from + pageSize - 1;
                const { data: locations, error: locError } = await sb
                    .from('visited_locations')
                    .select('lat, lng, created_at')
                    .eq('user_id', friendId)
                    .range(from, to);

                if (locError) {
                    console.error('Error loading locations for friend', friendId, ':', locError);
                    break;
                }

                if (!locations || locations.length === 0) break;
                allLocations = allLocations.concat(locations);
                if (locations.length < pageSize) break;
                page++;
            }

            if (allLocations.length > 0) {
                this.friendsLocations[friendId] = {
                    color: friendInfo?.color || '#ffffff',
                    username: friendInfo?.username || 'Friend',
                    locations: allLocations.map(row => L.latLng(row.lat, row.lng))
                };
            }
        }
        
        this.updateMask();
    }

    clearFriendsLocations() {
        this.friendsLocations = {};
        this.updateMask();
    }

    async saveLocationToDB(lat, lng) {
        if (!this.userId) return;
        
        const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
        if (this.pendingSave.has(key)) return;
        this.pendingSave.add(key);

        const { data, error } = await sb
            .from('visited_locations')
            .insert({ user_id: this.userId, lat, lng });
        this.pendingSave.delete(key);
    }
    
    addVisitedLocation(lat, lon) {
        // add location if not too close to prev
        const isNew = !this._lastTrackedLocation || this.calculateDistance(this._lastTrackedLocation.lat, this._lastTrackedLocation.lng, lat, lon) > 0.0001;

        if (isNew) {
            this._lastTrackedLocation = { lat, lng: lon };
            this.visitedLocations.push({ latlng: L.latLng(lat, lon), ts: new Date().toISOString() });
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
        
        this.updateCustomMarkerPosition();
    }

    updateCustomMarkerPosition() {
        if (!this.currentMarker || !this.customMarkerElement) return;
        
        const latlng = this.currentMarker.getLatLng();
        const point = this.map.latLngToContainerPoint(latlng);
        
        this.customMarkerElement.style.left = point.x + 'px';
        this.customMarkerElement.style.top = point.y + 'px';
        this.customMarkerElement.style.display = 'block';
        
        const zoom = this.map.getZoom();
        const scale = Math.pow(1.1, zoom - 15);
        this.customMarkerElement.style.width = (16 * scale) + 'px';
        this.customMarkerElement.style.height = (16 * scale) + 'px';
        this.customMarkerElement.style.borderWidth = (3 * scale) + 'px';
    }

    updateDisplay(lat, lon) {
        document.getElementById('coords').textContent = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    }
}

// friending
async function sendFriendRequest(fromUserId, toUsername) {
    try {
        const { data: recipientData, error: recipientError } = await sb
            .from('profiles')
            .select('id')
            .ilike('username', toUsername);
        
        if (recipientError) {
            return { error: 'Database error: ' + recipientError.message };
        }
        
        if (!recipientData || recipientData.length === 0) {
            return { error: 'User not found' };
        }
        
        const toUserId = recipientData[0].id;
        
        if (toUserId === fromUserId) {
            return { error: 'Cannot send request to yourself' };
        }
        
        const user1 = fromUserId < toUserId ? fromUserId : toUserId;
        const user2 = fromUserId < toUserId ? toUserId : fromUserId;
        
        const { data: existingFriendship } = await sb
            .from('friends')
            .select('id')
            .eq('user_id_1', user1)
            .eq('user_id_2', user2);
        
        if (existingFriendship && existingFriendship.length > 0) {
            return { error: 'Already friends with this user' };
        }
        
        const { data: existingRequest } = await sb
            .from('friend_requests')
            .select('id')
            .eq('from_user_id', fromUserId)
            .eq('to_user_id', toUserId)
            .eq('status', 'pending');
        
        if (existingRequest && existingRequest.length > 0) {
            return { error: 'Request already sent to this user' };
        }
        
        const { error } = await sb.from('friend_requests').insert({
            from_user_id: fromUserId,
            to_user_id: toUserId,
            status: 'pending',
            created_at: new Date().toISOString()
        });
        
        if (error) {
            return { error: error.message };
        }
        
        return { success: true };
    } catch (e) {
        return { error: e.message };
    }
}

async function loadFriendRequests(userId) {
    try {
        const { data, error } = await sb
            .from('friend_requests')
            .select('id, from_user_id, from:from_user_id(username, color)')
            .eq('to_user_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
        
        if (error) {
            return [];
        }
        
        return data || [];
    } catch (e) {
        return [];
    }
}

async function loadPendingSentRequests(userId) {
    try {
        const { data, error } = await sb
            .from('friend_requests')
            .select('id, to_user_id, to:to_user_id(username, color)')
            .eq('from_user_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
        
        if (error) {
            return [];
        }
        
        return data || [];
    } catch (e) {
        return [];
    }
}

async function cancelFriendRequest(requestId) {
    try {
        const { error } = await sb
            .from('friend_requests')
            .delete()
            .eq('id', requestId);
        
        if (error) {
            return { error: error.message };
        }
        
        return { success: true };
    } catch (e) {
        return { error: e.message };
    }
}

async function acceptFriendRequest(requestId, fromUserId, toUserId) {
    try {
        const { error: updateError } = await sb
            .from('friend_requests')
            .update({ status: 'accepted' })
            .eq('id', requestId);
        
        if (updateError) {
            return { error: updateError.message };
        }
        
        const user1 = fromUserId < toUserId ? fromUserId : toUserId;
        const user2 = fromUserId < toUserId ? toUserId : fromUserId;
        
        const { error: friendError } = await sb.from('friends').insert({
            user_id_1: user1,
            user_id_2: user2
        });
        
        if (friendError) {
            return { error: friendError.message };
        }
        
        return { success: true };
    } catch (e) {
        return { error: e.message };
    }
}

async function rejectFriendRequest(requestId) {
    try {
        const { error } = await sb
            .from('friend_requests')
            .update({ status: 'rejected' })
            .eq('id', requestId);
        
        if (error) {
            return { error: error.message };
        }
        
        return { success: true };
    } catch (e) {
        return { error: e.message };
    }
}

async function loadFriends(userId) {
    try {
        const { data, error } = await sb
            .from('friends')
            .select('id, user_id_1, user_id_2, friend1:user_id_1(username, color), friend2:user_id_2(username, color)')
            .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);
        
        if (error) {
            console.error('Friends load error:', error);
            return [];
        }
        
        return data || [];
    } catch (e) {
        console.error('Friends load exception:', e);
        return [];
    }
}

async function removeFriend(friendshipId) {
    try {
        const { error } = await sb
            .from('friends')
            .delete()
            .eq('id', friendshipId);
        
        if (error) {
            return { error: error.message };
        }
        
        return { success: true };
    } catch (e) {
        return { error: e.message };
    }
}

async function openFriendsModal() {
    document.getElementById('add-friend-modal').style.display = 'flex';
    document.getElementById('friend-username').value = '';
    document.getElementById('friend-status').textContent = '';
    
    const pendingSent = await loadPendingSentRequests(currentProfile.id);
    const pendingSentList = document.getElementById('pending-sent-list');
    const noPendingSentMsg = document.getElementById('no-pending-sent-message');
    
    pendingSentList.innerHTML = '';
    
    if (pendingSent.length === 0) {
        noPendingSentMsg.style.display = 'block';
    } else {
        noPendingSentMsg.style.display = 'none';
        for (const request of pendingSent) {
            const toUser = request.to; 
            const pendingDiv = document.createElement('div');
            pendingDiv.className = 'pending-sent-item';
            
            const userInfo = document.createElement('div');
            userInfo.className = 'pending-sent-info';
            
            const avatar = document.createElement('div');
            avatar.className = 'pending-sent-avatar';
            avatar.style.background = toUser.color || '#9ed3af';
            avatar.style.color = getContrastColor(toUser.color || '#9ed3af');
            avatar.textContent = (toUser.username || '?')[0].toUpperCase();
            
            const username = document.createElement('span');
            username.className = 'pending-sent-username';
            username.textContent = toUser.username || 'Unknown';
            
            userInfo.appendChild(avatar);
            userInfo.appendChild(username);
            
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'pending-sent-cancel';
            cancelBtn.textContent = '✕ Cancel';
            cancelBtn.addEventListener('click', async () => {
                await cancelFriendRequest(request.id);
                openFriendsModal();
            });
            
            pendingDiv.appendChild(userInfo);
            pendingDiv.appendChild(cancelBtn);
            pendingSentList.appendChild(pendingDiv);
        }
    }
    
    const requests = await loadFriendRequests(currentProfile.id);
    const requestsList = document.getElementById('requests-list');
    const noRequestsMsg = document.getElementById('no-requests-message');
    
    requestsList.innerHTML = '';
    
    if (requests.length === 0) {
        noRequestsMsg.style.display = 'block';
    } else {
        noRequestsMsg.style.display = 'none';
        for (const request of requests) {
            const fromUser = request.from;
            const requestDiv = document.createElement('div');
            requestDiv.className = 'friend-request-item';
            
            const userInfo = document.createElement('div');
            userInfo.className = 'friend-request-info';
            
            const avatar = document.createElement('div');
            avatar.className = 'friend-request-avatar';
            avatar.style.background = fromUser.color || '#9ed3af';
            avatar.style.color = getContrastColor(fromUser.color || '#9ed3af');
            avatar.textContent = (fromUser.username || '?')[0].toUpperCase();
            
            const username = document.createElement('span');
            username.className = 'friend-request-username';
            username.textContent = fromUser.username || 'Unknown';
            
            userInfo.appendChild(avatar);
            userInfo.appendChild(username);
            
            const buttons = document.createElement('div');
            buttons.className = 'friend-request-buttons';
            
            const acceptBtn = document.createElement('button');
            acceptBtn.className = 'friend-request-accept';
            acceptBtn.textContent = '✓ Accept';
            acceptBtn.addEventListener('click', async () => {
                await acceptFriendRequest(request.id, request.from_user_id, currentProfile.id);
                openFriendsModal();
            });
            
            const rejectBtn = document.createElement('button');
            rejectBtn.className = 'friend-request-reject';
            rejectBtn.textContent = '✕ Reject';
            rejectBtn.addEventListener('click', async () => {
                await rejectFriendRequest(request.id);
                openFriendsModal();
            });
            
            buttons.appendChild(acceptBtn);
            buttons.appendChild(rejectBtn);
            
            requestDiv.appendChild(userInfo);
            requestDiv.appendChild(buttons);
            requestsList.appendChild(requestDiv);
        }
    }
    
    const friends = await loadFriends(currentProfile.id);
    const friendsList = document.getElementById('friends-list');
    const noFriendsMsg = document.getElementById('no-friends-message');
    
    friendsList.innerHTML = '';
    
    if (friends.length === 0) {
        noFriendsMsg.style.display = 'block';
    } else {
        noFriendsMsg.style.display = 'none';
        for (const friendship of friends) {
            const friend = friendship.user_id_1 === currentProfile.id ? friendship.friend2 : friendship.friend1;
            
            const friendDiv = document.createElement('div');
            friendDiv.className = 'friend-item';
            
            const friendInfo = document.createElement('div');
            friendInfo.className = 'friend-info';
            
            const avatar = document.createElement('div');
            avatar.className = 'friend-avatar';
            avatar.style.background = friend.color || '#9ed3af';
            avatar.style.color = getContrastColor(friend.color || '#9ed3af');
            avatar.textContent = (friend.username || '?')[0].toUpperCase();
            
            const friendUsername = document.createElement('span');
            friendUsername.className = 'friend-username';
            friendUsername.textContent = friend.username || 'Unknown';
            
            friendInfo.appendChild(avatar);
            friendInfo.appendChild(friendUsername);
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'friend-remove';
            removeBtn.textContent = '✕ Remove';
            removeBtn.addEventListener('click', async () => {
                await removeFriend(friendship.id);
                openFriendsModal();
            });
            
            friendDiv.appendChild(friendInfo);
            friendDiv.appendChild(removeBtn);
            friendsList.appendChild(friendDiv);
        }
    }
}

let _lastSignedInUserId = null;
sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
        if (_lastSignedInUserId === session.user.id) return;
        _lastSignedInUserId = session.user.id;
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'flex';
        document.getElementById('heatmap-toggle').style.display = 'grid';
        document.getElementById('menu-btn').style.display = 'flex';
        document.getElementById('timestamps-toggle').style.display = 'grid';
        
        if (tracker) {
            tracker.userId = session.user.id;
            tracker.visitedLocations = [];
        }
        
        currentProfile = await loadProfile(session.user.id);
        if (!currentProfile) {
            currentProfile = { id: session.user.id, username: 'User', color: '#ffffff' };
        }
        
        if (tracker) {
            document.getElementById('map-loading').style.display = 'flex';
            try {
                await tracker.loadLocationsFromDB();
                tracker.setColor(currentProfile?.color || '#ffffff');
            } finally {
                document.getElementById('map-loading').style.display = 'none';
            }
        }
        updateProfileButton(currentProfile);
        document.getElementById('add-friend-btn').style.display = 'grid';
        document.getElementById('show-friends-toggle').style.display = 'grid';
    } else if (event === 'SIGNED_OUT') {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('profile-modal').style.display = 'none';
        document.getElementById('add-friend-modal').style.display = 'none';
        document.getElementById('add-friend-btn').style.display = 'none';
        document.getElementById('show-friends-toggle').style.display = 'none';
        document.getElementById('heatmap-toggle').style.display = 'none';
        document.getElementById('menu-btn').style.display = 'none';
        document.getElementById('menu-dropdown').classList.add('hidden');
        document.getElementById('timestamps-toggle').style.display = 'none';
        
        if (tracker) {
            tracker.userId = null;
            tracker.visitedLocations = [];
            tracker._lastTrackedLocation = null;
            tracker.setColor('#ffffff');
            tracker.updateMask();
        }
        
        _lastSignedInUserId = null;
        currentProfile = null;
        updateProfileButton(null);
    }
});

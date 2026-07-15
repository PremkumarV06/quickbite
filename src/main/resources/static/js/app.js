// =====================================================
// QuickBite - Production Food Delivery Platform JS
// Full commercial feature set: search, filters, cart,
// coupon discounts, OTP auth, checkout, tracking
// =====================================================

const API_BASE = '/api';

// ---- Application State ----
let state = {
    user: null,
    activeView: 'landing',
    cart: [],
    selectedRestaurant: null,
    restaurants: [],
    menuItems: [],
    allMenuItems: [],
    pollingInterval: null,
    wishlist: [],
    location: 'Coimbatore, TN',
    activeFilters: { veg: false, nonveg: false, rating: false, fast: false, offers: false },
    customerFilters: { veg: false, nonveg: false, rating: false, fast: false, offers: false },
    activeCategory: 'All',
    customerCategory: 'All',
    appliedCoupon: null,
    checkoutIntent: null,
    productDetailQty: 1,
    currentProductDetail: null,
    selectedPaymentMethod: 'upi'
};

const COUPONS = {
    'WELCOME50': { discount: 0.5, maxDiscount: 100, label: '50% OFF up to ₹100' },
    'SAVEMORE': { flat: 30, minOrder: 199, label: '₹30 OFF on ₹199+' },
    'FLAT20': { flat: 20, label: '₹20 OFF' }
};

// ---- On Load ----
document.addEventListener('DOMContentLoaded', () => { initApp(); });

async function initApp() {
    setupTheme();
    setupWishlist();
    await checkAuth();
    setupEventListeners();
    loadViewBasedOnState();
    loadAllRestaurantsData();
}

// ---- Theme ----
function setupTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    if (saved === 'dark') applyDark();
    document.getElementById('theme-toggle').addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        document.querySelector('#theme-toggle i').className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        showToast(`${isDark ? 'Dark' : 'Light'} Mode`, 'info');
    });
}
function applyDark() {
    document.body.classList.add('dark-theme');
    document.querySelector('#theme-toggle i').className = 'fa-solid fa-sun';
}

// ---- Wishlist ----
function setupWishlist() {
    const saved = localStorage.getItem('wishlist');
    if (saved) state.wishlist = JSON.parse(saved);
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) { state.location = savedLocation; updateLocationDisplay(); }
}
function saveWishlist() { localStorage.setItem('wishlist', JSON.stringify(state.wishlist)); }
function toggleWishlistItem(id, event) {
    if (event) event.stopPropagation();
    const idx = state.wishlist.indexOf(id);
    let added = false;
    if (idx === -1) { state.wishlist.push(id); added = true; showToast('Added to Favourites!', 'success'); }
    else { state.wishlist.splice(idx, 1); showToast('Removed from Favourites', 'info'); }
    saveWishlist();
    document.querySelectorAll(`.wishlist-heart-btn[data-id="${id}"]`).forEach(btn => {
        btn.classList.toggle('favorited', added);
        btn.innerHTML = added ? '<i class="fa-solid fa-heart"></i>' : '<i class="fa-regular fa-heart"></i>';
    });
}

// ---- Event Listeners ----
function setupEventListeners() {
    // Logo
    document.getElementById('logo-btn').addEventListener('click', e => { e.preventDefault(); navigateTo('landing'); });
    // Login / logout
    document.getElementById('login-nav-btn').addEventListener('click', () => showModal('auth-modal'));
    document.getElementById('logout-btn').addEventListener('click', logout);
    // Auth modal
    document.getElementById('auth-close-btn').addEventListener('click', () => hideModal('auth-modal'));
    document.getElementById('phone-login-form').addEventListener('submit', handlePhoneSubmit);
    document.getElementById('verify-otp-btn').addEventListener('click', handleVerifyOtpClick);
    document.getElementById('change-phone-btn').addEventListener('click', handleBackToPhone);
    document.getElementById('resend-otp-btn').addEventListener('click', handleResendOtp);
    // OTP boxes auto-advance
    document.querySelectorAll('.otp-box').forEach((box, idx) => {
        box.addEventListener('input', e => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(-1);
            if (e.target.value && idx < 5) document.getElementById(`otp-${idx+1}`).focus();
        });
        box.addEventListener('keydown', e => {
            if (e.key === 'Backspace' && !e.target.value && idx > 0) document.getElementById(`otp-${idx-1}`).focus();
        });
    });
    // Cart
    document.getElementById('cart-toggle-btn').addEventListener('click', openCartDrawer);
    document.getElementById('cart-close-btn').addEventListener('click', closeCartDrawer);
    document.getElementById('cart-drawer-overlay').addEventListener('click', closeCartDrawer);
    // Checkout form
    document.getElementById('checkout-form').addEventListener('submit', handleCheckoutSubmit);
    // Coupon
    document.getElementById('apply-coupon-btn').addEventListener('click', applyCoupon);
    document.getElementById('coupon-code-input').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); } });
    // Payment modal
    document.getElementById('payment-close-btn').addEventListener('click', () => hideModal('payment-modal'));
    // Product detail modal
    document.getElementById('product-detail-close-btn').addEventListener('click', () => hideModal('product-detail-modal'));
    // Tracking modal
    document.getElementById('tracking-close-btn').addEventListener('click', () => { hideModal('tracking-modal'); stopTrackingPolling(); });
    // Owner form
    document.getElementById('add-menu-form').addEventListener('submit', handleAddMenuItem);
    document.getElementById('tab-owner-orders').addEventListener('click', () => switchOwnerTab('orders'));
    document.getElementById('tab-owner-menu').addEventListener('click', () => switchOwnerTab('menu'));
    document.getElementById('owner-restaurant-select').addEventListener('change', e => loadOwnerOrders(e.target.value));
    // Customer tabs
    document.getElementById('tab-restaurants').addEventListener('click', () => { switchCustomerTab('restaurants'); renderFilteredRestaurants(); });
    document.getElementById('tab-orders').addEventListener('click', () => {
        if (!state.user) { showModal('auth-modal'); showToast('Sign in to view your orders.', 'info'); return; }
        switchCustomerTab('orders'); loadCustomerOrders();
    });
    // Wishlist modal
    document.getElementById('wishlist-toggle-btn').addEventListener('click', showWishlistModal);
    document.getElementById('wishlist-modal-close').addEventListener('click', () => hideModal('wishlist-modal'));
    // Location modal
    document.getElementById('location-selector-btn').addEventListener('click', () => showModal('location-modal'));
    document.getElementById('location-modal-close').addEventListener('click', () => hideModal('location-modal'));
    document.getElementById('set-location-btn').addEventListener('click', confirmLocationChange);
    // Info modal
    document.getElementById('info-modal-close').addEventListener('click', () => hideModal('info-modal'));
    // Hero search
    document.getElementById('hero-search-btn').addEventListener('click', handleHeroSearch);
    document.getElementById('hero-search-input').addEventListener('keydown', e => { if (e.key === 'Enter') handleHeroSearch(); });
    document.getElementById('hero-search-input').addEventListener('input', e => handleHeroSearchSuggestions(e.target.value));
    // Header search
    const headerInput = document.getElementById('header-search-input');
    headerInput.addEventListener('input', e => handleHeaderSearchSuggestions(e.target.value));
    headerInput.addEventListener('keydown', e => { if (e.key === 'Enter') { navigateTo('customer'); renderFilteredRestaurants(e.target.value); } });
    // Customer search
    const custSearch = document.getElementById('restaurant-search');
    custSearch.addEventListener('input', e => { handleCustomerSearchSuggestions(e.target.value); renderFilteredRestaurants(e.target.value); });
    // Close suggestions on outside click
    document.addEventListener('click', e => {
        if (!e.target.closest('.header-search') && !e.target.closest('#hero-search-input')) {
            document.querySelectorAll('.search-suggestions-box').forEach(el => el.classList.remove('active'));
        }
    });
}

// =====================================================
// NAVIGATION
// =====================================================
function navigateTo(view) {
    document.querySelectorAll('.view-section').forEach(s => s.style.display = 'none');
    const el = document.getElementById(`${view}-view`);
    if (el) el.style.display = 'block';
    state.activeView = view;
    window.scrollTo(0, 0);

    if (view === 'landing') {
        renderLandingRestaurants();
        renderFeaturedItems();
    } else if (view === 'customer') {
        renderFilteredRestaurants();
    } else if (view === 'owner') {
        loadOwnerRestaurants();
    } else if (view === 'driver') {
        loadDriverTasks();
    }
    updateNavigation();
}

function loadViewBasedOnState() {
    if (!state.user) { navigateTo('landing'); return; }
    const roleMap = { CUSTOMER: 'customer', OWNER: 'owner', DRIVER: 'driver' };
    navigateTo(roleMap[state.user.role] || 'landing');
}

function updateNavigation() {
    const nav = document.getElementById('main-nav');
    const profile = document.getElementById('profile-badge');
    const loginBtn = document.getElementById('login-nav-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const cartBtn = document.getElementById('cart-toggle-btn');
    const wishBtn = document.getElementById('wishlist-toggle-btn');
    const guestBar = document.getElementById('guest-cart-info');

    if (state.user) {
        guestBar.style.display = 'none';
        profile.style.display = 'flex';
        document.getElementById('user-display-name').textContent = state.user.name;
        document.getElementById('user-display-role').textContent = state.user.role;
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-flex';

        if (state.user.role === 'CUSTOMER') {
            wishBtn.style.display = 'flex'; cartBtn.style.display = 'flex';
            nav.innerHTML = `
                <a href="#" class="nav-link" onclick="navigateTo('customer')"><i class="fa-solid fa-utensils"></i> Browse</a>
                <a href="#" class="nav-link" onclick="navigateTo('customer');switchCustomerTab('orders');loadCustomerOrders()"><i class="fa-solid fa-receipt"></i> Orders</a>
            `;
            document.querySelector('.customer-name') && (document.querySelector('.customer-name').textContent = state.user.name);
        } else if (state.user.role === 'OWNER') {
            wishBtn.style.display = 'none'; cartBtn.style.display = 'none';
            nav.innerHTML = `<span class="nav-link active"><i class="fa-solid fa-store"></i> Management Hub</span>`;
        } else if (state.user.role === 'DRIVER') {
            wishBtn.style.display = 'none'; cartBtn.style.display = 'none';
            nav.innerHTML = `<span class="nav-link active"><i class="fa-solid fa-motorcycle"></i> Courier Portal</span>`;
        }
    } else {
        guestBar.style.display = 'flex';
        profile.style.display = 'none';
        loginBtn.style.display = 'inline-flex';
        logoutBtn.style.display = 'none';
        cartBtn.style.display = 'flex';
        wishBtn.style.display = 'flex';
        nav.innerHTML = `
            <a href="#" class="nav-link" onclick="navigateTo('customer')"><i class="fa-solid fa-utensils"></i> Explore</a>
            <a href="#" class="nav-link" onclick="document.querySelector('.platform-info-section').scrollIntoView({behavior:'smooth'})"><i class="fa-solid fa-circle-info"></i> About</a>
        `;
    }
    updateCartBadge();
}

// =====================================================
// AUTH - PHONE OTP
// =====================================================
async function checkAuth() {
    try {
        const res = await fetch(`${API_BASE}/auth/me`);
        if (res.ok) state.user = await res.json();
        else state.user = null;
    } catch { state.user = null; }
}

let tempSentOtp = null;

async function handlePhoneSubmit(e) {
    e.preventDefault();
    const phone = document.getElementById('login-phone-number').value.trim();
    if (!phone || phone.length < 10 || !/^\d+$/.test(phone)) { showToast('Enter a valid 10-digit mobile number.', 'error'); return; }
    const btn = document.getElementById('send-otp-btn');
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
    try {
        const res = await fetch(`${API_BASE}/auth/send-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) });
        if (res.ok) {
            const data = await res.json();
            tempSentOtp = data.otp;
            document.getElementById('otp-stage-phone').style.display = 'none';
            document.getElementById('otp-stage-verify').style.display = 'block';
            document.getElementById('otp-sent-number').textContent = phone;
            document.getElementById('simulated-otp-display').innerHTML = `Simulated OTP: <strong>${tempSentOtp}</strong>`;
            document.getElementById('otp-0').focus();
            showToast('OTP sent successfully!', 'success');
        } else showToast('Failed to send OTP.', 'error');
    } catch { showToast('Network error.', 'error'); }
    btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Get OTP';
}

async function handleVerifyOtpClick() {
    const phone = document.getElementById('login-phone-number').value.trim();
    const code = Array.from({length: 6}, (_, i) => document.getElementById(`otp-${i}`).value).join('');
    if (code.length !== 6) { showToast('Enter the 6-digit OTP.', 'error'); return; }
    const btn = document.getElementById('verify-otp-btn');
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';
    try {
        const res = await fetch(`${API_BASE}/auth/verify-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, otp: code }) });
        if (res.ok) {
            state.user = await res.json();
            hideModal('auth-modal');
            handleBackToPhone();
            showToast(`Welcome, ${state.user.name || 'User'}! 🎉`, 'success');
            if (state.checkoutIntent) resumeCheckoutFlow();
            else loadViewBasedOnState();
        } else { const t = await res.text(); showToast(t || 'Invalid OTP!', 'error'); }
    } catch { showToast('Network error.', 'error'); }
    btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Verify & Login';
}

function handleBackToPhone(e) {
    if (e) e.preventDefault();
    document.getElementById('otp-stage-phone').style.display = 'block';
    document.getElementById('otp-stage-verify').style.display = 'none';
    Array.from({length: 6}, (_, i) => { document.getElementById(`otp-${i}`).value = ''; });
    tempSentOtp = null;
}

function handleResendOtp(e) {
    e.preventDefault();
    document.getElementById('otp-stage-phone').style.display = 'block';
    document.getElementById('otp-stage-verify').style.display = 'none';
    showToast('Enter your number again to resend.', 'info');
}

async function logout() {
    try { await fetch(`${API_BASE}/auth/logout`, { method: 'POST' }); } catch {}
    state.user = null; state.cart = [];
    updateCartBadge();
    navigateTo('landing');
    showToast('Logged out successfully.', 'info');
}

function showAuthForm() {
    handleBackToPhone();
    document.getElementById('auth-modal-title').textContent = 'Login / Sign Up';
}

// =====================================================
// DATA LOADING
// =====================================================
async function loadAllRestaurantsData() {
    try {
        const res = await fetch(`${API_BASE}/restaurants`);
        if (res.ok) {
            state.restaurants = await res.json();
            renderLandingRestaurants();
            renderFeaturedItems();
        }
    } catch { console.error('Failed to load restaurants'); }
}

async function loadMenuItems(restaurantId) {
    try {
        const res = await fetch(`${API_BASE}/restaurants/${restaurantId}/menu`);
        if (res.ok) {
            state.menuItems = await res.json();
            return state.menuItems;
        }
    } catch {}
    return [];
}

// =====================================================
// LANDING PAGE RENDERING
// =====================================================
function renderLandingRestaurants(query = '', category = 'All') {
    const grid = document.getElementById('landing-restaurant-grid');
    if (!grid) return;
    let restaurants = state.restaurants;

    // Apply filters
    if (state.activeFilters.veg) restaurants = restaurants.filter(r => r.cuisine.toLowerCase().includes('veg') || r.cuisine.toLowerCase().includes('south'));
    if (state.activeFilters.rating) restaurants = restaurants.filter(r => r.rating >= 4.0);
    if (state.activeFilters.fast) restaurants = restaurants.filter(r => r.deliveryTime <= 30);
    if (state.activeFilters.offers) restaurants = restaurants.filter(r => r.offers && r.offers.trim().length > 0);
    if (query) {
        const q = query.toLowerCase();
        restaurants = restaurants.filter(r => r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q));
    }

    const count = document.getElementById('restaurants-count');
    if (count) count.textContent = `${restaurants.length} restaurant${restaurants.length !== 1 ? 's' : ''} found`;

    if (restaurants.length === 0) { grid.innerHTML = `<div class="empty-state"><i class="fa-solid fa-magnifying-glass" style="font-size:2rem;margin-bottom:0.5rem;"></i><br>No restaurants found. Try a different search.</div>`; return; }

    grid.innerHTML = restaurants.map(r => renderRestaurantCard(r)).join('');
    attachRestaurantCardListeners(grid);
}

function renderRestaurantCard(r) {
    const stars = renderStarRating(r.rating);
    return `
        <div class="restaurant-card" data-id="${r.id}">
            <div class="restaurant-card-img-wrap">
                <img src="${r.imageUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400'}" alt="${r.name}" class="restaurant-card-img" loading="lazy">
                ${r.offers ? `<div class="restaurant-offer-tag"><i class="fa-solid fa-tag"></i> ${r.offers}</div>` : ''}
                ${!r.isOpen ? `<div class="restaurant-closed-overlay">CLOSED</div>` : ''}
            </div>
            <div class="restaurant-card-body">
                <div class="restaurant-card-name">${r.name}</div>
                <div class="restaurant-card-cuisine">${r.cuisine}</div>
                <div class="restaurant-card-meta">
                    <span class="rating">${r.rating?.toFixed(1) || '4.0'} ★</span>
                    <span class="dot">·</span>
                    <span><i class="fa-solid fa-clock"></i> ${r.deliveryTime || 30} min</span>
                    <span class="dot">·</span>
                    <span>₹${r.deliveryFee || 20} delivery</span>
                </div>
            </div>
        </div>
    `;
}

function attachRestaurantCardListeners(container) {
    container.querySelectorAll('.restaurant-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id);
            const rest = state.restaurants.find(r => r.id === id);
            if (rest) openRestaurantMenu(rest);
        });
    });
}

function renderStarRating(rating) {
    const full = Math.floor(rating || 4);
    return Array.from({length: 5}, (_, i) => `<i class="fa-${i < full ? 'solid' : 'regular'} fa-star" style="color:${i < full ? 'var(--warning)' : 'var(--border)'}"></i>`).join('');
}

async function renderFeaturedItems() {
    const grid = document.getElementById('featured-items-grid');
    if (!grid || state.restaurants.length === 0) return;

    // Load items from a few restaurants
    const featured = [];
    for (const rest of state.restaurants.slice(0, 4)) {
        const items = await loadMenuItems(rest.id);
        items.slice(0, 3).forEach(item => { item._restaurantName = rest.name; featured.push(item); });
        if (featured.length >= 12) break;
    }
    // Store all for later
    state.allMenuItems = featured;

    grid.innerHTML = featured.map(item => renderFoodCard(item)).join('');
    attachFoodCardListeners(grid);
}

function renderFoodCard(item, restaurantName = '') {
    const name = restaurantName || item._restaurantName || (item.restaurant?.name) || '';
    const inWishlist = state.wishlist.includes(item.id);
    return `
        <div class="food-card" data-id="${item.id}">
            <div class="food-card-img-wrap">
                <div class="veg-indicator ${item.isVeg ? 'veg' : 'nonveg'}">
                    <i class="fa-solid fa-circle" style="font-size:0.45rem;"></i>
                </div>
                <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300'}" alt="${item.name}" class="food-card-img" loading="lazy">
                <button class="wishlist-heart-btn ${inWishlist ? 'favorited' : ''}" data-id="${item.id}" onclick="toggleWishlistItem(${item.id}, event)">
                    <i class="fa-${inWishlist ? 'solid' : 'regular'} fa-heart"></i>
                </button>
            </div>
            <div class="food-card-body">
                <div class="food-card-name">${item.name}</div>
                <div class="food-card-rest">${name}</div>
                <div class="food-card-footer">
                    <span class="food-card-price">₹${item.price?.toFixed(0)}</span>
                    <button class="add-to-cart-btn" onclick="event.stopPropagation();addToCart(${item.id})" title="Add to Cart">+</button>
                </div>
                <div class="food-card-rating"><i class="fa-solid fa-star"></i> ${item.rating?.toFixed(1) || '4.2'} · ${item.prepTime || 20} min</div>
            </div>
        </div>
    `;
}

function attachFoodCardListeners(container) {
    container.querySelectorAll('.food-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id);
            const item = findMenuItemById(id);
            if (item) openProductDetail(item);
        });
    });
}

function findMenuItemById(id) {
    for (const list of [state.menuItems, state.allMenuItems]) {
        const item = list.find(i => i.id === id);
        if (item) return item;
    }
    return null;
}

// =====================================================
// FILTERS & CATEGORIES
// =====================================================
function filterByCategory(cat) {
    state.activeCategory = cat;
    document.querySelectorAll('#category-strip .cat-pill').forEach(p => p.classList.toggle('active', p.dataset.cat === cat));
    renderLandingRestaurants(document.getElementById('hero-search-input')?.value || '');
}

function customerFilterByCategory(cat) {
    state.customerCategory = cat;
    document.querySelectorAll('#customer-category-strip .cat-pill').forEach(p => p.classList.toggle('active', p.dataset.cat === cat));
    renderFilteredRestaurants(document.getElementById('restaurant-search')?.value || '');
}

function toggleFilter(key) {
    state.activeFilters[key] = !state.activeFilters[key];
    document.getElementById(`filter-${key}`).classList.toggle('active', state.activeFilters[key]);
    renderLandingRestaurants(document.getElementById('hero-search-input')?.value || '');
}

function toggleCustomerFilter(key) {
    state.customerFilters[key] = !state.customerFilters[key];
    document.getElementById(`c-filter-${key}`).classList.toggle('active', state.customerFilters[key]);
    renderFilteredRestaurants(document.getElementById('restaurant-search')?.value || '');
}

function sortRestaurants(type) {
    if (type === 'popular') state.restaurants.sort((a, b) => (b.reviewsCount || 0) - (a.reviewsCount || 0));
    if (type === 'price') state.restaurants.sort((a, b) => (a.deliveryFee || 0) - (b.deliveryFee || 0));
    renderLandingRestaurants();
}

// =====================================================
// CUSTOMER VIEW
// =====================================================
function renderFilteredRestaurants(query = '') {
    const grid = document.getElementById('restaurant-list');
    if (!grid) return;
    let restaurants = [...state.restaurants];
    const f = state.customerFilters;
    if (f.rating) restaurants = restaurants.filter(r => r.rating >= 4.0);
    if (f.fast) restaurants = restaurants.filter(r => r.deliveryTime <= 30);
    if (f.offers) restaurants = restaurants.filter(r => r.offers && r.offers.trim());
    if (query) { const q = query.toLowerCase(); restaurants = restaurants.filter(r => r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q)); }
    if (restaurants.length === 0) { grid.innerHTML = `<div class="empty-state">No restaurants match your filters.</div>`; return; }
    grid.innerHTML = restaurants.map(r => renderRestaurantCard(r)).join('');
    attachRestaurantCardListeners(grid);
}

function switchCustomerTab(tab) {
    ['restaurants', 'orders'].forEach(t => {
        document.getElementById(`panel-${t}`).style.display = t === tab ? 'block' : 'none';
        document.getElementById(`tab-${t}`).classList.toggle('active', t === tab);
    });
}

// =====================================================
// RESTAURANT MENU VIEW
// =====================================================
async function openRestaurantMenu(restaurant) {
    state.selectedRestaurant = restaurant;
    navigateToMenuView(restaurant);
    const items = await loadMenuItems(restaurant.id);
    renderMenuItems(items);
    buildMenuCategoryNav(items);
    updateSidebarCart();
}

function navigateToMenuView(restaurant) {
    document.querySelectorAll('.view-section').forEach(s => s.style.display = 'none');
    document.getElementById('menu-view').style.display = 'block';
    state.activeView = 'menu';
    window.scrollTo(0, 0);

    // Hero banner
    const banner = document.getElementById('restaurant-hero-banner');
    if (restaurant.imageUrl) banner.style.backgroundImage = `url('${restaurant.imageUrl}')`;

    document.getElementById('menu-restaurant-name').textContent = restaurant.name;
    document.getElementById('menu-restaurant-cuisine').textContent = restaurant.cuisine;
    document.getElementById('menu-restaurant-rating').textContent = restaurant.rating?.toFixed(1) || '4.5';
    document.getElementById('menu-restaurant-time').textContent = restaurant.deliveryTime || 30;
    document.getElementById('menu-restaurant-fee').textContent = restaurant.deliveryFee?.toFixed(0) || '20';
    document.getElementById('menu-restaurant-offer').textContent = restaurant.offers || '';
    document.getElementById('menu-restaurant-address').textContent = restaurant.address;
}

function buildMenuCategoryNav(items) {
    const categories = ['All', ...new Set(items.map(i => i.category))];
    const nav = document.getElementById('menu-category-nav');
    nav.innerHTML = categories.map(cat =>
        `<button class="cat-pill ${cat === 'All' ? 'active' : ''}" data-cat="${cat}" onclick="filterMenuItems('${cat}')">${cat}</button>`
    ).join('');
}

function filterMenuItems(cat) {
    document.querySelectorAll('#menu-category-nav .cat-pill').forEach(p => p.classList.toggle('active', p.dataset.cat === cat));
    const filtered = cat === 'All' ? state.menuItems : state.menuItems.filter(i => i.category === cat);
    renderMenuItems(filtered);
}

function renderMenuItems(items) {
    const grid = document.getElementById('menu-items-grid');
    if (items.length === 0) { grid.innerHTML = `<div class="empty-state">No items in this category.</div>`; return; }
    grid.innerHTML = items.map(item => renderMenuItemCard(item)).join('');
    grid.querySelectorAll('.menu-item-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id);
            const item = state.menuItems.find(i => i.id === id);
            if (item) openProductDetail(item);
        });
    });
}

function renderMenuItemCard(item) {
    const cartItem = state.cart.find(c => c.menuItemId === item.id);
    const qty = cartItem ? cartItem.quantity : 0;
    const inWishlist = state.wishlist.includes(item.id);
    return `
        <div class="menu-item-card" data-id="${item.id}">
            <div class="food-card-img-wrap">
                <div class="veg-indicator ${item.isVeg ? 'veg' : 'nonveg'}"><i class="fa-solid fa-circle" style="font-size:.45rem;"></i></div>
                <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400'}" alt="${item.name}" class="menu-item-img" loading="lazy">
                <button class="wishlist-heart-btn ${inWishlist ? 'favorited' : ''}" data-id="${item.id}" onclick="toggleWishlistItem(${item.id}, event)">
                    <i class="fa-${inWishlist ? 'solid' : 'regular'} fa-heart"></i>
                </button>
            </div>
            <div class="menu-item-body">
                <div class="menu-item-name">${item.name}</div>
                <div class="menu-item-desc">${item.description || ''}</div>
                <div class="menu-item-footer">
                    <span class="menu-item-price">₹${item.price?.toFixed(0)}</span>
                    ${qty === 0 ?
                        `<div class="add-btn" onclick="event.stopPropagation();addToCart(${item.id})"><span class="add-btn-inner">ADD</span></div>` :
                        `<div class="qty-controls" onclick="event.stopPropagation()">
                            <button class="qty-btn" onclick="removeFromCart(${item.id})">−</button>
                            <span class="qty-display">${qty}</span>
                            <button class="qty-btn" onclick="addToCart(${item.id})">+</button>
                        </div>`
                    }
                </div>
                <div class="food-card-rating"><i class="fa-solid fa-star"></i> ${item.rating?.toFixed(1) || '4.2'} · ${item.prepTime || 20} min</div>
            </div>
        </div>
    `;
}

// =====================================================
// PRODUCT DETAIL MODAL
// =====================================================
function openProductDetail(item) {
    state.currentProductDetail = item;
    state.productDetailQty = state.cart.find(c => c.menuItemId === item.id)?.quantity || 1;
    const body = document.getElementById('product-detail-body');
    const restName = item.restaurant?.name || item._restaurantName || state.selectedRestaurant?.name || '';
    const inWishlist = state.wishlist.includes(item.id);

    // Spice level
    const spiceLevels = { 'None': 0, 'Mild': 1, 'Medium': 2, 'Hot': 3, 'Very Hot': 4 };
    const spiceCount = spiceLevels[item.spiceLevel || 'Medium'] || 2;
    const spiceDots = Array.from({length: 4}, (_, i) => `<div class="spice-dot ${i < spiceCount ? 'active' : ''}"></div>`).join('');

    // Mock reviews
    const mockReviews = [
        { name: 'Priya K.', stars: 5, text: 'Absolutely delicious! Authentic taste, exactly like homemade.' },
        { name: 'Ravi M.', stars: 4, text: 'Great quality and quick delivery. Will order again!' },
        { name: 'Kavya S.', stars: 5, text: 'Best dish I\'ve had from this restaurant. Perfectly spiced.' }
    ];

    body.innerHTML = `
        <div class="product-gallery" style="padding:1.5rem 0 1.5rem 1.5rem;">
            <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600'}"
                alt="${item.name}" class="product-main-img" id="product-main-img">
            <div class="product-thumbnails">
                <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200'}" class="product-thumb active" onclick="switchProductImage(this.src)">
                <img src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200" class="product-thumb" onclick="switchProductImage(this.src)">
                <img src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200" class="product-thumb" onclick="switchProductImage(this.src)">
            </div>
        </div>

        <div class="product-info" style="padding:1.5rem 1.5rem 1.5rem 0;">
            <div class="product-veg-badge">
                <div class="veg-indicator ${item.isVeg ? 'veg' : 'nonveg'}" style="position:static;"><i class="fa-solid fa-circle" style="font-size:.5rem;"></i></div>
                <span style="font-size:.8rem;font-weight:600;color:${item.isVeg ? 'var(--accent)' : 'var(--accent-nonveg)'};">${item.isVeg ? 'Pure Vegetarian' : 'Non-Vegetarian'}</span>
            </div>
            <div class="product-name">${item.name}</div>
            <div class="product-restaurant"><i class="fa-solid fa-store"></i> ${restName}</div>

            <div class="product-meta-badges">
                <span class="product-meta-badge"><i class="fa-solid fa-star" style="color:var(--warning)"></i> ${item.rating?.toFixed(1) || '4.2'} (${item.reviewsCount || 120}+ ratings)</span>
                <span class="product-meta-badge"><i class="fa-solid fa-clock"></i> ${item.prepTime || 20} min prep</span>
                <span class="product-meta-badge"><i class="fa-solid fa-truck-fast"></i> ${state.selectedRestaurant?.deliveryTime || 30} min delivery</span>
                <span class="product-meta-badge" style="background:var(--primary-light);color:var(--primary);">${item.region || 'Traditional'}</span>
            </div>

            <p class="product-desc">${item.description || 'A delicious dish prepared with fresh, high-quality ingredients using traditional recipes.'}</p>

            <div>
                <div class="product-section-title">Spice Level</div>
                <div style="display:flex;align-items:center;gap:0.6rem;">
                    <div class="spice-meter">${spiceDots}</div>
                    <span style="font-size:.8rem;color:var(--text-muted);">${item.spiceLevel || 'Medium'}</span>
                </div>
            </div>

            <div>
                <div class="product-section-title">Nutrition (per serving)</div>
                <div class="nutrition-grid">
                    <div class="nutrition-pill"><strong>${item.calories || 350}</strong> kcal</div>
                    <div class="nutrition-pill"><strong>${item.protein || 12}g</strong> protein</div>
                    <div class="nutrition-pill"><strong>${item.carbs || 45}g</strong> carbs</div>
                    <div class="nutrition-pill"><strong>${item.fat || 12}g</strong> fat</div>
                </div>
            </div>

            ${item.ingredients ? `<div><div class="product-section-title">Ingredients</div><p style="font-size:.82rem;color:var(--text-side);">${item.ingredients}</p></div>` : ''}

            <div class="product-price-row">
                <div class="product-price">₹${item.price?.toFixed(0)}</div>
                <div class="product-qty-selector">
                    <button class="product-qty-btn" onclick="changeProductQty(-1)">−</button>
                    <span class="product-qty-num" id="product-detail-qty">${state.productDetailQty}</span>
                    <button class="product-qty-btn" onclick="changeProductQty(1)">+</button>
                </div>
            </div>

            <div class="product-actions">
                <button class="btn btn-primary" onclick="addProductToCartAndClose()">
                    <i class="fa-solid fa-bag-shopping"></i> Add to Cart — ₹${(item.price * state.productDetailQty).toFixed(0)}
                </button>
                <button class="btn btn-outline" onclick="buyNowFromDetail()">
                    <i class="fa-solid fa-bolt"></i> Buy Now
                </button>
                <button class="wishlist-btn-product ${inWishlist ? 'favorited' : ''}" data-id="${item.id}" onclick="toggleWishlistItem(${item.id}, event)">
                    <i class="fa-${inWishlist ? 'solid' : 'regular'} fa-heart"></i>
                </button>
            </div>

            <div>
                <div class="product-section-title">Customer Reviews</div>
                <div class="reviews-list">
                    ${mockReviews.map(r => `
                        <div class="review-card">
                            <div class="review-header">
                                <span class="review-name">${r.name}</span>
                                <span class="review-stars">${Array.from({length: r.stars}, () => '⭐').join('')}</span>
                            </div>
                            <div class="review-text">${r.text}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    showModal('product-detail-modal');
}

function switchProductImage(src) {
    document.getElementById('product-main-img').src = src;
    document.querySelectorAll('.product-thumb').forEach(t => t.classList.toggle('active', t.src === src));
}

function changeProductQty(delta) {
    state.productDetailQty = Math.max(1, state.productDetailQty + delta);
    const qtyEl = document.getElementById('product-detail-qty');
    if (qtyEl) qtyEl.textContent = state.productDetailQty;
    // Update add to cart button price
    if (state.currentProductDetail) {
        const btn = document.querySelector('.product-actions .btn-primary');
        if (btn) btn.innerHTML = `<i class="fa-solid fa-bag-shopping"></i> Add to Cart — ₹${(state.currentProductDetail.price * state.productDetailQty).toFixed(0)}`;
    }
}

function addProductToCartAndClose() {
    if (!state.currentProductDetail) return;
    for (let i = 0; i < state.productDetailQty; i++) addToCart(state.currentProductDetail.id);
    hideModal('product-detail-modal');
}

function buyNowFromDetail() {
    if (!state.currentProductDetail) return;
    addToCart(state.currentProductDetail.id);
    hideModal('product-detail-modal');
    openCartDrawer();
}

// =====================================================
// CART MANAGEMENT
// =====================================================
function addToCart(menuItemId) {
    const item = findMenuItemById(menuItemId) || state.menuItems.find(i => i.id === menuItemId);
    if (!item) { showToast('Item not found.', 'error'); return; }

    const existing = state.cart.find(c => c.menuItemId === menuItemId);
    if (existing) { existing.quantity++; }
    else {
        state.cart.push({
            menuItemId, name: item.name, price: item.price, quantity: 1,
            imageUrl: item.imageUrl, isVeg: item.isVeg,
            restaurantId: item.restaurant?.id || state.selectedRestaurant?.id
        });
    }
    updateCartBadge();
    updateSidebarCart();
    // Re-render menu cards if in menu view
    if (state.activeView === 'menu') renderMenuItems(state.menuItems);
    showToast(`${item.name} added!`, 'success');
}

function removeFromCart(menuItemId) {
    const idx = state.cart.findIndex(c => c.menuItemId === menuItemId);
    if (idx === -1) return;
    if (state.cart[idx].quantity > 1) state.cart[idx].quantity--;
    else state.cart.splice(idx, 1);
    updateCartBadge();
    updateSidebarCart();
    if (state.activeView === 'menu') renderMenuItems(state.menuItems);
    renderCartDrawer();
}

function removeCartItem(menuItemId) {
    state.cart = state.cart.filter(c => c.menuItemId !== menuItemId);
    updateCartBadge();
    updateSidebarCart();
    renderCartDrawer();
    if (state.activeView === 'menu') renderMenuItems(state.menuItems);
}

function updateCartBadge() {
    const total = state.cart.reduce((s, c) => s + c.quantity, 0);
    document.getElementById('cart-badge').textContent = total;
}

function updateSidebarCart() {
    const sidebar = document.getElementById('sidebar-cart-items');
    const totalEl = document.getElementById('sidebar-cart-total');
    if (!sidebar) return;
    if (state.cart.length === 0) { sidebar.innerHTML = '<p class="text-muted" style="font-size:.85rem;">Add items to get started</p>'; if (totalEl) totalEl.style.display = 'none'; return; }
    sidebar.innerHTML = state.cart.map(c => `<div style="display:flex;justify-content:space-between;font-size:.82rem;padding:.2rem 0;"><span>${c.name} x${c.quantity}</span><span>₹${(c.price*c.quantity).toFixed(0)}</span></div>`).join('');
    const sub = state.cart.reduce((s, c) => s + c.price * c.quantity, 0);
    if (document.getElementById('sidebar-subtotal')) document.getElementById('sidebar-subtotal').textContent = `₹${sub.toFixed(0)}`;
    if (totalEl) totalEl.style.display = 'block';
}

function openCartDrawer() {
    document.getElementById('cart-drawer').classList.add('active');
    document.getElementById('cart-drawer-overlay').classList.add('active');
    renderCartDrawer();
}

function closeCartDrawer() {
    document.getElementById('cart-drawer').classList.remove('active');
    document.getElementById('cart-drawer-overlay').classList.remove('active');
}

function renderCartDrawer() {
    const container = document.getElementById('cart-items-container');
    const emptyEl = document.getElementById('cart-empty');
    const footer = document.getElementById('cart-footer');
    const guestNote = document.getElementById('guest-cart-note');

    if (state.cart.length === 0) {
        container.innerHTML = '';
        if (emptyEl) emptyEl.style.display = 'flex';
        if (footer) footer.style.display = 'none';
        if (guestNote) guestNote.style.display = 'none';
        return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (footer) footer.style.display = 'block';
    if (guestNote) guestNote.style.display = !state.user ? 'flex' : 'none';

    container.innerHTML = state.cart.map(item => `
        <div class="cart-item-row">
            <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=100'}" alt="${item.name}" class="cart-item-img">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">₹${item.price.toFixed(0)} each</div>
            </div>
            <div class="cart-item-controls">
                <button class="cart-qty-btn" onclick="removeFromCart(${item.menuItemId})">−</button>
                <span class="cart-qty-num">${item.quantity}</span>
                <button class="cart-qty-btn" onclick="addToCart(${item.menuItemId})">+</button>
                <button class="cart-remove-btn" onclick="removeCartItem(${item.menuItemId})" title="Remove"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join('');

    updateCartPriceBreakdown();
}

function updateCartPriceBreakdown() {
    const itemTotal = state.cart.reduce((s, c) => s + c.price * c.quantity, 0);
    const deliveryCharge = itemTotal >= 299 ? 0 : 30;
    const gst = itemTotal * 0.05;
    const platformFee = 2;
    let discount = 0;

    if (state.appliedCoupon) {
        const coupon = COUPONS[state.appliedCoupon];
        if (coupon.discount) discount = Math.min(itemTotal * coupon.discount, coupon.maxDiscount || Infinity);
        else if (coupon.flat && itemTotal >= (coupon.minOrder || 0)) discount = coupon.flat;
    }

    const grand = Math.max(0, itemTotal + deliveryCharge + gst + platformFee - discount);

    document.getElementById('cart-item-total').textContent = `₹${itemTotal.toFixed(0)}`;
    document.getElementById('cart-delivery-charge').textContent = deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`;
    document.getElementById('cart-gst').textContent = `₹${gst.toFixed(0)}`;
    document.getElementById('cart-platform-fee').textContent = `₹${platformFee}`;
    document.getElementById('cart-grand-total').textContent = `₹${grand.toFixed(0)}`;

    const discountRow = document.getElementById('cart-discount-row');
    if (discount > 0) {
        discountRow.style.display = 'flex';
        document.getElementById('cart-discount-amount').textContent = `-₹${discount.toFixed(0)}`;
    } else discountRow.style.display = 'none';

    return grand;
}

function applyCoupon() {
    const code = document.getElementById('coupon-code-input').value.trim().toUpperCase();
    const msgEl = document.getElementById('coupon-message');
    if (!code) { msgEl.innerHTML = '<span class="coupon-error">Enter a coupon code.</span>'; return; }
    if (COUPONS[code]) {
        state.appliedCoupon = code;
        msgEl.innerHTML = `<span class="coupon-success"><i class="fa-solid fa-check"></i> ${COUPONS[code].label} applied!</span>`;
        updateCartPriceBreakdown();
        showToast('Coupon applied!', 'success');
    } else {
        state.appliedCoupon = null;
        msgEl.innerHTML = '<span class="coupon-error"><i class="fa-solid fa-xmark"></i> Invalid coupon code.</span>';
    }
}

// =====================================================
// CHECKOUT
// =====================================================
function handleCheckoutSubmit(e) {
    e.preventDefault();
    const address = document.getElementById('checkout-address').value;
    const phone = document.getElementById('checkout-phone').value;

    if (!state.user) {
        state.checkoutIntent = { address, phone };
        closeCartDrawer();
        showModal('auth-modal');
        showToast('Sign in to complete your order!', 'info');
        return;
    }
    showPaymentGateway();
}

function resumeCheckoutFlow() {
    if (!state.checkoutIntent) return;
    document.getElementById('checkout-address').value = state.checkoutIntent.address || '';
    document.getElementById('checkout-phone').value = state.checkoutIntent.phone || '';
    state.checkoutIntent = null;
    showToast('Signed in! Resuming checkout...', 'success');
    setTimeout(() => showPaymentGateway(), 500);
}

function showPaymentGateway() {
    const grand = updateCartPriceBreakdown();
    document.getElementById('payment-modal-total').textContent = `₹${grand.toFixed(0)}`;
    closeCartDrawer();
    showModal('payment-modal');
}

function selectPaymentMethod(method) {
    state.selectedPaymentMethod = method;
    document.querySelectorAll('.pay-card-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`pay-${method}`)?.classList.add('active');
    document.querySelectorAll('.payment-panel').forEach(p => p.style.display = 'none');
    const panelMap = { upi: 'panel-upi', gpay: 'panel-upi', phonepe: 'panel-upi', paytm: 'panel-upi', card: 'panel-card', cod: 'panel-cod' };
    const panelId = panelMap[method];
    if (panelId && document.getElementById(panelId)) document.getElementById(panelId).style.display = 'block';
}

async function handlePaymentConfirm() {
    const btn = document.getElementById('pay-execute-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Payment...';

    await new Promise(r => setTimeout(r, 1500));

    const address = document.getElementById('checkout-address').value;
    const phone = document.getElementById('checkout-phone').value;
    const grand = updateCartPriceBreakdown();

    const requestBody = {
        restaurantId: state.selectedRestaurant?.id || state.cart[0]?.restaurantId,
        deliveryAddress: address,
        phone: phone,
        totalAmount: grand,
        items: state.cart.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity }))
    };

    try {
        const res = await fetch(`${API_BASE}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
        if (res.ok) {
            const order = await res.json();
            hideModal('payment-modal');
            state.cart = [];
            state.appliedCoupon = null;
            updateCartBadge();
            updateSidebarCart();
            showToast('🎉 Order placed successfully!', 'success');
            setTimeout(() => { if (state.user) { navigateTo('customer'); switchCustomerTab('orders'); loadCustomerOrders(); } }, 800);
        } else showToast('Failed to place order. Try again.', 'error');
    } catch { showToast('Connection error during checkout.', 'error'); }

    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-lock"></i> Confirm & Place Order';
}

// =====================================================
// SEARCH & SUGGESTIONS
// =====================================================
function handleHeroSearch() {
    const q = document.getElementById('hero-search-input').value.trim();
    navigateTo('customer');
    renderFilteredRestaurants(q);
    document.getElementById('restaurant-search').value = q;
}

function handleHeroSearchSuggestions(query) {
    const box = document.getElementById('search-suggestions-box');
    if (!box) return;
    if (!query.trim()) { box.classList.remove('active'); return; }
    showSearchSuggestions(box, query);
}

function handleHeaderSearchSuggestions(query) {
    const boxes = document.querySelectorAll('.search-suggestions-box');
    if (!query.trim()) { boxes.forEach(b => b.classList.remove('active')); return; }
    // Header search box
    const box = document.getElementById('header-search-wrap')?.querySelector('.search-suggestions-box');
    if (box) showSearchSuggestions(box, query);
}

function handleCustomerSearchSuggestions(query) {
    const box = document.getElementById('customer-suggestions-box');
    if (!box) return;
    if (!query.trim()) { box.classList.remove('active'); return; }
    showSearchSuggestions(box, query);
}

function showSearchSuggestions(box, query) {
    const q = query.toLowerCase();
    const restSuggestions = state.restaurants.filter(r => r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q)).slice(0, 4);
    const itemSuggestions = state.allMenuItems.filter(i => i.name.toLowerCase().includes(q)).slice(0, 4);

    if (restSuggestions.length === 0 && itemSuggestions.length === 0) { box.classList.remove('active'); return; }

    box.innerHTML = [
        ...restSuggestions.map(r => `<div class="suggestion-item" onclick="openRestaurantMenu(${JSON.stringify(r).replace(/"/g, '&quot;')})">
            <i class="suggestion-icon fa-solid fa-store"></i>
            <div class="suggestion-text">${r.name}<div class="suggestion-sub">${r.cuisine}</div></div>
        </div>`),
        ...itemSuggestions.map(i => `<div class="suggestion-item" onclick="openProductDetail(${JSON.stringify({...i,_restaurantName:i._restaurantName||''}).replace(/"/g,'&quot;')})">
            <i class="suggestion-icon fa-solid fa-utensils"></i>
            <div class="suggestion-text">${i.name}<div class="suggestion-sub">₹${i.price?.toFixed(0)}</div></div>
        </div>`)
    ].join('');
    box.classList.add('active');
}

// =====================================================
// LOCATION
// =====================================================
function updateLocationDisplay() {
    const el = document.getElementById('location-display');
    if (el) el.textContent = state.location;
}

function setLocation(loc) {
    document.getElementById('location-input').value = loc;
}

function confirmLocationChange() {
    const val = document.getElementById('location-input').value.trim();
    if (val) {
        state.location = val;
        localStorage.setItem('userLocation', val);
        updateLocationDisplay();
        showToast(`Location set to ${val}`, 'success');
    }
    hideModal('location-modal');
}

// =====================================================
// WISHLIST MODAL
// =====================================================
function showWishlistModal() {
    const container = document.getElementById('wishlist-items-container');
    const wishItems = state.allMenuItems.filter(i => state.wishlist.includes(i.id)).concat(
        state.menuItems.filter(i => state.wishlist.includes(i.id) && !state.allMenuItems.find(a => a.id === i.id))
    );
    if (wishItems.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fa-regular fa-heart" style="font-size:2rem;margin-bottom:1rem;"></i><br>No favourites yet!</div>`;
    } else {
        container.innerHTML = wishItems.map(i => `
            <div class="cart-item-row">
                <img src="${i.imageUrl}" class="cart-item-img" alt="${i.name}">
                <div class="cart-item-info"><div class="cart-item-name">${i.name}</div><div class="cart-item-price">₹${i.price}</div></div>
                <button class="btn btn-primary btn-sm" onclick="addToCart(${i.id});showToast('Added to cart!','success')">Add</button>
            </div>
        `).join('');
    }
    showModal('wishlist-modal');
}

// =====================================================
// INFO MODAL (FAQ, About, Privacy etc)
// =====================================================
const infoContent = {
    about: { title: 'About QuickBite', body: `<p>QuickBite is Tamil Nadu's premier food delivery platform, founded in 2024 in Coimbatore. We connect food lovers with the best local restaurants and chains across the region.</p><p style="margin-top:1rem;">We serve 50+ cities across Tamil Nadu with 100+ restaurant partners and 500+ delivery executives.</p>` },
    faq: { title: 'Frequently Asked Questions', body: `<div style="display:flex;flex-direction:column;gap:1rem;"><div><strong>How do I track my order?</strong><p class="text-muted">Go to My Orders and click "Track" on your active order.</p></div><div><strong>What payment methods are accepted?</strong><p class="text-muted">UPI, Google Pay, PhonePe, Paytm, Credit/Debit Card, and Cash on Delivery.</p></div><div><strong>Can I cancel my order?</strong><p class="text-muted">Orders can be cancelled within 5 minutes of placing. Contact support for assistance.</p></div><div><strong>How long does delivery take?</strong><p class="text-muted">Average delivery time is 25-35 minutes depending on restaurant and location.</p></div></div>` },
    privacy: { title: 'Privacy Policy', body: `<p>We collect only the minimum necessary data (phone number, delivery address) to complete your order. We do not sell your personal data to third parties. All payment information is processed securely and never stored on our servers.</p>` },
    terms: { title: 'Terms & Conditions', body: `<p>By using QuickBite, you agree to our terms. Orders are fulfilled by independent restaurant partners. Prices may vary. QuickBite is not responsible for food quality issues but will assist with refund requests.</p>` },
    refund: { title: 'Refund Policy', body: `<p>Refunds are processed within 24-48 hours for cancelled orders. For quality issues, contact support within 1 hour of delivery with photos. Refunds are credited to your original payment method.</p>` },
    contact: { title: 'Contact Us', body: `<div style="display:flex;flex-direction:column;gap:0.8rem;"><div><i class="fa-solid fa-envelope text-primary"></i> quickbite@gmail.com</div><div><i class="fa-solid fa-phone text-primary"></i> +91 98765 43210</div><div><i class="fa-solid fa-location-dot text-primary"></i> 101 Avinashi Road, Coimbatore, TN 641018</div><div><i class="fa-brands fa-whatsapp text-primary"></i> +91 98765 43210 (WhatsApp)</div></div>` },
    careers: { title: 'Careers at QuickBite', body: `<p>We're hiring! Join our team as a Delivery Partner, Restaurant Partner Manager, or Software Engineer. Email your CV to careers@quickbite.com.</p>` },
    restaurants: { title: 'Partner With Us', body: `<p>List your restaurant on QuickBite and reach thousands of customers. Sign up at partner.quickbite.com or call +91 98765 43210.</p>` },
    help: { title: 'Help Center', body: `<p>For immediate assistance, call our 24/7 helpline: <strong>+91 98765 43210</strong><br>Or email: <strong>support@quickbite.com</strong></p>` }
};

function showInfoModal(type) {
    const content = infoContent[type] || { title: 'Information', body: '<p>Content coming soon.</p>' };
    document.getElementById('info-modal-title').textContent = content.title;
    document.getElementById('info-modal-body').innerHTML = content.body;
    showModal('info-modal');
}

// =====================================================
// ORDERS
// =====================================================
async function loadCustomerOrders() {
    try {
        const res = await fetch(`${API_BASE}/orders/customer`);
        if (res.ok) { const orders = await res.json(); renderCustomerOrders(orders); }
    } catch { showToast('Failed to load orders.', 'error'); }
}

function renderCustomerOrders(orders) {
    const list = document.getElementById('customer-orders-list');
    const badge = document.getElementById('active-orders-count');
    const activeCount = orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status)).length;
    if (badge) badge.textContent = activeCount;
    if (orders.length === 0) { list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-receipt" style="font-size:2rem;margin-bottom:0.5rem;"></i><br>No orders yet. Start ordering delicious food!</div>`; return; }
    list.innerHTML = orders.map(order => {
        let itemsHtml = order.items?.map(i => `<div class="order-history-items-row"><span>${i.menuItem?.name || 'Item'} <strong>x${i.quantity}</strong></span><span>₹${(i.price * i.quantity).toFixed(0)}</span></div>`).join('') || '';
        return `
            <div class="order-history-card">
                <div class="order-card-header">
                    <div>
                        <div class="order-id">Order #${order.id}</div>
                        <div class="order-date">${order.restaurant?.name || ''} · ${new Date(order.createdAt).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})}</div>
                    </div>
                    <span class="status-badge status-${order.status.toLowerCase()}">${order.status.replace('_', ' ')}</span>
                </div>
                ${itemsHtml}
                <div class="order-card-total"><span>Total Paid</span><span>₹${order.totalAmount?.toFixed(0) || '0'}</span></div>
                <div style="display:flex;gap:0.5rem;margin-top:0.8rem;">
                    ${['OUT_FOR_DELIVERY','PREPARING'].includes(order.status) ?
                        `<button class="btn btn-primary btn-sm" onclick="openTrackingModal(${order.id})"><i class="fa-solid fa-location-dot"></i> Track Order</button>` : ''}
                    <button class="btn btn-outline btn-sm" onclick="showToast('Reorder feature coming soon!', 'info')"><i class="fa-solid fa-rotate-right"></i> Reorder</button>
                </div>
            </div>
        `;
    }).join('');
}

async function openTrackingModal(orderId) {
    document.getElementById('track-order-id').textContent = `Order #${orderId}`;
    showModal('tracking-modal');
    const steps = [
        { title: 'Order Placed', desc: 'Your order has been received.', icon: 'fa-circle-check', done: true },
        { title: 'Preparing', desc: 'Restaurant is preparing your food.', icon: 'fa-fire', done: true },
        { title: 'Picked Up', desc: 'Delivery partner has picked up.', icon: 'fa-motorcycle', current: true },
        { title: 'Delivered', desc: 'Delivered to your door.', icon: 'fa-house', done: false }
    ];
    const timeline = document.getElementById('tracking-timeline-steps');
    timeline.innerHTML = steps.map((s, i) => `
        <div class="tracking-step">
            <div class="step-icon-wrap">
                <div class="step-icon ${s.done ? 'done' : ''} ${s.current ? 'current' : ''}"><i class="fa-solid ${s.icon}"></i></div>
                ${i < steps.length - 1 ? `<div class="step-line ${s.done ? 'done' : ''}"></div>` : ''}
            </div>
            <div class="step-content"><div class="step-title">${s.title}</div><div class="step-desc">${s.desc}</div></div>
        </div>
    `).join('');
}

// =====================================================
// OWNER DASHBOARD
// =====================================================
async function loadOwnerRestaurants() {
    try {
        const res = await fetch(`${API_BASE}/restaurants`);
        if (res.ok) {
            const restaurants = await res.json();
            const select = document.getElementById('owner-restaurant-select');
            select.innerHTML = restaurants.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
            if (restaurants.length > 0) loadOwnerOrders(restaurants[0].id);
        }
    } catch {}
}

async function loadOwnerOrders(restId) {
    try {
        const res = await fetch(`${API_BASE}/orders/restaurant/${restId}`);
        if (res.ok) { const orders = await res.json(); renderOwnerOrders(orders); }
    } catch {}
}

function renderOwnerOrders(orders) {
    const list = document.getElementById('owner-orders-list');
    if (orders.length === 0) { list.innerHTML = `<div class="empty-state">No orders yet for this restaurant.</div>`; return; }
    list.innerHTML = orders.map(order => `
        <div class="owner-order-card">
            <div class="owner-order-card-header">
                <strong>Order #${order.id}</strong>
                <span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span>
            </div>
            <div class="owner-order-details">
                <p><strong>Customer:</strong> ${order.customer?.name || '—'}</p>
                <p><strong>Address:</strong> ${order.deliveryAddress}</p>
                <p><strong>Phone:</strong> ${order.phone}</p>
                <p><strong>Amount:</strong> ₹${order.totalAmount?.toFixed(0)}</p>
                <p><strong>Items:</strong> ${order.items?.map(i => `${i.menuItem?.name} x${i.quantity}`).join(', ') || ''}</p>
            </div>
            <div class="owner-actions">
                ${order.status === 'PENDING' ? `<button class="btn btn-primary btn-sm btn-full" onclick="updateOrderStatus(${order.id}, 'PREPARING')">Accept & Prepare</button>` : ''}
                ${order.status === 'PREPARING' ? `<button class="btn btn-secondary btn-sm btn-full" onclick="updateOrderStatus(${order.id}, 'OUT_FOR_DELIVERY')">Ready for Pickup</button>` : ''}
            </div>
        </div>
    `).join('');
}

async function updateOrderStatus(orderId, status) {
    try {
        await fetch(`${API_BASE}/orders/${orderId}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
        showToast(`Order status updated to ${status}`, 'success');
        const restId = document.getElementById('owner-restaurant-select').value;
        loadOwnerOrders(restId);
    } catch { showToast('Failed to update status.', 'error'); }
}

async function handleAddMenuItem(e) {
    e.preventDefault();
    const restId = document.getElementById('owner-restaurant-select').value;
    const body = {
        name: document.getElementById('new-item-name').value,
        price: parseFloat(document.getElementById('new-item-price').value),
        category: document.getElementById('new-item-category').value,
        region: document.getElementById('new-item-region').value,
        description: document.getElementById('new-item-description').value,
        isVeg: document.getElementById('new-item-veg').value === 'true',
        imageUrl: document.getElementById('new-item-image').value,
        available: true
    };
    try {
        const res = await fetch(`${API_BASE}/restaurants/${restId}/menu`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (res.ok) { showToast('Menu item added!', 'success'); document.getElementById('add-menu-form').reset(); switchOwnerTab('orders'); loadOwnerOrders(restId); }
        else showToast('Failed to add item.', 'error');
    } catch { showToast('Server error.', 'error'); }
}

function switchOwnerTab(tab) {
    document.querySelectorAll('#owner-view .tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#owner-view .dashboard-panel').forEach(p => p.style.display = 'none');
    document.getElementById(`tab-owner-${tab}`).classList.add('active');
    document.getElementById(`panel-owner-${tab}`).style.display = 'block';
}

// =====================================================
// DRIVER DASHBOARD
// =====================================================
async function loadDriverTasks() {
    try {
        const res = await fetch(`${API_BASE}/delivery/driver/orders`);
        if (res.ok) { const tasks = await res.json(); renderDriverTasks(tasks); }
    } catch {}
}

function renderDriverTasks(tasks) {
    const list = document.getElementById('driver-jobs-list');
    const active = tasks.filter(t => t.status !== 'DELIVERED');
    if (active.length === 0) { list.innerHTML = `<div class="empty-state">No active deliveries. Great work!</div>`; return; }
    list.innerHTML = active.map(task => `
        <div class="driver-job-card">
            <div class="driver-job-info">
                <h4>Order #${task.order?.id}</h4>
                <p><strong>From:</strong> ${task.order?.restaurant?.name} · ${task.order?.restaurant?.address}</p>
                <p><strong>To:</strong> ${task.order?.deliveryAddress}</p>
                <p><strong>Contact:</strong> ${task.order?.phone}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${task.status.toLowerCase()}">${task.status}</span></p>
                <p><strong>ETA:</strong> ${task.estimatedMinutes} min</p>
            </div>
            <div class="driver-job-actions">
                ${task.status === 'ASSIGNED' ? `<button class="btn btn-secondary btn-sm" onclick="updateDriverJobStatus(${task.id}, 'PREPARING', 25)">Start Preparing</button>` : ''}
                ${task.status === 'PREPARING' ? `<button class="btn btn-primary btn-sm" onclick="updateDriverJobStatus(${task.id}, 'PICKED_UP', 15)">Picked Up</button>` : ''}
                ${task.status === 'PICKED_UP' ? `<button class="btn btn-dark btn-sm" onclick="updateDriverJobStatus(${task.id}, 'DELIVERED', 0)">Mark Delivered</button>` : ''}
            </div>
        </div>
    `).join('');
}

window.updateDriverJobStatus = async function(id, status, mins) {
    try {
        await fetch(`${API_BASE}/delivery/track/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, estimatedMinutes: mins }) });
        showToast(`Status: ${status}`, 'success');
        loadDriverTasks();
    } catch { showToast('Update failed.', 'error'); }
};

// =====================================================
// TRACKING POLLING
// =====================================================
function stopTrackingPolling() { if (state.pollingInterval) { clearInterval(state.pollingInterval); state.pollingInterval = null; } }

// =====================================================
// MODAL UTILITIES
// =====================================================
function showModal(id) { document.getElementById(id).classList.add('active'); }
function hideModal(id) { document.getElementById(id).classList.remove('active'); }

// =====================================================
// TOAST NOTIFICATIONS
// =====================================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: '<i class="fa-solid fa-circle-check text-success"></i>', error: '<i class="fa-solid fa-circle-xmark text-danger"></i>', info: '<i class="fa-solid fa-circle-info text-info"></i>' };
    toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(120%)'; toast.style.transition = 'all 0.3s ease'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// Expose global functions used inline in HTML
window.filterByCategory = filterByCategory;
window.customerFilterByCategory = customerFilterByCategory;
window.toggleFilter = toggleFilter;
window.toggleCustomerFilter = toggleCustomerFilter;
window.sortRestaurants = sortRestaurants;
window.filterMenuItems = filterMenuItems;
window.openRestaurantMenu = openRestaurantMenu;
window.openProductDetail = openProductDetail;
window.navigateTo = navigateTo;
window.switchCustomerTab = switchCustomerTab;
window.switchOwnerTab = switchOwnerTab;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.removeCartItem = removeCartItem;
window.openCartDrawer = openCartDrawer;
window.closeCartDrawer = closeCartDrawer;
window.toggleWishlistItem = toggleWishlistItem;
window.showInfoModal = showInfoModal;
window.setLocation = setLocation;
window.selectPaymentMethod = selectPaymentMethod;
window.handlePaymentConfirm = handlePaymentConfirm;
window.openTrackingModal = openTrackingModal;
window.updateOrderStatus = updateOrderStatus;
window.changeProductQty = changeProductQty;
window.addProductToCartAndClose = addProductToCartAndClose;
window.buyNowFromDetail = buyNowFromDetail;
window.switchProductImage = switchProductImage;
window.showToast = showToast;

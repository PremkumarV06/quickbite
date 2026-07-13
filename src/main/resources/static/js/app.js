// QuickBite Food Delivery Application SPA Engine
// Handles state management, UI rendering, cart operations, API integrations, and tracking animations.

const API_BASE = '/api';

// 1. Application State
let state = {
    user: null, // Current logged-in user object
    activeView: 'landing', // landing, customer, menu, owner, driver
    cart: [], // Array of items: { menuItemId, name, price, quantity, imageUrl }
    selectedRestaurant: null, // Restaurant currently browsing
    restaurants: [], // Cache of restaurants
    pollingInterval: null // Interval handle for tracking status
};

// 2. Initial Setup on Load
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    setupEventListeners();
    await checkAuth();
    loadViewBasedOnState();
}

// 3. Setup Listeners
function setupEventListeners() {
    // Nav Button Bindings
    document.getElementById('logo-btn').addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('landing');
    });
    
    document.getElementById('login-nav-btn').addEventListener('click', () => {
        showModal('auth-modal');
        showAuthForm('login');
    });

    document.getElementById('logout-btn').addEventListener('click', logout);

    // Cart Bindings
    document.getElementById('cart-toggle-btn').addEventListener('click', () => {
        document.getElementById('cart-drawer').classList.add('active');
        document.getElementById('cart-drawer-overlay').classList.add('active');
        renderCart();
    });

    const closeCart = () => {
        document.getElementById('cart-drawer').classList.remove('active');
        document.getElementById('cart-drawer-overlay').classList.remove('active');
    };
    document.getElementById('cart-close-btn').addEventListener('click', closeCart);
    document.getElementById('cart-drawer-overlay').addEventListener('click', closeCart);

    // Modal Close Bindings
    document.getElementById('auth-close-btn').addEventListener('click', () => hideModal('auth-modal'));
    document.getElementById('tracking-close-btn').addEventListener('click', () => {
        hideModal('tracking-modal');
        stopTrackingPolling();
    });

    // Form Navigation inside Auth Modal
    document.getElementById('go-to-register').addEventListener('click', (e) => {
        e.preventDefault();
        showAuthForm('register');
    });
    document.getElementById('go-to-login').addEventListener('click', (e) => {
        e.preventDefault();
        showAuthForm('login');
    });

    // Landing Page CTAs
    document.getElementById('explore-btn').addEventListener('click', () => {
        if (state.user && state.user.role === 'CUSTOMER') {
            navigateTo('customer');
        } else {
            showModal('auth-modal');
            showAuthForm('login');
            showToast('Please sign in to order!', 'info');
        }
    });

    document.getElementById('demo-guide-btn').addEventListener('click', () => {
        document.querySelector('.demo-section').scrollIntoView({ behavior: 'smooth' });
    });

    // Preset Demo Logins
    document.querySelectorAll('.demo-login-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const email = e.target.getAttribute('data-email');
            await demoLogin(email);
        });
    });

    // Form Submissions
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('checkout-form').addEventListener('submit', handleCheckout);
    document.getElementById('add-menu-form').addEventListener('submit', handleAddMenuItem);

    // Customer View Tabs
    document.getElementById('tab-restaurants').addEventListener('click', () => {
        switchCustomerTab('restaurants');
    });
    document.getElementById('tab-orders').addEventListener('click', () => {
        switchCustomerTab('orders');
        loadCustomerOrders();
    });

    // Owner View Tabs
    document.getElementById('tab-owner-orders').addEventListener('click', () => {
        switchOwnerTab('orders');
    });
    document.getElementById('tab-owner-menu').addEventListener('click', () => {
        switchOwnerTab('menu');
    });
    
    document.getElementById('owner-restaurant-select').addEventListener('change', (e) => {
        loadOwnerOrders(e.target.value);
    });

    // Search bar filter
    document.getElementById('restaurant-search').addEventListener('input', (e) => {
        filterRestaurants(e.target.value);
    });
}

// 4. State & View Navigation Routing
function navigateTo(viewName) {
    state.activeView = viewName;
    
    // Hide all view sections
    document.querySelectorAll('.view-section').forEach(section => {
        section.style.display = 'none';
    });

    // Show selected section
    const targetSection = document.getElementById(`${viewName}-view`);
    if (targetSection) {
        targetSection.style.display = 'block';
    }

    // Special View Triggers
    if (viewName === 'customer') {
        loadRestaurants();
        switchCustomerTab('restaurants');
    } else if (viewName === 'owner') {
        loadOwnerRestaurants();
    } else if (viewName === 'driver') {
        loadDriverTasks();
    }

    closeCart();
    updateNavigation();
}

function loadViewBasedOnState() {
    if (!state.user) {
        navigateTo('landing');
        return;
    }

    if (state.user.role === 'CUSTOMER') {
        navigateTo('customer');
    } else if (state.user.role === 'OWNER') {
        navigateTo('owner');
    } else if (state.user.role === 'DRIVER') {
        navigateTo('driver');
    } else {
        navigateTo('landing');
    }
}

function updateNavigation() {
    const nav = document.getElementById('main-nav');
    const profile = document.getElementById('profile-badge');
    const userDisplayName = document.getElementById('user-display-name');
    const userDisplayRole = document.getElementById('user-display-role');
    const cartToggle = document.getElementById('cart-toggle-btn');
    const loginBtn = document.getElementById('login-nav-btn');
    const logoutBtn = document.getElementById('logout-btn');

    nav.innerHTML = ''; // Clear nav links

    if (state.user) {
        // Logged in Navigation links
        if (state.user.role === 'CUSTOMER') {
            nav.innerHTML = `
                <a href="#" class="nav-link" id="nav-browse-link"><i class="fa-solid fa-utensils"></i> Browse Foods</a>
                <a href="#" class="nav-link" id="nav-history-link"><i class="fa-solid fa-receipt"></i> Order History</a>
            `;
            setTimeout(() => {
                document.getElementById('nav-browse-link').addEventListener('click', (e) => {
                    e.preventDefault();
                    navigateTo('customer');
                    switchCustomerTab('restaurants');
                });
                document.getElementById('nav-history-link').addEventListener('click', (e) => {
                    e.preventDefault();
                    navigateTo('customer');
                    switchCustomerTab('orders');
                    loadCustomerOrders();
                });
            }, 50);
            cartToggle.style.display = 'flex';
        } else if (state.user.role === 'OWNER') {
            nav.innerHTML = `<span class="nav-brand-title">Management Hub</span>`;
            cartToggle.style.display = 'none';
        } else if (state.user.role === 'DRIVER') {
            nav.innerHTML = `<span class="nav-brand-title">Courier Portal</span>`;
            cartToggle.style.display = 'none';
        }

        // Show avatar badge & logout
        profile.style.display = 'flex';
        userDisplayName.textContent = state.user.name;
        userDisplayRole.textContent = state.user.role;
        userDisplayRole.className = `role-pill pill-${state.user.role.toLowerCase()}`;
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-flex';
    } else {
        // Logged out
        nav.innerHTML = `
            <a href="#" class="nav-link" onclick="document.querySelector('.demo-section').scrollIntoView({behavior: 'smooth'})"><i class="fa-solid fa-wand-magic-sparkles"></i> Preset Demos</a>
        `;
        profile.style.display = 'none';
        cartToggle.style.display = 'none';
        loginBtn.style.display = 'inline-flex';
        logoutBtn.style.display = 'none';
        state.cart = [];
        updateCartBadge();
    }
}

// 5. Authentication API Helpers
async function checkAuth() {
    try {
        const res = await fetch(`${API_BASE}/auth/me`);
        if (res.ok) {
            state.user = await res.json();
        } else {
            state.user = null;
        }
    } catch (err) {
        state.user = null;
    }
}

async function demoLogin(email) {
    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: 'password' })
        });
        if (res.ok) {
            state.user = await res.json();
            showToast(`Logged in as ${state.user.name}!`, 'success');
            loadViewBasedOnState();
        } else {
            showToast('Demo login failed.', 'error');
        }
    } catch (err) {
        showToast('Server connection error.', 'error');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (res.ok) {
            state.user = await res.json();
            hideModal('auth-modal');
            showToast(`Welcome, ${state.user.name}!`, 'success');
            loadViewBasedOnState();
        } else {
            const txt = await res.text();
            showToast(txt || 'Invalid credentials.', 'error');
        }
    } catch (err) {
        showToast('Network error during login.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const role = document.getElementById('register-role').value;
    const address = document.getElementById('register-address').value;
    const phone = document.getElementById('register-phone').value;

    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role, address, phone })
        });
        if (res.ok) {
            state.user = await res.json();
            hideModal('auth-modal');
            showToast('Registration successful!', 'success');
            loadViewBasedOnState();
        } else {
            const txt = await res.text();
            showToast(txt || 'Registration failed.', 'error');
        }
    } catch (err) {
        showToast('Registration failed due to network error.', 'error');
    }
}

async function logout() {
    try {
        await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
        state.user = null;
        showToast('Logged out successfully.', 'success');
        loadViewBasedOnState();
    } catch (err) {
        showToast('Logout failed.', 'error');
    }
}

// 6. Customer Dashboard Actions
async function loadRestaurants() {
    try {
        const res = await fetch(`${API_BASE}/restaurants`);
        if (res.ok) {
            state.restaurants = await res.json();
            renderRestaurants(state.restaurants);
        }
    } catch (err) {
        showToast('Could not load restaurants.', 'error');
    }
}

function renderRestaurants(restaurants) {
    const list = document.getElementById('restaurant-list');
    list.innerHTML = '';
    
    if (restaurants.length === 0) {
        list.innerHTML = `<div class="empty-state">No restaurants found.</div>`;
        return;
    }

    restaurants.forEach(rest => {
        const card = document.createElement('div');
        card.className = 'restaurant-card';
        card.innerHTML = `
            <div class="card-img-container">
                <img src="${rest.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=500&q=80'}" alt="${rest.name}" class="card-img">
                <span class="card-tag">${rest.cuisine}</span>
            </div>
            <div class="restaurant-card-body">
                <div class="card-meta-row">
                    <span>⭐ 4.8 Rating</span>
                    <span><i class="fa-solid fa-phone"></i> ${rest.phone}</span>
                </div>
                <h3>${rest.name}</h3>
                <p><i class="fa-solid fa-location-dot text-primary"></i> ${rest.address}</p>
            </div>
        `;
        card.addEventListener('click', () => viewRestaurantMenu(rest));
        list.appendChild(card);
    });
}

function filterRestaurants(query) {
    const q = query.toLowerCase();
    const filtered = state.restaurants.filter(r => 
        r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q)
    );
    renderRestaurants(filtered);
}

function switchCustomerTab(tabName) {
    document.querySelectorAll('#customer-view .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('#customer-view .dashboard-panel').forEach(panel => {
        panel.style.display = 'none';
    });

    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.getElementById(`panel-${tabName}`).style.display = 'block';
}

// 7. Menu Browsing & Cart Operations
async function viewRestaurantMenu(restaurant) {
    state.selectedRestaurant = restaurant;
    navigateTo('menu');

    const banner = document.getElementById('menu-restaurant-banner');
    banner.innerHTML = `
        <img src="${restaurant.imageUrl}" alt="${restaurant.name}" class="menu-hero-img" style="position: absolute; inset:0; width:100%; height:100%; object-fit:cover;">
        <div class="menu-hero-overlay"></div>
        <div class="menu-hero-details">
            <div class="menu-hero-title">
                <h2>${restaurant.name}</h2>
                <p><i class="fa-solid fa-store"></i> ${restaurant.cuisine} Cuisine | <i class="fa-solid fa-location-dot"></i> ${restaurant.address}</p>
            </div>
            <button class="btn btn-outline" style="color:white; border-color:white; z-index:5;" onclick="navigateTo('customer')">
                <i class="fa-solid fa-chevron-left"></i> Back to Restaurants
            </button>
        </div>
    `;

    try {
        const res = await fetch(`${API_BASE}/restaurants/${restaurant.id}/menu`);
        if (res.ok) {
            const menuItems = await res.json();
            renderMenu(menuItems);
        }
    } catch (err) {
        showToast('Could not load restaurant menu.', 'error');
    }
}

function renderMenu(items) {
    const list = document.getElementById('menu-items-list');
    const categoriesDiv = document.getElementById('menu-categories');
    
    list.innerHTML = '';
    categoriesDiv.innerHTML = '';

    if (items.length === 0) {
        list.innerHTML = `<div class="empty-state">No items available in this menu.</div>`;
        return;
    }

    // Extract categories
    const categories = ['All', ...new Set(items.map(item => item.category))];
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `category-tab-btn ${cat === 'All' ? 'active' : ''}`;
        btn.textContent = cat;
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.category-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderFilteredMenuItems(items, cat);
        });
        categoriesDiv.appendChild(btn);
    });

    renderFilteredMenuItems(items, 'All');
}

function renderFilteredMenuItems(items, selectedCategory) {
    const list = document.getElementById('menu-items-list');
    list.innerHTML = '';

    const filtered = selectedCategory === 'All' ? items : items.filter(item => item.category === selectedCategory);

    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'menu-card';
        card.innerHTML = `
            <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80'}" alt="${item.name}" class="menu-card-img">
            <div class="menu-card-body">
                <div class="menu-card-title-row">
                    <h3>${item.name}</h3>
                    <span class="menu-card-price">$${item.price.toFixed(2)}</span>
                </div>
                <p>${item.description}</p>
                <div class="menu-card-actions">
                    <button class="btn btn-primary btn-full" onclick="addToCart(${item.id}, '${item.name.replace(/'/g, "\\'")}', ${item.price}, '${item.imageUrl}')">
                        <i class="fa-solid fa-cart-plus"></i> Add to Cart
                    </button>
                </div>
            </div>
        `;
        list.appendChild(card);
    });
}

window.addToCart = function(id, name, price, imageUrl) {
    if (!state.user) {
        showModal('auth-modal');
        showToast('Please login to build your cart.', 'info');
        return;
    }
    const existing = state.cart.find(item => item.menuItemId === id);
    if (existing) {
        existing.quantity += 1;
    } else {
        state.cart.push({ menuItemId: id, name, price, quantity: 1, imageUrl });
    }
    updateCartBadge();
    showToast(`Added ${name} to cart!`, 'success');
};

function updateCartBadge() {
    const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-badge').textContent = count;
}

function renderCart() {
    const list = document.getElementById('cart-items-list');
    const totalBox = document.getElementById('cart-total-amount');
    list.innerHTML = '';

    if (state.cart.length === 0) {
        list.innerHTML = `<div class="empty-state" style="padding: 2rem 0;">Your cart is empty.</div>`;
        totalBox.textContent = '$0.00';
        document.getElementById('checkout-form').style.display = 'none';
        return;
    }

    document.getElementById('checkout-form').style.display = 'block';

    let total = 0;
    state.cart.forEach((item, index) => {
        total += item.price * item.quantity;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <img src="${item.imageUrl}" alt="${item.name}" class="cart-item-img">
            <div class="cart-item-details">
                <h4>${item.name}</h4>
                <span>$${item.price.toFixed(2)}</span>
            </div>
            <div class="cart-item-qty">
                <button class="qty-btn" onclick="updateQty(${index}, -1)"><i class="fa-solid fa-minus"></i></button>
                <span class="qty-val">${item.quantity}</span>
                <button class="qty-btn" onclick="updateQty(${index}, 1)"><i class="fa-solid fa-plus"></i></button>
            </div>
        `;
        list.appendChild(div);
    });

    totalBox.textContent = `$${total.toFixed(2)}`;
}

window.updateQty = function(index, change) {
    state.cart[index].quantity += change;
    if (state.cart[index].quantity <= 0) {
        state.cart.splice(index, 1);
    }
    updateCartBadge();
    renderCart();
};

async function handleCheckout(e) {
    e.preventDefault();
    const address = document.getElementById('checkout-address').value;
    const phone = document.getElementById('checkout-phone').value;

    const requestBody = {
        restaurantId: state.selectedRestaurant.id,
        deliveryAddress: address,
        phone: phone,
        items: state.cart.map(i => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity
        }))
    };

    try {
        const res = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        if (res.ok) {
            const savedOrder = await res.json();
            showToast('Order placed successfully!', 'success');
            state.cart = [];
            updateCartBadge();
            document.getElementById('cart-drawer').classList.remove('active');
            document.getElementById('cart-drawer-overlay').classList.remove('active');
            navigateTo('customer');
            switchCustomerTab('orders');
            loadCustomerOrders();
        } else {
            showToast('Order checkout failed.', 'error');
        }
    } catch (err) {
        showToast('Checkout transaction failed.', 'error');
    }
}

// 8. Order List Rendering
async function loadCustomerOrders() {
    try {
        const res = await fetch(`${API_BASE}/orders/customer`);
        if (res.ok) {
            const orders = await res.json();
            renderCustomerOrders(orders);
        }
    } catch (err) {
        showToast('Failed to load orders.', 'error');
    }
}

function renderCustomerOrders(orders) {
    const list = document.getElementById('customer-orders-list');
    const badge = document.getElementById('active-orders-count');
    list.innerHTML = '';

    const activeCount = orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length;
    badge.textContent = activeCount;

    if (orders.length === 0) {
        list.innerHTML = `<div class="empty-state">You haven't placed any orders yet.</div>`;
        return;
    }

    orders.forEach(order => {
        const card = document.createElement('div');
        card.className = 'order-history-card';
        
        let itemsHtml = '';
        order.items.forEach(i => {
            itemsHtml += `
                <div class="order-history-items-row">
                    <span>${i.menuItem.name} <strong>x${i.quantity}</strong></span>
                    <span>$${(i.price * i.quantity).toFixed(2)}</span>
                </div>
            `;
        });

        const statusClass = `status-${order.status.toLowerCase()}`;
        const canTrack = order.status !== 'CANCELLED';

        card.innerHTML = `
            <div class="order-history-header">
                <div>
                    <strong>Order #${order.id}</strong>
                    <p class="text-muted" style="font-size:0.8rem;">Placed: ${new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <span class="status-badge ${statusClass}">${order.status.replace(/_/g, ' ')}</span>
            </div>
            <div class="order-history-items">
                ${itemsHtml}
            </div>
            <div class="order-history-footer">
                <div>
                    <span class="text-muted">Total Paid: </span>
                    <strong style="color:var(--primary); font-size:1.15rem;">$${order.totalAmount.toFixed(2)}</strong>
                </div>
                ${canTrack ? `<button class="btn btn-secondary" onclick="openLiveTracking(${order.id})"><i class="fa-solid fa-map-location-dot"></i> Track Order</button>` : ''}
            </div>
        `;
        list.appendChild(card);
    });
}

// 9. Real-Time Tracking & Polling engine
window.openLiveTracking = function(orderId) {
    showModal('tracking-modal');
    document.getElementById('track-order-id').textContent = `Order #${orderId}`;
    
    // Start tracking polling
    pollTracking(orderId);
    state.pollingInterval = setInterval(() => pollTracking(orderId), 3000);
};

async function pollTracking(orderId) {
    try {
        const res = await fetch(`${API_BASE}/delivery/track/${orderId}`);
        if (res.ok) {
            const tracking = await res.json();
            renderLiveTracking(tracking);
        }
    } catch (err) {
        console.error('Error polling tracking', err);
    }
}

function renderLiveTracking(tracking) {
    const stepsContainer = document.getElementById('tracking-timeline-steps');
    const etaText = document.getElementById('track-eta');
    const driverNameText = document.getElementById('track-driver-name');
    const driverPhoneText = document.getElementById('track-driver-phone');

    etaText.textContent = tracking.estimatedMinutes > 0 ? `${tracking.estimatedMinutes} Minutes` : 'Delivered!';
    driverNameText.textContent = tracking.driverName || 'Assigning Rider...';
    driverPhoneText.innerHTML = tracking.driverPhone ? `<i class="fa-solid fa-phone"></i> ${tracking.driverPhone}` : 'N/A';

    const steps = [
        { code: 'ASSIGNED', title: 'Order Confirmed', desc: 'Rider is assigned to pick up your order.' },
        { code: 'PREPARING', title: 'Kitchen Preparing', desc: 'The restaurant is preparing your ingredients.' },
        { code: 'PICKED_UP', title: 'Out For Delivery', desc: 'Your rider is heading to your delivery location.' },
        { code: 'DELIVERED', title: 'Order Delivered', desc: 'Enjoy your delicious QuickBite meal!' }
    ];

    stepsContainer.innerHTML = '';
    
    // Find active step index
    let activeIdx = steps.findIndex(s => s.code === tracking.status);
    if (activeIdx === -1) activeIdx = 0;

    steps.forEach((step, idx) => {
        const isCompleted = idx < activeIdx;
        const isActive = idx === activeIdx;
        let stepClass = 'timeline-step';
        if (isCompleted) stepClass += ' completed';
        if (isActive) stepClass += ' active';

        const bulletContent = isCompleted ? '<i class="fa-solid fa-check"></i>' : idx + 1;

        const stepDiv = document.createElement('div');
        stepDiv.className = stepClass;
        stepDiv.innerHTML = `
            <span class="timeline-bullet">${bulletContent}</span>
            <h5>${step.title}</h5>
            <p>${step.desc}</p>
        `;
        stepsContainer.appendChild(stepDiv);
    });

    // Update mock map driver marker location dynamically
    const driverMarker = document.querySelector('.driver-marker');
    if (driverMarker) {
        if (tracking.status === 'ASSIGNED') {
            driverMarker.style.left = '22%';
            driverMarker.style.top = '32%';
        } else if (tracking.status === 'PREPARING') {
            driverMarker.style.left = '35%';
            driverMarker.style.top = '40%';
        } else if (tracking.status === 'PICKED_UP') {
            driverMarker.style.left = '55%';
            driverMarker.style.top = '52%';
        } else if (tracking.status === 'DELIVERED') {
            driverMarker.style.left = '78%';
            driverMarker.style.top = '68%';
        }
    }
}

function stopTrackingPolling() {
    if (state.pollingInterval) {
        clearInterval(state.pollingInterval);
        state.pollingInterval = null;
    }
}

// 10. Owner Portal Actions
async function loadOwnerRestaurants() {
    try {
        const res = await fetch(`${API_BASE}/restaurants`);
        if (res.ok) {
            const list = await res.json();
            const select = document.getElementById('owner-restaurant-select');
            const menuSelect = document.getElementById('menu-item-restaurant');
            
            select.innerHTML = '';
            menuSelect.innerHTML = '';
            
            list.forEach(r => {
                const opt = `<option value="${r.id}">${r.name}</option>`;
                select.innerHTML += opt;
                menuSelect.innerHTML += opt;
            });

            if (list.length > 0) {
                loadOwnerOrders(list[0].id);
            }
        }
    } catch (err) {
        showToast('Failed to load owner restaurants.', 'error');
    }
}

async function loadOwnerOrders(restaurantId) {
    try {
        const res = await fetch(`${API_BASE}/orders/restaurant/${restaurantId}`);
        if (res.ok) {
            const orders = await res.json();
            renderOwnerOrders(orders);
        }
    } catch (err) {
        showToast('Failed to load restaurant orders.', 'error');
    }
}

function renderOwnerOrders(orders) {
    const list = document.getElementById('owner-orders-list');
    list.innerHTML = '';

    if (orders.length === 0) {
        list.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">No orders for this restaurant yet.</div>`;
        return;
    }

    orders.forEach(order => {
        const card = document.createElement('div');
        card.className = 'owner-order-card';

        let itemsHtml = '';
        order.items.forEach(i => {
            itemsHtml += `<li>${i.menuItem.name} <strong>x${i.quantity}</strong></li>`;
        });

        const statusClass = `status-${order.status.toLowerCase()}`;

        card.innerHTML = `
            <div class="owner-order-card-header">
                <div>
                    <strong>Order #${order.id}</strong>
                    <p class="text-muted" style="font-size:0.75rem;">${new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <span class="status-badge ${statusClass}">${order.status.replace(/_/g, ' ')}</span>
            </div>
            <div class="owner-order-details">
                <p><strong>Customer:</strong> ${order.customer.name}</p>
                <p><strong>Address:</strong> ${order.deliveryAddress}</p>
                <p><strong>Phone:</strong> ${order.phone}</p>
                <hr>
                <ul style="padding-left:1.25rem;">${itemsHtml}</ul>
                <hr>
                <p><strong>Total:</strong> $${order.totalAmount.toFixed(2)}</p>
            </div>
            <div class="owner-actions">
                ${order.status === 'PENDING' ? `<button class="btn btn-secondary btn-full" onclick="updateOrderStatus(${order.id}, 'PREPARING')">Prepare Food</button>` : ''}
                ${order.status === 'PREPARING' ? `<button class="btn btn-primary btn-full" onclick="updateOrderStatus(${order.id}, 'OUT_FOR_DELIVERY')">Ship Order (Out)</button>` : ''}
                ${order.status === 'OUT_FOR_DELIVERY' ? `<button class="btn btn-dark btn-full" onclick="updateOrderStatus(${order.id}, 'DELIVERED')">Complete Order</button>` : ''}
            </div>
        `;
        list.appendChild(card);
    });
}

window.updateOrderStatus = async function(id, newStatus) {
    try {
        const res = await fetch(`${API_BASE}/orders/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
            showToast(`Order status set to: ${newStatus}`, 'success');
            const restId = document.getElementById('owner-restaurant-select').value;
            loadOwnerOrders(restId);
        } else {
            showToast('Failed to update status.', 'error');
        }
    } catch (err) {
        showToast('Connection failed.', 'error');
    }
};

async function handleAddMenuItem(e) {
    e.preventDefault();
    const restId = document.getElementById('menu-item-restaurant').value;
    const name = document.getElementById('menu-item-name').value;
    const price = parseFloat(document.getElementById('menu-item-price').value);
    const category = document.getElementById('menu-item-category').value;
    const description = document.getElementById('menu-item-desc').value;
    const imageUrl = document.getElementById('menu-item-image').value;

    const requestBody = { name, price, category, description, imageUrl, available: true };

    try {
        const res = await fetch(`${API_BASE}/restaurants/${restId}/menu`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        if (res.ok) {
            showToast('New item added to menu!', 'success');
            document.getElementById('add-menu-form').reset();
            switchOwnerTab('orders');
            loadOwnerOrders(restId);
        } else {
            showToast('Failed to add menu item.', 'error');
        }
    } catch (err) {
        showToast('Server communication failed.', 'error');
    }
}

function switchOwnerTab(tabName) {
    document.querySelectorAll('#owner-view .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('#owner-view .dashboard-panel').forEach(panel => {
        panel.style.display = 'none';
    });

    document.getElementById(`tab-owner-${tabName}`).classList.add('active');
    document.getElementById(`panel-owner-${tabName}`).style.display = 'block';
}

// 11. Driver Portal Actions
async function loadDriverTasks() {
    try {
        const res = await fetch(`${API_BASE}/delivery/driver/orders`);
        if (res.ok) {
            const list = await res.json();
            renderDriverTasks(list);
        }
    } catch (err) {
        showToast('Could not load delivery list.', 'error');
    }
}

function renderDriverTasks(tasks) {
    const list = document.getElementById('driver-jobs-list');
    list.innerHTML = '';

    const activeTasks = tasks.filter(t => t.status !== 'DELIVERED');

    if (activeTasks.length === 0) {
        list.innerHTML = `<div class="empty-state">No delivery jobs currently active. Nice work!</div>`;
        return;
    }

    activeTasks.forEach(task => {
        const card = document.createElement('div');
        card.className = 'driver-job-card';
        card.innerHTML = `
            <div class="driver-job-info">
                <h4>Order #${task.order.id}</h4>
                <p><strong>Restaurant:</strong> ${task.order.restaurant.name} (${task.order.restaurant.address})</p>
                <p><strong>Deliver To:</strong> ${task.order.deliveryAddress}</p>
                <p><strong>Contact Info:</strong> ${task.order.phone}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${task.status.toLowerCase()}">${task.status}</span></p>
                <p><strong>Estimated Remaining:</strong> ${task.estimatedMinutes} mins</p>
            </div>
            <div class="driver-job-actions">
                ${task.status === 'ASSIGNED' ? `<button class="btn btn-secondary" onclick="updateDriverJobStatus(${task.id}, 'PREPARING', 25)">Prepare Order</button>` : ''}
                ${task.status === 'PREPARING' ? `<button class="btn btn-primary" onclick="updateDriverJobStatus(${task.id}, 'PICKED_UP', 15)">Picked Up (Start Transit)</button>` : ''}
                ${task.status === 'PICKED_UP' ? `<button class="btn btn-dark" onclick="updateDriverJobStatus(${task.id}, 'DELIVERED', 0)">Mark Delivered</button>` : ''}
            </div>
        `;
        list.appendChild(card);
    });
}

window.updateDriverJobStatus = async function(id, newStatus, minutesRemaining) {
    try {
        const res = await fetch(`${API_BASE}/delivery/track/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: newStatus,
                estimatedMinutes: minutesRemaining
            })
        });
        if (res.ok) {
            showToast(`Delivery status updated to: ${newStatus}`, 'success');
            loadDriverTasks();
        } else {
            showToast('Failed to update task status.', 'error');
        }
    } catch (err) {
        showToast('Connection error.', 'error');
    }
};

// 12. Dialog/Toast Modal Manager
function showModal(id) {
    document.getElementById(id).classList.add('active');
}

function hideModal(id) {
    document.getElementById(id).classList.remove('active');
}

function showAuthForm(formName) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const title = document.getElementById('auth-modal-title');

    if (formName === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        title.textContent = 'Sign In to QuickBite';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        title.textContent = 'Create QuickBite Account';
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '<i class="fa-solid fa-circle-check text-success"></i>';
    if (type === 'error') icon = '<i class="fa-solid fa-circle-xmark text-danger"></i>';
    else if (type === 'info') icon = '<i class="fa-solid fa-circle-info text-info"></i>';

    toast.innerHTML = `
        ${icon}
        <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- 1. FIREBASE CONFIGURATION ---
// PASTE YOUR KEYS INSIDE THE BRACKETS BELOW.
// DO NOT PASTE ANY LINES THAT SAY "import ..."
const firebaseConfig = {
  apiKey: "AIzaSyBOvsein855aMcyGkw4GTkZ3UD_j-36QGQ",
  authDomain: "bongless2020.firebaseapp.com",
  projectId: "bongless2020",
  storageBucket: "bongless2020.firebasestorage.app",
  messagingSenderId: "959363193575",
  appId: "1:959363193575:web:40e71b7169bdcdcac46042"
};

// --- 2. INITIALIZE FIREBASE (COMPAT MODE) ---
// This checks if Firebase is loaded before running to prevent crashes
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    var db = firebase.firestore();
    var auth = firebase.auth();
} else {
    console.error("Firebase SDK not loaded. Check index.html");
}

// --- 3. VARIABLES ---
let isAdmin = false;
let cart = [];
let menuData = [];

// --- 4. STARTUP ---
document.addEventListener('DOMContentLoaded', () => {
    // Only run if Firebase works
    if (typeof auth !== 'undefined') {
        setupAuthListener();
        loadMenu();
    }
    setupGallery();
});

// --- 5. AUTHENTICATION (LOGIN) ---
function setupAuthListener() {
    auth.onAuthStateChanged(user => {
        const adminBtn = document.getElementById('admin-login-btn');
        const addBtn = document.getElementById('admin-add-btn');
        
        if (user) {
            isAdmin = true;
            if(adminBtn) adminBtn.innerText = "Salir";
            if(addBtn) addBtn.classList.add('visible');
            loadMenu(); // Reload to show edit buttons
        } else {
            isAdmin = false;
            if(adminBtn) adminBtn.innerText = "Admin";
            if(addBtn) addBtn.classList.remove('visible');
            loadMenu();
        }
    });
}

// Admin Button Click
const adminLoginBtn = document.getElementById('admin-login-btn');
if(adminLoginBtn) {
    adminLoginBtn.onclick = () => {
        if (isAdmin) auth.signOut();
        else document.getElementById('login-modal').classList.add('open');
    };
}

function loginAdmin() {
    const email = document.getElementById('admin-email').value;
    const pass = document.getElementById('admin-pass').value;
    auth.signInWithEmailAndPassword(email, pass)
        .then(() => document.getElementById('login-modal').classList.remove('open'))
        .catch(e => alert("Error: " + e.message));
}

// --- 6. LOAD MENU FROM DATABASE ---
function loadMenu() {
    const container = document.getElementById('menu-list');
    
    // Only show loading if empty
    if(container.innerHTML.trim() === "") {
        container.innerHTML = '<div class="loading"><i class="fas fa-fire fa-spin"></i> Cargando menú...</div>';
    }

    db.collection("menu").get().then((querySnapshot) => {
        const sections = { combos: [], especiales: [], ordenes: [] };
        menuData = [];

        querySnapshot.forEach((doc) => {
            const item = doc.data();
            item.id = doc.id;
            menuData.push(item);
            
            // Assign to section (default to combos if missing)
            const sec = item.section || 'combos';
            if (sections[sec]) {
                sections[sec].push(item);
            }
        });

        // Handle Empty Menu
        if(menuData.length === 0) {
             container.innerHTML = '<div class="loading" style="color:white">Menú vacío. (Entra como Admin para agregar)</div>';
             return;
        }

        renderMenuHTML(sections);
    }).catch(error => {
        console.error("Error loading menu:", error);
        container.innerHTML = '<div class="loading">Error de conexión. Verifica la consola.</div>';
    });
}

function renderMenuHTML(sections) {
    const container = document.getElementById('menu-list');
    let html = '';

    const titles = { 
        combos: "Combos Bongless", 
        especiales: "Especiales", 
        ordenes: "Ordenes Extra" 
    };

    for (const [key, items] of Object.entries(sections)) {
        if (items.length === 0 && !isAdmin) continue;

        html += `<h3 class="section-title">${titles[key] || key.toUpperCase()}</h3>`;
        html += `<div class="menu-section">`;

        items.forEach(item => {
            let adminBtns = '';
            if (isAdmin) {
                adminBtns = `
                <div class="admin-controls">
                    <button class="btn-edit" onclick="openEditModal('${item.id}')">Editar</button>
                    <button class="btn-delete" onclick="deleteItem('${item.id}')">Borrar</button>
                </div>`;
            }

            // Image Logic
            const imgDisplay = item.imageUrl 
                ? `<img src="${item.imageUrl}" onclick="openLightbox('${item.imageUrl}')" style="width:100%; height:180px; object-fit:cover; border-radius:8px; margin-bottom:10px; cursor:zoom-in;">` 
                : '';

            html += `
            <div class="item-card">
                ${imgDisplay}
                <div class="item-header">
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">$${item.price}</span>
                </div>
                <p class="item-desc">${item.desc}</p>
                <button class="btn-add" onclick="addToCart('${item.id}', '${item.name}', ${item.price})">Agregar</button>
                ${adminBtns}
            </div>`;
        });

        html += `</div>`;
    }
    container.innerHTML = html;
}

// --- 7. ADMIN FUNCTIONS (ADD/EDIT/DELETE) ---
function openAdminModal() {
    document.getElementById('edit-id').value = "";
    document.getElementById('edit-name').value = "";
    document.getElementById('edit-price').value = "";
    document.getElementById('edit-desc').value = "";
    document.getElementById('edit-img').value = "";
    document.getElementById('modal-title').innerText = "Nuevo Platillo";
    document.getElementById('item-modal').classList.add('open');
}

function openEditModal(id) {
    const item = menuData.find(i => i.id === id);
    if (!item) return;

    document.getElementById('edit-id').value = id;
    document.getElementById('edit-name').value = item.name;
    document.getElementById('edit-price').value = item.price;
    document.getElementById('edit-desc').value = item.desc;
    document.getElementById('edit-section').value = item.section;
    document.getElementById('edit-img').value = item.imageUrl || "";
    
    document.getElementById('modal-title').innerText = "Editar Platillo";
    document.getElementById('item-modal').classList.add('open');
}

function saveItem() {
    const id = document.getElementById('edit-id').value;
    const data = {
        name: document.getElementById('edit-name').value,
        price: Number(document.getElementById('edit-price').value),
        desc: document.getElementById('edit-desc').value,
        section: document.getElementById('edit-section').value,
        imageUrl: document.getElementById('edit-img').value
    };

    if (id) {
        db.collection("menu").doc(id).update(data).then(() => {
            document.getElementById('item-modal').classList.remove('open');
            loadMenu();
        });
    } else {
        db.collection("menu").add(data).then(() => {
            document.getElementById('item-modal').classList.remove('open');
            loadMenu();
        });
    }
}

function deleteItem(id) {
    if (confirm("¿Borrar este platillo para siempre?")) {
        db.collection("menu").doc(id).delete().then(() => loadMenu());
    }
}

// --- 8. CART FUNCTIONS ---
function addToCart(id, name, price) {
    const existing = cart.find(i => i.id === id);
    if (existing) existing.qty++;
    else cart.push({ id, name, price, qty: 1 });
    updateCartUI();
}

function updateCartUI() {
    const total = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const count = cart.reduce((acc, item) => acc + item.qty, 0);
    
    document.getElementById('cart-count').innerText = count;
    document.getElementById('cart-total').innerText = "$" + total;
    document.getElementById('modal-total').innerText = "$" + total;
    
    const floater = document.getElementById('cart-floater');
    if (count > 0) floater.classList.add('active');
    else floater.classList.remove('active');
    
    renderCartList();
}

function renderCartList() {
    const list = document.getElementById('cart-items');
    if (cart.length === 0) {
        list.innerHTML = '<p class="empty-msg">Tu carrito está vacío.</p>';
        return;
    }
    
    list.innerHTML = cart.map((item, index) => `
        <div class="cart-item-row">
            <div class="item-details-left">
                <h4>${item.name}</h4>
                <p>Cantidad: ${item.qty}</p>
            </div>
            <div class="item-price-right">
                <span class="price">$${item.price * item.qty}</span>
                <button class="delete-btn" onclick="removeFromCart(${index})">Eliminar</button>
            </div>
        </div>
    `).join('');
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function openCart() { document.getElementById('cart-modal').classList.add('open'); }
function closeCart() { document.getElementById('cart-modal').classList.remove('open'); }

function sendOrder() {
    if (cart.length === 0) return;
    let msg = "Hola Bongless 2020, quiero pedir:\n\n";
    cart.forEach(item => {
        msg += `▪ ${item.qty}x ${item.name} - $${item.price * item.qty}\n`;
    });
    const total = document.getElementById('modal-total').innerText;
    msg += `\n*TOTAL: ${total}*`;
    window.open(`https://wa.me/5216861969928?text=${encodeURIComponent(msg)}`, '_blank');
}

// --- 9. GALLERY & LIGHTBOX (The missing parts) ---
function setupGallery() {
    const wrapper = document.getElementById('gallery-wrapper');
    if(!wrapper) return;
    // Static placeholder images (or you can add logic to pull from DB)
    const images = ['assets/images/logo.png']; 
    
    wrapper.innerHTML = images.map(src => 
        `<div class="swiper-slide"><img src="${src}" onclick="openLightbox('${src}')"></div>`
    ).join('');

    new Swiper(".mySwiper", {
        pagination: { el: ".swiper-pagination", dynamicBullets: true },
        loop: true,
        autoplay: { delay: 3000 }
    });
}

// Lightbox Logic (Fixes the second error)
function openLightbox(src) {
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    if(lightbox && img) {
        img.src = src;
        lightbox.classList.add('active');
    }
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if(lightbox) lightbox.classList.remove('active');
}
// Expose to window so HTML onclick works
window.closeLightbox = closeLightbox;
window.openLightbox = openLightbox;

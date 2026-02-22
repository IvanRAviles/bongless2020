// --- 1. PASTE YOUR FIREBASE CONFIG HERE ---
// (Replace the lines below with the code you copied from Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyBOvsein855aMcyGkw4GTkZ3UD_j-36QGQ",
  authDomain: "bongless2020.firebaseapp.com",
  projectId: "bongless2020",
  storageBucket: "bongless2020.firebasestorage.app",
  messagingSenderId: "959363193575",
  appId: "1:959363193575:web:40e71b7169bdcdcac46042"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// --- STATE MANAGEMENT ---
let isAdmin = false;
let cart = [];
let menuData = [];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    setupAuthListener();
    loadMenu();
    setupGallery();
});

// --- AUTHENTICATION ---
function setupAuthListener() {
    auth.onAuthStateChanged(user => {
        if (user) {
            isAdmin = true;
            document.getElementById('admin-login-btn').innerText = "Salir";
            document.getElementById('admin-add-btn').classList.add('visible');
            loadMenu(); // Reload menu to show edit buttons
        } else {
            isAdmin = false;
            document.getElementById('admin-login-btn').innerText = "Admin";
            document.getElementById('admin-add-btn').classList.remove('visible');
            loadMenu();
        }
    });
}

document.getElementById('admin-login-btn').onclick = () => {
    if (isAdmin) {
        auth.signOut();
    } else {
        document.getElementById('login-modal').classList.add('open');
    }
};

function loginAdmin() {
    const email = document.getElementById('admin-email').value;
    const pass = document.getElementById('admin-pass').value;
    auth.signInWithEmailAndPassword(email, pass)
        .then(() => document.getElementById('login-modal').classList.remove('open'))
        .catch(e => alert("Error: " + e.message));
}

// --- MENU LOADING (FROM FIREBASE) ---
function loadMenu() {
    const container = document.getElementById('menu-list');
    container.innerHTML = '<div class="loading"><i class="fas fa-fire fa-spin"></i> Cargando menú...</div>';

    db.collection("menu").get().then((querySnapshot) => {
        const sections = { combos: [], especiales: [], ordenes: [] };
        menuData = [];

        querySnapshot.forEach((doc) => {
            const item = doc.data();
            item.id = doc.id;
            menuData.push(item);
            if (sections[item.section]) {
                sections[item.section].push(item);
            }
        });

        renderMenuHTML(sections);
    }).catch(error => {
        console.error("Error loading menu:", error);
        container.innerHTML = '<p class="loading">Error cargando el menú.</p>';
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
            html += createItemCard(item);
        });

        html += `</div>`;
    }
    container.innerHTML = html;
}

function createItemCard(item) {
    let adminBtns = '';
    if (isAdmin) {
        adminBtns = `
        <div class="admin-controls">
            <button class="btn-edit" onclick="openEditModal('${item.id}')">Editar</button>
            <button class="btn-delete" onclick="deleteItem('${item.id}')">Borrar</button>
        </div>`;
    }

    // Check if item has options (You can add these manually in Firestore later if needed)
    // For simplicity, we are defaulting to standard buttons
    
    return `
    <div class="item-card">
        <div class="item-header">
            <span class="item-name">${item.name}</span>
            <span class="item-price">$${item.price}</span>
        </div>
        <p class="item-desc">${item.desc}</p>
        <button class="btn-add" onclick="addToCart('${item.id}', '${item.name}', ${item.price})">Agregar</button>
        ${adminBtns}
    </div>`;
}

// --- ADMIN ACTIONS ---
function openAdminModal() {
    // Clear fields for new item
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
    if (confirm("¿Estás seguro de borrar este platillo?")) {
        db.collection("menu").doc(id).delete().then(() => loadMenu());
    }
}

// --- CART LOGIC (Simplified from your original) ---
function addToCart(id, name, price) {
    const existing = cart.find(i => i.id === id);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ id, name, price, qty: 1 });
    }
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

// --- GALLERY (Swiper) ---
function setupGallery() {
    // You can also move gallery images to Firebase later if you want
    // For now, we keep the static logic or manual add
    const swiperWrapper = document.getElementById('gallery-wrapper');
    // Example static images - you can replace these with dynamic ones if you add a 'gallery' collection
    const images = [
        'assets/images/boneless1.jpg', // You need to ensure these files exist or use URLs
        'assets/images/boneless2.jpg'
    ];
    
    // If you don't have images locally, the swiper might look empty. 
    // You can populate this from menuData if items have imageUrls.
}

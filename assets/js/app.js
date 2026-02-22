// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBOvsein855aMcyGkw4GTkZ3UD_j-36QGQ",
  authDomain: "bongless2020.firebaseapp.com",
  projectId: "bongless2020",
  storageBucket: "bongless2020.firebasestorage.app",
  messagingSenderId: "959363193575",
  appId: "1:959363193575:web:40e71b7169bdcdcac46042"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
} catch(e) {
    console.error("Firebase failed to init. Did you paste the API keys?", e);
}

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
            const addBtn = document.getElementById('admin-add-btn');
            if(addBtn) addBtn.classList.add('visible');
            loadMenu(); // Reload to show edit buttons
        } else {
            isAdmin = false;
            document.getElementById('admin-login-btn').innerText = "Admin";
            const addBtn = document.getElementById('admin-add-btn');
            if(addBtn) addBtn.classList.remove('visible');
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

// --- MENU LOADING ---
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
            // Default section if missing
            const sec = item.section || 'combos';
            if (sections[sec]) {
                sections[sec].push(item);
            }
        });

        // If database is empty (first run), showing nothing is fine
        if(menuData.length === 0) {
             container.innerHTML = '<div class="loading">Menú vacío. (Admin: Agrega platillos)</div>';
             return;
        }

        renderMenuHTML(sections);
    }).catch(error => {
        console.error("Error loading menu:", error);
        container.innerHTML = '<p class="loading">Error cargando el menú. Revisa la consola (F12) para ver si falta la API Key.</p>';
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

    // Use placeholder image if none exists
    // You can paste any image URL into the admin panel later
    const imgDisplay = item.imageUrl ? `<img src="${item.imageUrl}" style="width:100%; height:150px; object-fit:cover; border-radius:8px; margin-bottom:10px;">` : '';

    return `
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
}

// --- ADMIN ACTIONS ---
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
    if (confirm("¿Estás seguro de borrar este platillo?")) {
        db.collection("menu").doc(id).delete().then(() => loadMenu());
    }
}

// --- CART LOGIC ---
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

// --- GALLERY (RESTORED) ---
function setupGallery() {
    const wrapper = document.getElementById('gallery-wrapper');
    if(!wrapper) return;

    // Use placeholder URLs if you don't have files. 
    // IF YOU HAVE FILES, change these paths.
    const images = [
        'assets/images/logo.png', // Temporary placeholder
        'assets/images/logo.png'  // Temporary placeholder
    ];
    
    // Attempt to load local images if they exist in your folder structure
    // If you deleted the folder, these will break.
    
    wrapper.innerHTML = images.map(src => 
        `<div class="swiper-slide"><img src="${src}" alt="Gallery"></div>`
    ).join('');

    new Swiper(".mySwiper", {
        pagination: { el: ".swiper-pagination", dynamicBullets: true },
        loop: true,
        autoplay: { delay: 3000 }
    });
}

// --- 1. FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyBOvsein855aMcyGkw4GTkZ3UD_j-36QGQ",
  authDomain: "bongless2020.firebaseapp.com",
  projectId: "bongless2020",
  storageBucket: "bongless2020.firebasestorage.app",
  messagingSenderId: "959363193575",
  appId: "1:959363193575:web:40e71b7169bdcdcac46042"
};


if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    var db = firebase.firestore();
    var auth = firebase.auth();
} else {
    console.error("Firebase SDK not loaded.");
}

// --- 2. GLOBAL VARIABLES ---
let isAdmin = false;
let cart = [];
let menuData = [];

// --- 3. ORIGINAL DATA BACKUP ---
const ORIGINAL_MENU = [
    {
        section: "combos", name: "PA'L ANTOJO", price: 160, desc: "250grs de boneless, papas fritas, aderezos y vegetales.",
        options: [{name: "Con Papas Fritas", price: 0}, {name: "Cambio a Papas Gajo", price: 30}]
    },
    {
        section: "combos", name: "PA'QUE DISFRUTES", price: 200, desc: "200grs de boneless, 200grs de papas fritas, bañado en salsa chipotle, ranch y perejil.",
        options: [{name: "Con Papas Fritas", price: 0}, {name: "Cambio a Papas Gajo", price: 40}]
    },
    {
        section: "combos", name: "PA'QUE PRUEBES", price: 220, desc: "300grs de boneless, porción de papas fritas, 5 aros de cebolla, aderezos y vegetales.",
        options: [{name: "Con Papas Fritas", price: 0}, {name: "Cambio a Papas Gajo", price: 30}]
    },
    {
        section: "combos", name: "PA'LOS DEMAS", price: 260, desc: "500grs de boneless, papas fritas, aderezos y vegetales.",
        options: [{name: "Con Papas Fritas", price: 0}, {name: "Cambio a Papas Gajo", price: 30}]
    },
    {
        section: "combos", name: "PA'QUE TE HARTES", price: 520, desc: "1kg de boneless, 1 orden de papas fritas, 1 orden de aros de cebolla, aderezos y vegetales.",
        options: [{name: "Con Papas Fritas", price: 0}, {name: "Cambio a Papas Gajo", price: 40}, {name: "Extra Papas Gajo", price: 60}]
    },
    {
        section: "combos", name: "PA'L ANTOJO ALITAS", price: 180, desc: "10pz de alitas, papas fritas, aderezos y vegetales.",
        options: [{name: "Con Papas Fritas", price: 0}, {name: "Cambio a Papas Gajo", price: 30}]
    },
    {
        section: "especiales", name: "PA'QUE TE MANCHES", price: 130, desc: "Papas fritas cubiertas de queso cheddar con tocino, cebollín y un toque de perejil.",
        options: [{name: "Con Papas Fritas", price: 0}, {name: "Con Papas Gajo", price: 20}]
    },
    { section: "especiales", name: "BOWL-LESS", price: 200, desc: "Lechuga romana con una porción de boneless, tomate cherry, queso parmesano y aderezo ranch." },
    { section: "ordenes", name: "Orden Papas Fritas", price: 80, desc: "Orden individual." },
    { section: "ordenes", name: "Orden Aros de Cebolla", price: 100, desc: "Orden individual." },
    { section: "ordenes", name: "Dedos de Queso (6pz)", price: 120, desc: "Con aderezo." },
    { section: "ordenes", name: "Orden Papas Gajo", price: 120, desc: "Sazonadas." }
];

// --- 4. STARTUP ---
document.addEventListener('DOMContentLoaded', () => {
    if (typeof auth !== 'undefined') {
        setupAuthListener();
        loadMenu();
    }
    setupGallery();
    setupScrollListener();
});

function setupScrollListener() {
    let lastScrollTop = 0;
    const header = document.querySelector(".main-header");
    window.addEventListener("scroll", function() {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            header.classList.add("header-hidden");
        } else {
            header.classList.remove("header-hidden");
        }
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }, false);
}

// --- 5. AUTH & ADMIN ---
function setupAuthListener() {
    auth.onAuthStateChanged(user => {
        const adminBtn = document.getElementById('admin-login-btn');
        const addBtn = document.getElementById('admin-add-btn');
        if (user) {
            isAdmin = true;
            if(adminBtn) adminBtn.innerText = "Salir";
            if(addBtn) addBtn.classList.add('visible');
            loadMenu(); 
        } else {
            isAdmin = false;
            if(adminBtn) adminBtn.innerText = "Admin";
            if(addBtn) addBtn.classList.remove('visible');
            loadMenu();
        }
    });
}

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

// --- 6. MENU LOAD & RENDER ---
function loadMenu() {
    const container = document.getElementById('menu-list');
    if(!container.querySelector('.menu-section')) {
        container.innerHTML = '<div class="loading"><i class="fas fa-fire fa-spin"></i> Cargando menú...</div>';
    }

    db.collection("menu").get().then((querySnapshot) => {
        const sections = { combos: [], especiales: [], ordenes: [] };
        menuData = [];

        querySnapshot.forEach((doc) => {
            const item = doc.data();
            item.id = doc.id;
            menuData.push(item);
            const sec = item.section || 'combos';
            if (sections[sec]) sections[sec].push(item);
        });

        if(menuData.length === 0) {
             if(isAdmin) {
                 container.innerHTML = `
                    <div class="loading" style="color:white">
                        <p>El menú está vacío.</p>
                        <button onclick="uploadDefaultMenu()" class="whatsapp-btn" style="margin-top:10px; background:orange;">RESTAURAR MENÚ ORIGINAL</button>
                    </div>`;
             } else {
                 container.innerHTML = '<div class="loading" style="color:white">Menú no disponible.</div>';
             }
             return;
        }

        renderMenuHTML(sections);
    }).catch(error => {
        console.error("Error loading menu:", error);
        container.innerHTML = '<div class="loading">Error de conexión.</div>';
    });
}

function uploadDefaultMenu() {
    if(!confirm("¿Deseas sobreescribir la base de datos con el menú original?")) return;
    
    // First, delete everything currently in the DB to avoid duplicates
    db.collection("menu").get().then(snapshot => {
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        return batch.commit();
    }).then(() => {
        // Then add the fresh items with options
        const batch = db.batch();
        ORIGINAL_MENU.forEach((item) => {
            const docRef = db.collection("menu").doc();
            batch.set(docRef, item);
        });
        return batch.commit();
    }).then(() => {
        alert("Menú restaurado con éxito. Las opciones de papas volverán a aparecer.");
        loadMenu();
    }).catch(e => alert("Error: " + e.message));
}

function renderMenuHTML(sections) {
    const container = document.getElementById('menu-list');
    let html = '';
    const titles = { combos: "Combos Bongless", especiales: "Especiales", ordenes: "Ordenes Extra" };

    // Add a button for Admin to reset menu even if not empty (in case they have bad data)
    if(isAdmin) {
        html += `<div style="text-align:center; margin-bottom:20px;">
                    <button onclick="uploadDefaultMenu()" style="background:#333; color:#555; border:none; padding:5px; border-radius:5px; font-size:0.7rem;">Forzar Restauración de Menú</button>
                 </div>`;
    }

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
            
            let imgSrc = item.imageUrl || ""; 
            let imgTag = "";
            if(imgSrc) {
                imgTag = `<img src="${imgSrc}" onclick="openLightbox('${imgSrc}')" style="width:100%; height:200px; object-fit:cover; border-radius:8px; margin-bottom:10px; cursor:zoom-in;">`;
            }

            // --- OPTIONS DROPDOWN ---
            let optionsHTML = '';
            if(item.options && item.options.length > 0) {
                optionsHTML = `<select id="opt-${item.id}" class="item-options-select">`;
                item.options.forEach(opt => {
                    optionsHTML += `<option value="${opt.name}::${opt.price}">${opt.name} ${opt.price > 0 ? '(+$'+opt.price+')' : ''}</option>`;
                });
                optionsHTML += `</select>`;
            }

            // --- ESCAPE SINGLE QUOTES TO FIX BUTTON BUG ---
            const safeName = item.name.replace(/'/g, "\\'"); // Fixes "PA'L" breaking the JS

            html += `
            <div class="item-card">
                ${imgTag}
                <div class="item-header">
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">$${item.price}</span>
                </div>
                <p class="item-desc">${item.desc}</p>
                ${optionsHTML}
                <button class="btn-add" onclick="addToCart('${item.id}', '${safeName}', ${item.price})">Agregar</button>
                ${adminBtns}
            </div>`;
        });
        html += `</div>`;
    }
    container.innerHTML = html;
}

// --- 7. CART SYSTEM ---
function addToCart(id, baseName, basePrice) {
    let finalName = baseName;
    let finalPrice = basePrice;

    // Check if item has options
    const select = document.getElementById(`opt-${id}`);
    if (select) {
        const val = select.value; // "Name::Price"
        if(val) {
            const parts = val.split('::');
            const optName = parts[0];
            const optPrice = parseFloat(parts[1]);
            
            if(optName !== "Con Papas Fritas") {
                finalName += ` (${optName})`;
            }
            finalPrice += optPrice;
        }
    }

    // Add to cart array
    const existing = cart.find(i => i.name === finalName && i.price === finalPrice);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ id: id, name: finalName, price: finalPrice, qty: 1 });
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

// --- 8. ADMIN ACTIONS ---
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
    if (confirm("¿Borrar este platillo?")) {
        db.collection("menu").doc(id).delete().then(() => loadMenu());
    }
}

// --- 9. GALLERY ---
function setupGallery() {
    const wrapper = document.getElementById('gallery-wrapper');
    if(!wrapper) return;
    const images = [];
    for (let i = 1; i <= 16; i++) {
        images.push(`assets/images/gallery/${i}.jpg`);
    }
    wrapper.innerHTML = images.map(src => 
        `<div class="swiper-slide"><img src="${src}" onclick="openLightbox('${src}')" onerror="this.style.display='none'"></div>`
    ).join('');
    new Swiper(".mySwiper", {
        pagination: { el: ".swiper-pagination", dynamicBullets: true },
        loop: true,
        autoplay: { delay: 2500, disableOnInteraction: false },
        slidesPerView: 1,
        spaceBetween: 10
    });
}

function openLightbox(src) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    if(lb && img) { img.src = src; lb.classList.add('active'); }
}
function closeLightbox() {
    const lb = document.getElementById('lightbox');
    if(lb) lb.classList.remove('active');
}
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;

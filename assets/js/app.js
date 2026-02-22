document.addEventListener('DOMContentLoaded', () => {
    
    // --- CONFIGURATION ---
    const GALLERY_IMAGES = [
        "1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg", 
        "6.jpg", "7.jpg", "8.jpg", "9.jpg", "10.jpg",
        "11.jpg", "12.jpg", "13.jpg", "14.jpg", "15.jpg",
        "16.jpg"
    ];

    // DOM Elements
    const menuList = document.getElementById('menu-list');
    const galleryWrapper = document.getElementById('gallery-wrapper');
    const cartFloater = document.getElementById('cart-floater');
    const cartCount = document.getElementById('cart-count');
    const cartTotalLabel = document.getElementById('cart-total');
    const cartModal = document.getElementById('cart-modal');
    const cartItemsContainer = document.getElementById('cart-items');
    const modalTotal = document.getElementById('modal-total');
    
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');

    // State
    let MENU_DATA = {};
    let CART = [];

    // Initialize
    initGallery();
    fetchMenu();

    // --- 1. GALLERY LOGIC ---
    function initGallery() {
        if(!galleryWrapper) return;

        galleryWrapper.innerHTML = GALLERY_IMAGES.map(img => `
            <div class="swiper-slide">
                <img src="assets/images/gallery/${img}" alt="Platillo Bongless" loading="lazy" onclick="openLightbox(this.src)">
            </div>
        `).join('');

        new Swiper(".mySwiper", {
            slidesPerView: 1.2, 
            spaceBetween: 10,
            centeredSlides: true,
            loop: true,
            autoplay: {
                delay: 3000,
                disableOnInteraction: false,
            },
            pagination: {
                el: ".swiper-pagination",
                clickable: true,
            },
            breakpoints: {
                640: { slidesPerView: 2.2, spaceBetween: 20 },
                1024: { slidesPerView: 3.5, spaceBetween: 30 },
            },
        });
    }

    window.openLightbox = function(src) {
        lightbox.classList.add('active');
        lightboxImg.src = src;
    }

    window.closeLightbox = function() {
        lightbox.classList.remove('active');
    }

    // --- 2. MENU LOGIC ---
    async function fetchMenu() {
        try {
            const response = await fetch('assets/data/menu.json?v=' + new Date().getTime());
            if (!response.ok) throw new Error('Failed to load menu');
            
            const data = await response.json();
            MENU_DATA = data;
            
            const badge = document.getElementById('status-badge');
            if(data.info.status !== 'open') {
                badge.innerText = "CERRADO";
                badge.style.color = "red";
                badge.style.background = "rgba(255,0,0,0.1)";
                badge.style.borderColor = "red";
            }

            renderMenu(data);
        } catch (error) {
            menuList.innerHTML = `<div class="loading" style="color:red">Error cargando menú. Intenta recargar.</div>`;
            console.error(error);
        }
    }

    function renderMenu(data) {
        menuList.innerHTML = '';
        const salsas = data.salsas || [];

        data.sections.forEach(section => {
            const sectionHtml = document.createElement('div');
            sectionHtml.className = 'menu-section';
            
            let html = `<h3 class="section-title">${section.title}</h3>`;
            
            section.items.forEach(item => {
                const needsSalsa = section.id === 'combos';
                html += buildItemCard(item, needsSalsa, salsas);
            });

            sectionHtml.innerHTML = html;
            menuList.appendChild(sectionHtml);
        });
    }

    function buildItemCard(item, needsSalsa, salsas) {
        let optionsHtml = '';
        let salsaHtml = '';

        if (item.options && item.options.length > 0) {
            optionsHtml = `
                <div class="option-group">
                    <label class="option-label">Acompañamiento:</label>
                    <select class="custom-select" id="opt-${item.id}">
                        ${item.options.map((opt, idx) => 
                            `<option value="${idx}" data-price="${opt.price}">${opt.name} ${opt.price > 0 ? '(+$'+opt.price+')' : ''}</option>`
                        ).join('')}
                    </select>
                </div>
            `;
        }

        if (needsSalsa) {
            salsaHtml = `
                <div class="option-group">
                    <label class="option-label">Elige tu Salsa:</label>
                    <select class="custom-select" id="salsa-${item.id}">
                        ${salsas.map(s => `<option value="${s}">${s}</option>`).join('')}
                    </select>
                </div>
            `;
        }

        const inputsArea = (optionsHtml || salsaHtml) ? `<div class="options-area">${optionsHtml}${salsaHtml}</div>` : '';

        return `
            <div class="item-card">
                <div class="item-header">
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">$${item.price}</span>
                </div>
                <p class="item-desc">${item.desc || ''}</p>
                ${inputsArea}
                <button class="btn-add" onclick="addToCart('${item.id}')">AGREGAR</button>
            </div>
        `;
    }

    // --- 3. CART LOGIC ---
    window.addToCart = function(itemId) {
        let itemData = null;
        for (const sec of MENU_DATA.sections) {
            const found = sec.items.find(i => i.id === itemId);
            if (found) { itemData = found; break; }
        }
        if (!itemData) return;

        let finalPrice = itemData.price;
        let selectedOption = null;
        let selectedSalsa = null;

        const optSelect = document.getElementById(`opt-${itemId}`);
        if (optSelect) {
            const idx = optSelect.value;
            const optObj = itemData.options[idx];
            finalPrice += optObj.price;
            selectedOption = optObj.name;
        }

        const salsaSelect = document.getElementById(`salsa-${itemId}`);
        if (salsaSelect) {
            selectedSalsa = salsaSelect.value;
        }

        CART.push({
            id: itemId,
            name: itemData.name,
            basePrice: itemData.price,
            finalPrice: finalPrice,
            option: selectedOption,
            salsa: selectedSalsa
        });

        updateCartUI();
    };

    window.removeFromCart = function(index) {
        CART.splice(index, 1);
        updateCartUI();
        if (CART.length === 0) closeCart();
    };

    function updateCartUI() {
        const total = CART.reduce((sum, item) => sum + item.finalPrice, 0);
        
        cartCount.innerText = CART.length;
        cartTotalLabel.innerText = `$${total}`;
        modalTotal.innerText = `$${total}`;

        if (CART.length > 0) cartFloater.classList.add('active');
        else cartFloater.classList.remove('active');

        renderCartItems();
    }

    function renderCartItems() {
        if (CART.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-msg" style="text-align:center; color:#666; padding:20px;">Tu carrito está vacío.</p>';
            return;
        }

        cartItemsContainer.innerHTML = CART.map((item, index) => `
            <div class="cart-item-row">
                <div class="item-details-left">
                    <h4>${item.name}</h4>
                    <p>
                        ${item.option ? item.option : ''} 
                        ${item.salsa ? ' • ' + item.salsa : ''}
                    </p>
                </div>
                <div class="item-price-right">
                    <span class="price">$${item.finalPrice}</span>
                    <button class="delete-btn" onclick="removeFromCart(${index})">Eliminar</button>
                </div>
            </div>
        `).join('');
    }

    window.openCart = function() { cartModal.classList.add('open'); };
    window.closeCart = function() { cartModal.classList.remove('open'); };

    // --- 4. WHATSAPP LOGIC ---
    window.sendOrder = function() {
        if (CART.length === 0) return;

        let msg = "🔥 *NUEVO PEDIDO - BONGLESS 2020* 🔥\n\n";
        
        CART.forEach((item) => {
            msg += `▪️ *${item.name}*\n`;
            if (item.option) msg += `   └ ${item.option}\n`;
            if (item.salsa)  msg += `   └ Salsa: ${item.salsa}\n`;
            msg += `   💲 $${item.finalPrice}\n\n`;
        });

        const total = CART.reduce((sum, item) => sum + item.finalPrice, 0);
        msg += `💰 *TOTAL: $${total}*\n`;
        msg += `📍 *Dirección:* (Escribe tu dirección aquí)\n`;
        msg += `📝 *Notas:* \n`;

        const phone = MENU_DATA.info.phone;
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
        
        window.open(url, '_blank');
    };
});
/* --- SCROLL AWARE HEADER LOGIC --- */
document.addEventListener('DOMContentLoaded', function() {
    const header = document.querySelector('.main-header');
    const body = document.body;
    let lastScrollTop = 0;
    const scrollThreshold = 100; // How far to scroll before hiding

    // 1. Compensate for the fixed header by adding padding to body
    function adjustBodyPadding() {
        if(header) {
            const headerHeight = header.offsetHeight;
            body.style.paddingTop = headerHeight + 'px';
        }
    }

    // Run on load and resize
    adjustBodyPadding();
    window.addEventListener('resize', adjustBodyPadding);

    // 2. Hide/Show logic on scroll
    window.addEventListener('scroll', function() {
        let currentScroll = window.pageYOffset || document.documentElement.scrollTop;

        // Prevent negative scroll values on mobile (rubber banding)
        if (currentScroll <= 0) {
            header.classList.remove('header-hidden');
            lastScrollTop = 0;
            return;
        }

        // If scrolling DOWN and passed threshold
        if (currentScroll > lastScrollTop && currentScroll > scrollThreshold) {
            header.classList.add('header-hidden');
        } 
        // If scrolling UP
        else if (currentScroll < lastScrollTop) {
            header.classList.remove('header-hidden');
        }

        lastScrollTop = currentScroll;
    }, { passive: true });
});

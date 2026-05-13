// user/js/core.js
document.addEventListener('DOMContentLoaded', async () => {
    if (!getAccessToken()) {
        redirectTo('login.html');
        return;
    }

    try {
        const user = await fetchAPI('/users/me/');
        renderUserLayout(user.first_name || user.username);
    } catch (e) {
        window.logout();
    }
});

function renderUserLayout() {
    updateCartCount();
}

async function updateCartCount() {
    try {
        const cart = await fetchAPI('/cart/');
        const legacyBadge = document.getElementById('cart-count');
        if (legacyBadge) legacyBadge.innerText = cart.total_items || 0;
        if (typeof updateCartBadge === 'function') updateCartBadge();
    } catch (e) {}
}

// js/auth-banner.js

document.addEventListener('DOMContentLoaded', () => {
    const ALBUM_PATH = 'images/album/';
    const SWITCH_TIME = 7000;
    const ACTIVE_IMAGE_LIMIT = 3;

    const IMAGE_LIST = [
        'shutterstock_673842874.jpg',
        'shutterstock_660832780.jpg',
        'shutterstock_2577344341.jpg',
        'shutterstock_563270320.jpg',
        'shutterstock_409344172.jpg',
        'shutterstock_561677989.jpg',
        'shutterstock_2528928597.jpg',
        'shutterstock_2548605069.jpg',
        'shutterstock_2222352899.jpg',
        'shutterstock_2308801975.jpg',
        'hospital.jpg',
        'shutterstock_317578871.jpg',
        'shutterstock_1878018001.jpg',
        'shutterstock_2561976731.jpg',
        'shutterstock_1871428867.jpg',
        'shutterstock_2437888025.jpg',
        'shutterstock_2364843827.jpg',
        'shutterstock_2431406087.jpg',
        'shutterstock_2445632105.jpg',
        'shutterstock_2631423457.jpg'
    ];

    const container = document.getElementById('banner-slideshow');
    if (!container || IMAGE_LIST.length === 0) return;

    const selectedImages = pickRandomImages(IMAGE_LIST, ACTIVE_IMAGE_LIMIT);
    const slides = selectedImages.map(createSlide);
    let currentIdx = -1;

    slides.forEach((slide) => container.appendChild(slide));

    setTimeout(() => {
        showNextSlide();
        if (slides.length > 1) {
            setInterval(showNextSlide, SWITCH_TIME);
        }
    }, 200);

    function pickRandomImages(images, limit) {
        return [...images]
            .sort(() => Math.random() - 0.5)
            .slice(0, Math.min(limit, images.length));
    }

    function createSlide(filename) {
        const slide = document.createElement('div');
        slide.className = 'banner-slide';
        slide.style.backgroundImage = `url('${ALBUM_PATH}${filename}')`;
        return slide;
    }

    function showNextSlide() {
        let nextIdx;
        do {
            nextIdx = Math.floor(Math.random() * slides.length);
        } while (slides.length > 1 && nextIdx === currentIdx);

        if (currentIdx >= 0) {
            const oldSlide = slides[currentIdx];
            oldSlide.classList.remove('active');
            setTimeout(() => oldSlide.classList.remove('zooming'), 2500);
        }

        const nextSlide = slides[nextIdx];
        nextSlide.classList.remove('zooming');
        void nextSlide.offsetWidth;
        nextSlide.classList.add('active', 'zooming');
        currentIdx = nextIdx;
    }
});

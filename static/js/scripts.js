function showToast(message, type='success') {
    const toast = document.getElementById('toast-msg');
    toast.textContent = message;
    toast.className = 'toast fade-in ' + type;
    setTimeout(() => {
        toast.className = 'toast fade-out ' + type;
    }, 1850);
    setTimeout(() => {
        toast.textContent = '';
        toast.className = 'toast';
    }, 2550);
}

document.addEventListener('DOMContentLoaded', function () {
    // Animate navbar and nav links using anime.js
    anime({
        targets: '.navbar',
        opacity: [0, 1],
        translateY: [-40, 0],
        duration: 1100,
        easing: 'easeOutExpo'
    });

    anime({
        targets: '.nav-links li',
        opacity: [0, 1],
        translateY: [-22, 0],
        delay: anime.stagger(120, { start: 700 }),
        duration: 700,
        easing: 'easeOutExpo'
    });

    // Form animation
    if (document.querySelector('.form-wrapper')) {
        anime({
            targets: '.form-wrapper',
            scale: [0.8, 1],
            opacity: [0, 1],
            duration: 800,
            easing: 'easeOutExpo'
        });
    }

    // Home page animation
    if (document.querySelector('.center-page-box')) {
        anime({
            targets: '.center-page-box',
            scale: [0.9, 1],
            opacity: [0, 1],
            duration: 900,
            easing: 'easeOutExpo'
        });
    }

    // Social icons animation
    if (document.querySelector('.social-section')) {
        anime({
            targets: '.social-section .social-icon',
            scale: [0.8, 1],
            opacity: [0, 1],
            delay: anime.stagger(100, { start: 400 }),
            duration: 600,
            easing: 'easeOutBack'
        });
    }

    // Check for Flask-flashed messages (rendered as hidden)
    const flashMsgEls = document.querySelectorAll('.flash-raw');
    flashMsgEls.forEach(el => {
        showToast(el.textContent, el.dataset.type);
        el.remove();
    });

    // Theme toggle logic
    const toggleBtn = document.getElementById('theme-toggle');
    if(toggleBtn){
        toggleBtn.addEventListener('click', () => {
            fetch('/toggle_theme', { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                    document.documentElement.setAttribute('data-theme', data.theme);
                    document.body.className = data.theme;
                    toggleBtn.textContent = data.theme === 'dark' ? '🌙' : '☀️';
                    
                    // Animate theme change
                    anime({
                        targets: 'body',
                        duration: 300,
                        easing: 'easeInOutQuad'
                    });
                });
        });
        
        // On load, set icon based on current theme
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        toggleBtn.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
});

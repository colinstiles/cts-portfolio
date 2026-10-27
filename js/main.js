(function () {
    'use strict';

    var toggle = document.querySelector('.nav-toggle');
    var links = document.getElementById('nav-links');
    if (toggle && links) {
        toggle.addEventListener('click', function () {
            var open = links.classList.toggle('open');
            toggle.setAttribute('aria-expanded', String(open));
        });
        links.addEventListener('click', function (e) {
            if (e.target.tagName === 'A') {
                links.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // In-page links scroll without adding history entries, so Back leaves the site
    // instead of stepping through every section the visitor clicked. The URL hash is
    // still updated (replaceState) so the current section remains shareable.
    document.addEventListener('click', function (e) {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { return; }
        var a = e.target.closest && e.target.closest('a[href^="#"]');
        if (!a) { return; }
        var id = decodeURIComponent(a.getAttribute('href').slice(1));
        var target = id ? document.getElementById(id) : document.body;
        if (!target) { return; }
        e.preventDefault();
        // #top is the sticky header, which counts as already visible, so scrollIntoView would barely move; go to 0 instead.
        if (id === 'top') { window.scrollTo(0, 0); } else { target.scrollIntoView(); }   // smooth scrolling and header offset come from CSS
        if (target.id) {
            if (!target.hasAttribute('tabindex')) { target.setAttribute('tabindex', '-1'); }
            target.focus({ preventScroll: true });
        }
        try { history.replaceState(null, '', id && id !== 'top' ? '#' + id : location.pathname + location.search); } catch (err) { /* e.g. file:// */ }
    });

    // Embedded apps: any element with data-app-url opens that app in a modal. The iframe is only
    // given a src on launch (and cleared on close), so nothing heavy loads until someone asks for it.
    var modal = document.getElementById('app-modal');
    if (modal && typeof modal.showModal === 'function') {
        var frame = document.getElementById('app-modal-frame');
        var modalTitle = document.getElementById('app-modal-title');
        var modalOpen = document.getElementById('app-modal-open');
        document.addEventListener('click', function (e) {
            var trigger = e.target.closest && e.target.closest('[data-app-url]');
            if (!trigger) { return; }
            e.preventDefault();
            var appUrl = trigger.getAttribute('data-app-url');
            var title = trigger.getAttribute('data-app-title') || 'App';
            modalTitle.textContent = title;
            frame.title = title;
            modalOpen.href = appUrl;
            frame.src = appUrl;
            document.documentElement.style.overflow = 'hidden';
            modal.showModal();
        });
        document.getElementById('app-modal-close').addEventListener('click', function () { modal.close(); });
        modal.addEventListener('click', function (e) { if (e.target === modal) { modal.close(); } });   // backdrop click
        modal.addEventListener('close', function () {
            frame.src = 'about:blank';
            document.documentElement.style.overflow = '';
        });
    } else {
        // No <dialog> support: fall back to opening the app in a new tab
        document.addEventListener('click', function (e) {
            var trigger = e.target.closest && e.target.closest('[data-app-url]');
            if (trigger) { e.preventDefault(); window.open(trigger.getAttribute('data-app-url'), '_blank', 'noopener'); }
        });
    }

    // Back-to-top button appears once the visitor has scrolled past the hero.
    var toTop = document.querySelector('.to-top');
    if (toTop) {
        var ticking = false;
        var update = function () {
            toTop.classList.toggle('visible', window.scrollY > 600);
            ticking = false;
        };
        window.addEventListener('scroll', function () {
            if (!ticking) { ticking = true; requestAnimationFrame(update); }
        }, { passive: true });
        update();
    }

    var year = document.getElementById('year');
    if (year) { year.textContent = new Date().getFullYear(); }
})();

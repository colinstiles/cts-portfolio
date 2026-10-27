/* Small interactive Mars globe that sits beside the Earth globe.
   There is no vector coastline on Mars, so the NASA MOLA elevation map is wrapped onto an
   orthographic sphere with a per-pixel inverse projection on a canvas. Drag to rotate; selecting a
   Mars project in the list (see globe.js) flies the globe to its pin. Pins open the embedded app. */
(function () {
    'use strict';

    var TEXTURE_URL = 'images/site/mars-mola-2048.jpg';   // equirectangular, lon -180..180, NASA/JPL MOLA (public domain)
    var N = 440;                                           // canvas resolution (CSS size is set by the layout)
    var RAD = Math.PI / 180;

    var host = document.getElementById('mars-globe');
    var projects = (window.PortfolioProjects || []).filter(function (p) { return p.body === 'mars'; });
    if (!host || !projects.length) { return; }

    var wrap = host.parentNode;                            // .globe-wrap, so the Earth can dim while Mars is selected
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var canvas = document.createElement('canvas');
    canvas.width = N;
    canvas.height = N;
    canvas.className = 'mars-canvas';
    host.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    if (!ctx) { return; }

    var label = document.createElement('span');
    label.className = 'mars-label';
    label.textContent = 'Mars';
    host.appendChild(label);

    // View centre (degrees). Start with the pin visible but off-centre so it reads as a globe, not a target.
    var view = { lon: projects[0].lon + 38, lat: 14 };
    var flight = null;
    var dragging = false;
    var last = null;
    var dirty = true;
    var onscreen = true;

    // ---- Pins (real buttons, so they are focusable and open the embedded app) ----
    var pinEls = projects.map(function (p) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'mars-pin';
        b.setAttribute('aria-label', p.title + ', ' + p.place + '. Launches the app.');
        b.title = p.title;
        if (p.app) {
            b.setAttribute('data-app-url', p.app.url);
            b.setAttribute('data-app-title', p.app.title);
        }
        host.appendChild(b);
        return b;
    });

    function placePins() {
        var l0 = view.lon * RAD, f0 = view.lat * RAD;
        projects.forEach(function (p, i) {
            var l = p.lon * RAD, f = p.lat * RAD, dl = l - l0;
            var cosc = Math.sin(f0) * Math.sin(f) + Math.cos(f0) * Math.cos(f) * Math.cos(dl);
            var b = pinEls[i];
            if (cosc < 0.06) { b.style.display = 'none'; return; }
            var x = Math.cos(f) * Math.sin(dl);
            var y = Math.cos(f0) * Math.sin(f) - Math.sin(f0) * Math.cos(f) * Math.cos(dl);
            b.style.display = '';
            b.style.left = (50 + 50 * x) + '%';
            b.style.top = (50 - 50 * y) + '%';
        });
    }

    // ---- Rendering ----
    var tex = null;            // { w, h, data } sampled by nearest-neighbour from a pre-shrunk copy
    var nx = new Float32Array(N * N);
    var ny = new Float32Array(N * N);
    var nz = new Float32Array(N * N);
    var inside = new Uint8Array(N * N);
    (function () {
        var c = (N - 1) / 2;
        for (var y = 0; y < N; y++) {
            for (var x = 0; x < N; x++) {
                var k = y * N + x;
                var px = (x - c) / (N / 2), py = (c - y) / (N / 2);
                var r2 = px * px + py * py;
                nx[k] = px; ny[k] = py;
                if (r2 <= 1) { inside[k] = 1; nz[k] = Math.sqrt(1 - r2); }
            }
        }
    })();
    var frame = ctx.createImageData(N, N);

    function render() {
        dirty = false;
        placePins();
        if (!tex) { return; }
        var out = frame.data, src = tex.data, W = tex.w, H = tex.h;
        var l0 = view.lon * RAD, f0 = view.lat * RAD;
        var s0 = Math.sin(f0), c0 = Math.cos(f0);
        var TWO_PI = 2 * Math.PI;
        for (var k = 0, n = N * N; k < n; k++) {
            var o = k * 4;
            if (!inside[k]) { out[o + 3] = 0; continue; }
            var z = nz[k], y = ny[k];
            var sinf = z * s0 + y * c0;
            var f = Math.asin(sinf > 1 ? 1 : sinf < -1 ? -1 : sinf);
            var l = l0 + Math.atan2(nx[k], z * c0 - y * s0);
            var u = (l + Math.PI) / TWO_PI; u -= Math.floor(u);
            var v = (Math.PI / 2 - f) / Math.PI;
            var tx = (u * W) | 0, ty = (v * H) | 0;
            if (ty >= H) { ty = H - 1; }
            var t = (ty * W + tx) * 4;
            out[o] = src[t]; out[o + 1] = src[t + 1]; out[o + 2] = src[t + 2]; out[o + 3] = 255;
        }
        ctx.putImageData(frame, 0, 0);
    }

    function loadTexture() {
        var img = new Image();
        img.onload = function () {
            var w = 1536, h = 768;                          // shrink once so sampling a ~440px disc does not alias
            var c = document.createElement('canvas');
            c.width = w; c.height = h;
            var cx = c.getContext('2d');
            cx.imageSmoothingQuality = 'high';
            cx.drawImage(img, 0, 0, w, h);
            tex = { w: w, h: h, data: cx.getImageData(0, 0, w, h).data };
            host.classList.add('ready');
            dirty = true;
        };
        img.src = TEXTURE_URL;                              // on failure the CSS terracotta disc stays
    }

    // ---- Interaction ----
    host.addEventListener('pointerdown', function (e) {
        if (e.target.closest && e.target.closest('.mars-pin')) { return; }
        dragging = true;
        flight = null;
        last = [e.clientX, e.clientY];
        host.setPointerCapture(e.pointerId);
    });
    host.addEventListener('pointermove', function (e) {
        if (!dragging) { return; }
        var k = 0.4;
        view.lon -= (e.clientX - last[0]) * k;
        view.lat = Math.max(-70, Math.min(70, view.lat + (e.clientY - last[1]) * k));
        last = [e.clientX, e.clientY];
        dirty = true;
    });
    function endDrag() { dragging = false; }
    host.addEventListener('pointerup', endDrag);
    host.addEventListener('pointercancel', endDrag);

    function setActive(on) {
        host.classList.toggle('active', on);
        wrap.classList.toggle('mars-active', on);
    }

    function flyTo(p) {
        var from = { lon: view.lon, lat: view.lat };
        var to = { lon: p.lon, lat: p.lat * 0.8 + 6 };
        var dl = ((to.lon - from.lon + 540) % 360) - 180;
        flight = { t0: null, from: from, dl: dl, dp: to.lat - from.lat, dur: reduceMotion ? 1 : 900 };
    }

    // The list in globe.js announces every selection; only react to Mars projects.
    document.addEventListener('globeselect', function (e) {
        var p = e.detail && e.detail.project;
        var mine = !!p && p.body === 'mars';
        setActive(mine);
        if (mine) { flyTo(p); }
    });

    function tick(now) {
        if (flight) {
            if (flight.t0 === null) { flight.t0 = now; }
            var t = Math.min(1, (now - flight.t0) / flight.dur);
            var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            view.lon = flight.from.lon + flight.dl * e;
            view.lat = flight.from.lat + flight.dp * e;
            if (t >= 1) { flight = null; }
            dirty = true;
        }
        if (dirty && onscreen && !document.hidden) { render(); }
        requestAnimationFrame(tick);
    }

    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            onscreen = entries[0].isIntersecting;
            if (onscreen) { dirty = true; }
        }).observe(host);
    }

    host.hidden = false;
    placePins();
    loadTexture();
    requestAnimationFrame(tick);
})();

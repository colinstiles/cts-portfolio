/* Interactive globe: drag to rotate, click a pin or list item to open a map collection. */
(function () {
    'use strict';

    var GALLERY = 'map-gallery.html?collection=';
    var WORLD_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json';

    // lon/lat are approximate study-area centers (WGS84 degrees)
    // image/alt/count: the map snippet shown when a project is selected (thumbnails live in images/work/)
    var PROJECTS = [
        { title: 'Tennessee State Forests', place: 'Tennessee, USA', lon: -85.6, lat: 35.8, collection: 'state-forests', count: 6, alt: 'Bledsoe State Forest public use map' },
        { title: 'Hydrologic Subbasins', place: 'Various locations', lon: -80.6, lat: 38.6, collection: 'terrain-hydrology', count: 6, alt: 'Hydrologic subbasin map' },
        { title: 'Viewshed & Site Planning', place: 'Georgia & West Virginia, USA', lon: -83.4, lat: 32.7, collection: 'forestry-planning', count: 9, alt: 'Prioritized tree-trimming site plan' },
        { title: 'Ogallala Aquifer', place: 'Nebraska, USA', lon: -100.3, lat: 41.2, collection: 'ogallala', count: 19, alt: 'Ogallala Aquifer groundwater map of Nebraska' },
        { title: 'Clearwater Remote Sensing', place: 'Idaho, USA', lon: -115.8, lat: 46.6, collection: 'remote-sensing', count: 3, alt: 'Tree species map of Clearwater, Idaho' },
        { title: 'Philippines Geohazards', place: 'Philippine Islands', lon: 122.0, lat: 12.9, collection: 'philippines', count: 13, alt: 'Earthquake map of the Philippine Islands' },
        // body: 'mars' projects are drawn on the Mars globe (js/mars.js) and carry an embeddable app instead of a map collection
        {
            title: 'Mars Planetary Mapping', place: 'Mars · Aram Chaos', body: 'mars', lon: -21.0, lat: 2.6,
            app: { url: 'https://experience.arcgis.com/experience/ded16d793dd6417d8e379103ad1439b5', title: 'Mars Planetary Mapping – Web Application' },
            image: 'images/work/aram-chaos.jpg', alt: 'Cost-distance routes and contour lines across Aram Chaos on Mars',
            blurb: 'A fictional marathon on Mars: a proof of concept for cost-distance analysis, built as an interactive web application.'
        }
    ];
    window.PortfolioProjects = PROJECTS;     // read by mars.js

    var host = document.getElementById('globe');
    var list = document.getElementById('project-list');
    var tip = document.getElementById('globe-tip');
    if (!host || !list) { return; }

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var NS = 'http://www.w3.org/2000/svg';
    var SIZE = 600;

    function url(p) { return p.app ? p.app.url : GALLERY + p.collection; }
    function open(p) { window.open(url(p), '_blank', 'noopener'); }

    // ---- Project list (works even if the globe fails to load) ----
    // Selecting a row expands a snippet of one of its maps; the globe flies there once it has loaded.
    var listButtons = [];
    var previews = [];
    var pins = [];
    var activeIndex = -1;
    var onSelect = null;                    // set to flyTo when the globe is ready
    var onDeselect = null;                  // set when the globe is ready; returns the Earth to its idle spin

    function setActive(i) {
        activeIndex = i;
        listButtons.forEach(function (b, j) {
            b.classList.toggle('active', j === i);
            b.setAttribute('aria-expanded', String(j === i));
        });
        previews.forEach(function (pv, j) { pv.classList.toggle('open', j === i); });
        pins.forEach(function (g, j) { if (g) { g.classList.toggle('active', j === i); } });
        // let the Mars globe (mars.js) react to the selection
        document.dispatchEvent(new CustomEvent('globeselect', { detail: { index: i, project: PROJECTS[i] } }));
    }

    PROJECTS.forEach(function (p, i) {
        var li = document.createElement('li');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'project-btn-' + i;
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-controls', 'project-preview-' + i);
        btn.innerHTML = '<span><span class="p-title"></span><span class="p-place"></span></span>';
        btn.querySelector('.p-title').textContent = p.title;
        btn.querySelector('.p-place').textContent = p.place;
        var a = document.createElement('a');
        a.className = 'p-open';
        a.href = url(p);
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = 'Open ↗';

        var preview = document.createElement('div');
        preview.className = 'p-preview';
        preview.id = 'project-preview-' + i;
        preview.setAttribute('role', 'region');
        preview.setAttribute('aria-labelledby', btn.id);
        var inner = document.createElement('div');
        if (p.app) {
            // app project: thumbnail, blurb, and a button that opens the embedded app (see main.js)
            var card = document.createElement('div');
            card.className = 'p-app';
            var aimg = document.createElement('img');
            aimg.src = p.image;
            aimg.alt = p.alt;
            aimg.loading = 'lazy';
            aimg.width = 395;
            aimg.height = 551;
            var text = document.createElement('div');
            text.className = 'p-app-text';
            var blurb = document.createElement('p');
            blurb.textContent = p.blurb;
            var launch = document.createElement('button');
            launch.type = 'button';
            launch.className = 'btn btn-small';
            launch.textContent = 'Launch app here';
            launch.setAttribute('data-app-url', p.app.url);
            launch.setAttribute('data-app-title', p.app.title);
            var credit = document.createElement('span');
            credit.className = 'p-count';
            credit.textContent = 'Globe surface: NASA MOLA';
            text.appendChild(blurb);
            text.appendChild(launch);
            text.appendChild(credit);
            card.appendChild(aimg);
            card.appendChild(text);
            inner.appendChild(card);
        } else {
            var thumb = document.createElement('a');
            thumb.className = 'p-thumb';
            thumb.href = url(p);
            thumb.target = '_blank';
            thumb.rel = 'noopener noreferrer';
            var img = document.createElement('img');
            img.src = 'images/work/gallery-' + p.collection + '.jpg';
            img.alt = p.alt;
            img.loading = 'lazy';
            img.width = 1200;
            img.height = 744;
            var cap = document.createElement('span');
            cap.className = 'p-count';
            cap.textContent = p.count + ' maps in this collection';
            thumb.appendChild(img);
            thumb.appendChild(cap);
            inner.appendChild(thumb);
        }
        preview.appendChild(inner);

        li.appendChild(btn);
        li.appendChild(a);
        li.appendChild(preview);
        list.appendChild(li);
        listButtons[i] = btn;
        previews[i] = preview;
        btn.addEventListener('click', function () {
            if (activeIndex === i) {                        // clicking the open card closes it and returns to the default view
                setActive(-1);
                if (onDeselect) { onDeselect(); }
                return;
            }
            setActive(i);
            if (onSelect && !p.body) { onSelect(i); }       // other bodies are handled by their own globe
        });
    });

    if (!window.d3 || !window.d3.geoOrthographic || !window.topojson) {
        host.textContent = 'The globe could not load. Use the project list instead.';
        return;
    }

    var d3 = window.d3;
    var projection = d3.geoOrthographic().scale(SIZE / 2 - 8).translate([SIZE / 2, SIZE / 2]).clipAngle(90);
    var path = d3.geoPath(projection);
    var graticule = d3.geoGraticule10();
    var rotation = [96, -36];               // start centered on the central U.S.
    var land = null;
    var dragging = false;
    var hovering = false;
    var autoRotate = !reduceMotion;
    var flight = null;

    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + SIZE + ' ' + SIZE);
    svg.setAttribute('aria-hidden', 'true');
    host.appendChild(svg);

    function el(name, cls, parent) {
        var n = document.createElementNS(NS, name);
        if (cls) { n.setAttribute('class', cls); }
        (parent || svg).appendChild(n);
        return n;
    }

    var sphereEl = el('path', 'sphere');
    var gratEl = el('path', 'graticule');
    var landEl = el('path', 'land');
    var pinLayer = el('g');

    pins = PROJECTS.map(function (p, i) {
        if (p.body) { return null; }                      // not on Earth
        var g = el('g', 'pin', pinLayer);
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'link');
        g.setAttribute('aria-label', p.title + ', ' + p.place + '. Opens the map collection.');
        el('circle', 'halo', g).setAttribute('r', '7');
        el('circle', 'dot', g).setAttribute('r', '6');
        g.addEventListener('click', function () { open(p); });
        g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(p); } });
        g.addEventListener('mouseenter', function () { showTip(i); });
        g.addEventListener('mouseleave', hideTip);
        g.addEventListener('focus', function () { showTip(i); });
        g.addEventListener('blur', hideTip);
        return g;
    });

    function showTip(i) {
        var pt = projection([PROJECTS[i].lon, PROJECTS[i].lat]);
        if (!pt) { return; }
        var box = host.getBoundingClientRect();
        tip.textContent = PROJECTS[i].title;
        tip.style.left = (pt[0] / SIZE * box.width) + 'px';
        tip.style.top = (pt[1] / SIZE * box.height) + 'px';
        tip.hidden = false;
    }
    function hideTip() { tip.hidden = true; }

    function draw() {
        projection.rotate([rotation[0], rotation[1]]);
        sphereEl.setAttribute('d', path({ type: 'Sphere' }));
        gratEl.setAttribute('d', path(graticule));
        if (land) { landEl.setAttribute('d', path(land)); }
        var center = [-rotation[0], -rotation[1]];
        PROJECTS.forEach(function (p, i) {
            var g = pins[i];
            if (!g) { return; }
            var visible = d3.geoDistance([p.lon, p.lat], center) < Math.PI / 2 - 0.08;
            if (!visible) { g.style.display = 'none'; return; }
            var pt = projection([p.lon, p.lat]);
            g.style.display = '';
            g.setAttribute('transform', 'translate(' + pt[0].toFixed(1) + ',' + pt[1].toFixed(1) + ')');
        });
    }

    // ---- Interaction ----
    var last = null;
    svg.addEventListener('pointerdown', function (e) {
        if (e.target.closest && e.target.closest('.pin')) { return; }
        dragging = true;
        flight = null;
        autoRotate = false;
        last = [e.clientX, e.clientY];
        svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener('pointermove', function (e) {
        if (!dragging) { return; }
        var k = 0.28;
        rotation[0] += (e.clientX - last[0]) * k;
        rotation[1] = Math.max(-70, Math.min(70, rotation[1] - (e.clientY - last[1]) * k));
        last = [e.clientX, e.clientY];
        draw();
    });
    function endDrag() { dragging = false; }
    svg.addEventListener('pointerup', endDrag);
    svg.addEventListener('pointercancel', endDrag);
    host.addEventListener('mouseenter', function () { hovering = true; });
    host.addEventListener('mouseleave', function () { hovering = false; });

    function flyTo(i) {
        var p = PROJECTS[i];
        autoRotate = false;
        var from = rotation.slice();
        var to = [-p.lon, -p.lat * 0.8];
        // take the shortest way around
        var dl = ((to[0] - from[0] + 540) % 360) - 180;
        flight = { t0: null, from: from, dl: dl, dp: to[1] - from[1], dur: reduceMotion ? 1 : 900, i: i };
    }
    onSelect = flyTo;
    onDeselect = function () {
        flight = null;
        hideTip();
        autoRotate = !reduceMotion;
    };
    if (activeIndex >= 0 && !PROJECTS[activeIndex].body) { setActive(activeIndex); flyTo(activeIndex); }   // a row was picked before the globe was ready

    function tick(now) {
        if (flight) {
            if (flight.t0 === null) { flight.t0 = now; }
            var t = Math.min(1, (now - flight.t0) / flight.dur);
            var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            rotation[0] = flight.from[0] + flight.dl * e;
            rotation[1] = flight.from[1] + flight.dp * e;
            if (t >= 1) { var i = flight.i; flight = null; showTip(i); }
            draw();
        } else if (autoRotate && !dragging && !hovering && !document.hidden) {
            rotation[0] -= 0.12;
            draw();
        }
        requestAnimationFrame(tick);
    }

    // ---- Load world data, then start ----
    draw();
    fetch(WORLD_URL)
        .then(function (r) { if (!r.ok) { throw new Error(r.status); } return r.json(); })
        .then(function (topo) {
            land = window.topojson.feature(topo, topo.objects.countries);
            draw();
        })
        .catch(function () { /* the sphere and pins still render without land */ });
    requestAnimationFrame(tick);
})();

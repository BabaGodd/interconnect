"use strict";

/* =========================================================
   GRDA UNIFIED CORRIDOR HUB
   Lightweight vanilla JavaScript — no frameworks
   ========================================================= */

/*
 * IMPORTANT:
 * Replace these empty strings with the ACTUAL live Vercel
 * URLs for your three corridor deployments before testing
 * corridor navigation.
 *
 * Do not guess these URLs.
 */
const CORRIDOR_URLS = {
    eastern: "https://eastern-corridor.vercel.app/",
    central: "https://central-flythrough.vercel.app/",
    western: "https://western-corridor.vercel.app/"
};

const INTRO_DURATION_MS = 4400;

const STATUS_MESSAGES = [
    { at: 0,  text: "INITIALIZING NETWORK" },
    { at: 18, text: "MAPPING GHANA" },
    { at: 43, text: "TRACING RAIL CONNECTIONS" },
    { at: 72, text: "PREPARING CORRIDORS" },
    { at: 94, text: "NETWORK READY" }
];

const intro = document.getElementById("intro");
const hub = document.getElementById("hub");
const skipButton = document.getElementById("skip-intro");

const loadingBar = document.getElementById("loading-bar");
const loadingPercent = document.getElementById("loading-percent");
const loadingStatus = document.getElementById("loading-status");
const loadingProgress = document.getElementById("loading-progress");

const navigationOverlay = document.getElementById("navigation-overlay");

let introStartedAt = 0;
let introFrame = null;
let introFinished = false;


/* ===================== INTRO SEQUENCE ===================== */

function setProgress(percent) {
    const value = Math.max(0, Math.min(100, Math.round(percent)));

    loadingBar.style.width = `${value}%`;
    loadingPercent.textContent = `${String(value).padStart(2, "0")}%`;

    loadingProgress.setAttribute("aria-valuenow", String(value));

    const currentStatus = [...STATUS_MESSAGES]
        .reverse()
        .find(message => value >= message.at);

    if (currentStatus) {
        loadingStatus.textContent = currentStatus.text;
    }
}

function animateIntro(timestamp) {
    if (introFinished) {
        return;
    }

    if (!introStartedAt) {
        introStartedAt = timestamp;
    }

    const elapsed = timestamp - introStartedAt;
    const progress = Math.min(100, (elapsed / INTRO_DURATION_MS) * 100);

    setProgress(progress);

    if (progress >= 100) {
        finishIntro();
        return;
    }

    introFrame = requestAnimationFrame(animateIntro);
}

function finishIntro() {
    if (introFinished) {
        return;
    }

    introFinished = true;

    if (introFrame !== null) {
        cancelAnimationFrame(introFrame);
        introFrame = null;
    }

    setProgress(100);
    loadingStatus.textContent = "NETWORK READY";

    /*
     * Reveal the hub while the intro fades away.
     * The hub is now interactive and accessible.
     */
    hub.inert = false;
    hub.classList.add("is-visible");

    document.body.classList.remove("intro-active");

    intro.classList.add("is-finished");

    /*
     * Start watching for animated corridor maps now that the
     * hub is visible, so their animation plays when scrolled to.
     */
    observeAnimatedCards();

    /*
     * Remove the finished splash from keyboard navigation
     * after its visual transition.
     */
    window.setTimeout(() => {
        intro.hidden = true;
    }, 950);
}

function startIntro() {
    document.body.classList.add("intro-active");

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) {
        finishIntro();
        return;
    }

    introFrame = requestAnimationFrame(animateIntro);
}

skipButton.addEventListener("click", finishIntro);


/* ===================== ANIMATED CARD MAPS ===================== */

/*
 * Cards marked with data-animate-on-view get an "is-inview"
 * class the first time they scroll into view. The CSS then
 * starts their map animation, so visitors see it draw instead
 * of arriving after it has already finished.
 */
function observeAnimatedCards() {
    const cards = document.querySelectorAll("[data-animate-on-view]");

    if (!("IntersectionObserver" in window)) {
        cards.forEach(card => card.classList.add("is-inview"));
        return;
    }

    const observer = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-inview");
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.35 }
    );

    cards.forEach(card => observer.observe(card));
}


/* ===================== MAP VIEWER ===================== */

/*
 * Opens a corridor's full-size map on the page itself, centred,
 * with a Close button (also Esc or a click on the dark area) and a
 * zoom toggle for reading the small labels. The link's href stays
 * as a fallback if JavaScript is unavailable.
 */
const lightbox = document.getElementById("map-lightbox");
const lightboxStage = document.getElementById("lightbox-stage");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxTitle = document.getElementById("map-lightbox-title");
const lightboxZoom = document.getElementById("lightbox-zoom");
const lightboxClose = document.getElementById("lightbox-close");

let lightboxTrigger = null;
let lightboxHideTimer = null;

function setLightboxZoom(zoomed, focusX = 0.5, focusY = 0.3) {
    lightbox.classList.toggle("is-zoomed", zoomed);
    lightboxZoom.textContent = zoomed ? "FIT TO SCREEN" : "ZOOM IN";

    if (zoomed) {
        /* Scroll so the point that was clicked stays under the viewer's centre. */
        lightboxStage.scrollLeft =
            focusX * lightboxImg.offsetWidth - lightboxStage.clientWidth / 2;
        lightboxStage.scrollTop =
            focusY * lightboxImg.offsetHeight - lightboxStage.clientHeight / 2;
    } else {
        lightboxStage.scrollLeft = 0;
        lightboxStage.scrollTop = 0;
    }
}

function openLightbox(link) {
    lightboxTrigger = link;

    window.clearTimeout(lightboxHideTimer);

    lightboxTitle.textContent = link.dataset.mapTitle || "Corridor map";
    lightboxImg.alt = lightboxTitle.textContent;
    lightboxImg.src = link.getAttribute("href");

    lightbox.hidden = false;
    setLightboxZoom(false);

    /* Next frame, so the fade-in transition runs. */
    requestAnimationFrame(() => lightbox.classList.add("is-open"));

    hub.inert = true;
    document.body.classList.add("lightbox-open");

    lightboxClose.focus();
}

function closeLightbox() {
    if (lightbox.hidden) {
        return;
    }

    lightbox.classList.remove("is-open");
    hub.inert = false;
    document.body.classList.remove("lightbox-open");

    lightboxHideTimer = window.setTimeout(() => {
        lightbox.hidden = true;
        lightbox.classList.remove("is-zoomed");
    }, 260);

    if (lightboxTrigger) {
        lightboxTrigger.focus();
    }
}

document.querySelectorAll(".map-zoom").forEach(link => {
    link.addEventListener("click", event => {
        /* Let ctrl/cmd/shift/middle-click still open a new tab. */
        if (
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
        ) {
            return;
        }

        event.preventDefault();
        openLightbox(link);
    });
});

lightboxClose.addEventListener("click", closeLightbox);

lightboxZoom.addEventListener("click", () => {
    setLightboxZoom(!lightbox.classList.contains("is-zoomed"));
});

lightboxImg.addEventListener("click", event => {
    const zoomed = lightbox.classList.contains("is-zoomed");
    const focusX = event.offsetX / lightboxImg.clientWidth;
    const focusY = event.offsetY / lightboxImg.clientHeight;

    setLightboxZoom(!zoomed, focusX, focusY);
});

/* A click on the dark area around the map closes the viewer. */
lightboxStage.addEventListener("click", event => {
    if (event.target === lightboxStage) {
        closeLightbox();
    }
});

document.addEventListener("keydown", event => {
    if (lightbox.hidden) {
        return;
    }

    if (event.key === "Escape") {
        closeLightbox();
        return;
    }

    /* Keep keyboard focus inside the viewer while it is open. */
    if (event.key === "Tab") {
        const first = lightboxZoom;
        const last = lightboxClose;

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }
});


/* ===================== CORRIDOR NAVIGATION ===================== */

const corridorLinks = document.querySelectorAll("[data-corridor]");

corridorLinks.forEach(link => {
    link.addEventListener("click", event => {
        const corridor = link.dataset.corridor;
        const destination = CORRIDOR_URLS[corridor];

        /*
         * Do not navigate to a made-up URL.
         * Tell the developer which configuration is missing.
         */
        if (!destination) {
            event.preventDefault();

            const message =
                `${corridor.charAt(0).toUpperCase() + corridor.slice(1)} ` +
                "Corridor URL has not been configured yet. " +
                "Add its live Vercel URL to CORRIDOR_URLS in app.js.";

            window.alert(message);
            return;
        }

        /*
         * Only allow a normal external HTTPS URL.
         * This prevents accidental navigation to malformed values.
         */
        let parsedUrl;

        try {
            parsedUrl = new URL(destination);
        } catch {
            event.preventDefault();
            window.alert("This corridor's configured URL is invalid.");
            return;
        }

        if (parsedUrl.protocol !== "https:") {
            event.preventDefault();
            window.alert("Corridor destinations must use HTTPS.");
            return;
        }

        link.href = parsedUrl.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
    });
});


/* ===================== INITIALIZE ===================== */

startIntro();
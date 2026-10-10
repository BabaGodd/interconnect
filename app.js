
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

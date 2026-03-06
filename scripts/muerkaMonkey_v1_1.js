// ==UserScript==
// @name         Mureka Monkey
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Fill Mureka fields with SongBuilder data
// @author       You
// @match        https://www.mureka.ai/*
// @grant        none
// ==/UserScript==

(() => {
    "use strict";

    // Decode payload from hash
    function decodePayload(s) {
        const json = decodeURIComponent(escape(atob(s)));
        return JSON.parse(json);
    }

    // Ingest hash payload on page load
    function maybeIngestHashPayload() {
        const m = location.hash.match(/(?:^|#|&)sb=([^&]+)/);
        if (!m) return null;
        try {
            const payload = decodePayload(m[1]);
            localStorage.setItem("songbuilder:lastPayload", JSON.stringify(payload));
            return payload;
        } catch (e) {
            console.warn("Failed to decode sb payload", e);
            return null;
        }
    }

    // Call it once
    const payloadFromHash = maybeIngestHashPayload();

    // Optional: auto-fill if coming from SongBuilder
    if (payloadFromHash) {
        setTimeout(fillMureka, 1500);
    }
    function setNativeValue(el, value) {
        const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const desc = Object.getOwnPropertyDescriptor(proto, "value");
        desc.set.call(el, value);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
    }
    function findField({ placeholderIncludes, tag }) {
        const els = Array.from(document.querySelectorAll(tag));
        return els.find(e => (e.getAttribute("placeholder") || "").toLowerCase().includes(placeholderIncludes));
    }
    function fillMureka() {
        // 1) try placeholder-based guesses first (adjust these words to match what you see)
        const lyrics = findField({ tag: "textarea", placeholderIncludes: "lyric" })
            || Array.from(document.querySelectorAll("textarea")).at(0);
        const style = findField({ tag: "textarea", placeholderIncludes: "style" })
            || findField({ tag: "input", placeholderIncludes: "style" });
        const title = findField({ tag: "input", placeholderIncludes: "title" })
            || Array.from(document.querySelectorAll('input[type="text"], input:not([type])')).at(0);
        if (!lyrics || !style || !title) {
            alert("Couldn’t find one of the fields yet. Open DevTools and we’ll tighten the selectors.");
            return;
        }

        // Get payload from hash or storage
        const payload = payloadFromHash || JSON.parse(localStorage.getItem("songbuilder:lastPayload") || "null");
        if (!payload) {
            alert("No SongBuilder payload found yet.");
            return;
        }

        setNativeValue(title, payload.title || "");
        setNativeValue(style, payload.style || "");
        setNativeValue(lyrics, payload.lyrics || "");
    }
    function addButton() {
        if (document.getElementById("tm-mureka-fill-btn")) return;
        const btn = document.createElement("button");
        btn.id = "tm-mureka-fill-btn";
        btn.textContent = "Fill (TM)";
        btn.style.position = "fixed";
        btn.style.right = "16px";
        btn.style.bottom = "16px";
        btn.style.zIndex = "999999";
        btn.style.padding = "10px 12px";
        btn.style.background = "#6d28d9";
        btn.style.color = "white";
        btn.style.border = "0";
        btn.style.borderRadius = "10px";
        btn.style.cursor = "pointer";
        btn.addEventListener("click", fillMureka);
        document.body.appendChild(btn);
    }
    // SPA sites re-render; retry a few times
    const interval = setInterval(() => {
        if (document.body) addButton();
    }, 1000);
    setTimeout(() => clearInterval(interval), 30000);
})();
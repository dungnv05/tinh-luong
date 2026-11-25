//#region shared/allowed-origins.js
var e = Object.freeze([
	"yundev.space",
	"www.yundev.space",
	"tinh-luong.yundev.space",
	"brse.yundev.space",
	"vang-vong-su-viet.yundev.space",
	"ivf-journey.yundev.space"
]);
Object.freeze(e.map((e) => `https://${e}`)), Object.freeze(["http://localhost:5173", "http://127.0.0.1:5173"]);
function t(t) {
	return typeof t != "string" || t.length === 0 ? !1 : e.includes(t.toLowerCase());
}
//#endregion
//#region src/shared-auth/refreshCoordinator.ts
var n = Symbol.for("yundev.auth.refresh.v1"), r = 2e3;
function i() {
	let e = globalThis, t = e[n];
	return t || (t = {
		inFlight: null,
		lastOkAt: -Infinity
	}, e[n] = t), t;
}
function a(e, t) {
	let n = i();
	if (Date.now() - n.lastOkAt < r) return Promise.resolve("ok");
	if (n.inFlight) return n.inFlight;
	let a = t();
	if (!a) return Promise.resolve("failed");
	let o = (async () => {
		try {
			let t = await fetch(e, {
				method: "POST",
				credentials: "include",
				headers: { "x-csrf-token": a }
			});
			return t.status === 200 ? (n.lastOkAt = Date.now(), "ok") : t.status === 409 ? "retry" : "failed";
		} catch {
			return "failed";
		}
	})();
	return n.inFlight = o, o.finally(() => {
		n.inFlight === o && (n.inFlight = null);
	}), o;
}
//#endregion
//#region src/yun-header/theme.ts
var o = "yun-theme", s = "yun_theme", c = "yh-theme-change", l = "theme";
function u(e) {
	return e === "light" || e === "dark";
}
function d() {
	try {
		if (typeof document > "u" || !document.cookie) return null;
		let e = null;
		for (let t of document.cookie.split(";")) {
			let n = t.indexOf("=");
			if (n <= 0 || t.slice(0, n).trim() !== "yun_theme") continue;
			let r = t.slice(n + 1).trim(), i = r;
			try {
				i = decodeURIComponent(r);
			} catch {
				i = r;
			}
			u(i) && (e = i);
		}
		return e;
	} catch {
		return null;
	}
}
function f(e) {
	try {
		if (typeof window > "u" || !window.localStorage) return null;
		let t = window.localStorage.getItem(e);
		return u(t) ? t : null;
	} catch {
		return null;
	}
}
function p() {
	return d() ?? f("yun-theme") ?? f(l);
}
function m() {
	try {
		return typeof window > "u" || typeof window.matchMedia != "function" ? "light" : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
	} catch {
		return "light";
	}
}
function h() {
	return p() ?? m();
}
function g(e, t) {
	if (!u(e) || typeof document > "u") return;
	let n = document.documentElement, r = n.dataset.theme;
	n.dataset.theme = e, n.style.colorScheme = e, (r !== e || t === "init") && document.dispatchEvent(new CustomEvent(c, {
		detail: {
			theme: e,
			source: t
		},
		bubbles: !0
	}));
}
function _(e, t, n) {
	if (!u(e)) throw Error(`Invalid theme value: ${String(e)}`);
	let r = [
		`${s}=${e}`,
		"Path=/",
		"Max-Age=31536000",
		"SameSite=Lax"
	];
	n === "https:" && r.push("Secure");
	let i = t.toLowerCase();
	return (i === "yundev.space" || i.endsWith(".yundev.space")) && r.push("Domain=.yundev.space"), r.join("; ");
}
function v(e) {
	if (u(e)) {
		try {
			typeof window < "u" && window.localStorage && window.localStorage.setItem(o, e);
		} catch {}
		try {
			typeof document < "u" && typeof window < "u" && (document.cookie = _(e, window.location.hostname, window.location.protocol));
		} catch {}
		g(e, "user");
	}
}
var y = !1;
function b() {
	if (g(h(), "init"), !(y || typeof window > "u" || typeof document > "u")) {
		y = !0;
		try {
			if (typeof window.matchMedia == "function") {
				let e = window.matchMedia("(prefers-color-scheme: dark)");
				typeof e.addEventListener == "function" && e.addEventListener("change", () => {
					p() === null && g(m(), "system");
				});
			}
		} catch {}
		window.addEventListener("storage", (e) => {
			e.key === "yun-theme" && g(u(e.newValue) ? e.newValue : h(), "sync");
		}), document.addEventListener("visibilitychange", () => {
			if (document.visibilityState !== "visible") return;
			let e = h();
			document.documentElement.dataset.theme !== e && g(e, "sync");
		});
	}
}
//#endregion
//#region src/yun-header/yun-header.ts
var x = "https://www.yundev.space", S = 3e3, C = !1, w = /^#[A-Za-z][\w-]*$/, T = "\n:host {\n  display: block;\n  position: sticky;\n  top: 0;\n  z-index: 40;\n  font-family: var(--yh-font, system-ui, -apple-system, 'Segoe UI', sans-serif);\n  color: var(--yh-ink, #F2EFF7);\n}\n\n*, *::before, *::after {\n  box-sizing: border-box;\n}\n\n.yh-bar {\n  position: relative;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n  min-height: 64px;\n  padding: 0 24px;\n  background: var(--yh-bg, #15121D);\n  border-bottom: 1px solid var(--yh-border, rgba(255, 255, 255, 0.1));\n  backdrop-filter: blur(12px);\n  -webkit-backdrop-filter: blur(12px);\n}\n\n:host([variant=\"overlay\"]) .yh-bar {\n  min-height: 48px;\n  background: color-mix(in srgb, var(--yh-bg, #15121D) 72%, transparent);\n  border-bottom-color: transparent;\n}\n\n.yh-skip-link {\n  position: absolute;\n  left: -9999px;\n  top: 8px;\n  z-index: 60;\n  padding: 10px 16px;\n  border-radius: var(--yh-radius, 12px);\n  background: var(--yh-primary, #A78BFA);\n  color: var(--yh-on-primary, #1B1526);\n  font-size: 0.875rem;\n  font-weight: 600;\n  text-decoration: none;\n}\n\n.yh-skip-link:focus,\n.yh-skip-link:focus-visible {\n  left: 16px;\n}\n\n.yh-left {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  min-width: 0;\n}\n\n.yh-nav {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  min-width: 0;\n}\n\n.yh-right {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  flex-shrink: 0;\n}\n\n.yh-theme-toggle {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  flex-shrink: 0;\n  width: 42px;\n  height: 42px;\n  padding: 0;\n  border-radius: var(--yh-toggle-radius, 12px);\n  border: 1px solid var(--yh-toggle-border, var(--yh-border, rgba(255, 255, 255, 0.1)));\n  background: transparent;\n  color: var(--yh-muted, #B8B3C7);\n  cursor: pointer;\n  transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;\n}\n\n.yh-theme-toggle[hidden] {\n  display: none;\n}\n\n.yh-theme-toggle:hover {\n  background: var(--yh-toggle-hover-bg, color-mix(in srgb, var(--yh-ink, #F2EFF7) 8%, transparent));\n  color: var(--yh-ink, #F2EFF7);\n}\n\n.yh-account-desktop {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  position: relative;\n}\n\n.yh-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 8px;\n  min-width: 44px;\n  min-height: 44px;\n  padding: 0 14px;\n  border-radius: var(--yh-radius, 12px);\n  border: 1px solid transparent;\n  font-family: inherit;\n  font-size: 0.875rem;\n  font-weight: 600;\n  line-height: 1;\n  cursor: pointer;\n  text-decoration: none;\n  background: transparent;\n  color: var(--yh-ink, #F2EFF7);\n  transition: background-color 150ms ease, border-color 150ms ease, opacity 150ms ease;\n}\n\n.yh-btn:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n\n.yh-btn-text:hover:not(:disabled) {\n  background: color-mix(in srgb, var(--yh-ink, #F2EFF7) 8%, transparent);\n}\n\n.yh-btn-primary {\n  background: var(--yh-primary, #A78BFA);\n  color: var(--yh-on-primary, #1B1526);\n}\n\n.yh-btn-primary:hover:not(:disabled) {\n  filter: brightness(1.06);\n}\n\n.yh-btn-icon {\n  padding: 0;\n  width: 44px;\n  height: 44px;\n  border: 1px solid var(--yh-border, rgba(255, 255, 255, 0.1));\n  color: var(--yh-muted, #B8B3C7);\n}\n\n.yh-btn-icon:hover:not(:disabled) {\n  color: var(--yh-ink, #F2EFF7);\n  background: color-mix(in srgb, var(--yh-ink, #F2EFF7) 8%, transparent);\n}\n\n.yh-account-btn {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  min-width: 44px;\n  min-height: 44px;\n  padding: 4px 10px 4px 6px;\n  border-radius: var(--yh-radius, 12px);\n  border: 1px solid var(--yh-border, rgba(255, 255, 255, 0.1));\n  background: var(--yh-surface, #1D1927);\n  color: var(--yh-ink, #F2EFF7);\n  font-family: inherit;\n  font-size: 0.875rem;\n  font-weight: 600;\n  cursor: pointer;\n  transition: background-color 150ms ease, border-color 150ms ease;\n}\n\n.yh-account-btn:hover {\n  background: color-mix(in srgb, var(--yh-surface, #1D1927) 86%, var(--yh-ink, #F2EFF7));\n}\n\n.yh-avatar {\n  width: 32px;\n  height: 32px;\n  border-radius: 999px;\n  flex-shrink: 0;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  overflow: hidden;\n  background: var(--yh-primary, #A78BFA);\n  color: var(--yh-on-primary, #1B1526);\n  font-size: 0.8125rem;\n  font-weight: 700;\n}\n\n.yh-avatar img {\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n  display: block;\n}\n\n.yh-account-name {\n  max-width: 16ch;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.yh-chevron {\n  width: 16px;\n  height: 16px;\n  flex-shrink: 0;\n  color: var(--yh-muted, #B8B3C7);\n}\n\n.yh-menu {\n  position: absolute;\n  top: calc(100% + 8px);\n  right: 0;\n  min-width: 240px;\n  padding: 8px;\n  border-radius: var(--yh-radius, 12px);\n  background: var(--yh-surface, #1D1927);\n  border: 1px solid var(--yh-border, rgba(255, 255, 255, 0.1));\n  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.32);\n  z-index: 50;\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n}\n\n.yh-menu[hidden] {\n  display: none;\n}\n\n.yh-menu-header {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  padding: 8px 10px 10px;\n}\n\n.yh-menu-identity {\n  min-width: 0;\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n}\n\n.yh-menu-name {\n  font-size: 0.875rem;\n  font-weight: 600;\n  color: var(--yh-ink, #F2EFF7);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.yh-menu-email {\n  font-size: 0.75rem;\n  color: var(--yh-muted, #B8B3C7);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.yh-menu-divider {\n  height: 1px;\n  margin: 4px 0;\n  background: var(--yh-border, rgba(255, 255, 255, 0.1));\n  border: 0;\n}\n\n.yh-menu-item {\n  display: flex;\n  align-items: center;\n  width: 100%;\n  min-height: 44px;\n  padding: 0 12px;\n  border-radius: calc(var(--yh-radius, 12px) - 4px);\n  border: 0;\n  background: transparent;\n  color: var(--yh-ink, #F2EFF7);\n  font-family: inherit;\n  font-size: 0.875rem;\n  font-weight: 500;\n  text-align: left;\n  text-decoration: none;\n  cursor: pointer;\n}\n\n.yh-menu-item:hover:not(:disabled),\n.yh-menu-item:focus-visible {\n  background: color-mix(in srgb, var(--yh-ink, #F2EFF7) 8%, transparent);\n}\n\n.yh-menu-item:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n\n.yh-skeleton {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  min-height: 44px;\n  padding: 0 6px;\n}\n\n.yh-skeleton-circle {\n  width: 32px;\n  height: 32px;\n  border-radius: 999px;\n  background: color-mix(in srgb, var(--yh-muted, #B8B3C7) 25%, transparent);\n}\n\n.yh-skeleton-bar {\n  width: 72px;\n  height: 14px;\n  border-radius: 999px;\n  background: color-mix(in srgb, var(--yh-muted, #B8B3C7) 25%, transparent);\n}\n\n.yh-error-inline {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n}\n\n.yh-muted-text {\n  font-size: 0.8125rem;\n  color: var(--yh-muted, #B8B3C7);\n}\n\n.yh-expired-notice,\n.yh-logout-notice {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  flex-wrap: wrap;\n  gap: 12px;\n  padding: 8px 24px;\n  background: var(--yh-surface, #1D1927);\n  border-bottom: 1px solid var(--yh-border, rgba(255, 255, 255, 0.1));\n  font-size: 0.875rem;\n  color: var(--yh-ink, #F2EFF7);\n}\n\n.yh-mobile-toggle {\n  display: none;\n}\n\n.yh-sheet-backdrop {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.52);\n  z-index: 60;\n  display: flex;\n  justify-content: flex-end;\n}\n\n.yh-sheet-backdrop[hidden] {\n  display: none;\n}\n\n.yh-expired-notice[hidden], .yh-logout-notice[hidden] { display: none; }\n\n.yh-sheet {\n  width: 85vw;\n  max-width: 360px;\n  height: 100%;\n  background: var(--yh-surface, #1D1927);\n  color: var(--yh-ink, #F2EFF7);\n  border-left: 1px solid var(--yh-border, rgba(255, 255, 255, 0.1));\n  padding: 16px;\n  display: flex;\n  flex-direction: column;\n  gap: 16px;\n  overflow-y: auto;\n}\n\n.yh-sheet-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n}\n\n.yh-sheet-title {\n  font-size: 1rem;\n  font-weight: 700;\n}\n\n.yh-sheet-nav {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n.yh-sheet-nav:empty {\n  display: none;\n}\n\n.yh-sheet-account {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  padding-top: 12px;\n  border-top: 1px solid var(--yh-border, rgba(255, 255, 255, 0.1));\n}\n\n.yh-sheet-account-actions {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n.yh-sr-only {\n  position: absolute;\n  width: 1px;\n  height: 1px;\n  padding: 0;\n  margin: -1px;\n  overflow: hidden;\n  clip: rect(0, 0, 0, 0);\n  white-space: nowrap;\n  border: 0;\n}\n\n:focus-visible {\n  outline: 2px solid var(--yh-focus, #A78BFA);\n  outline-offset: 2px;\n}\n\n@media (min-width: 641px) and (max-width: 1023px) {\n  .yh-account-name {\n    display: none;\n  }\n}\n\n@media (max-width: 640px) {\n  .yh-bar {\n    min-height: 56px;\n    padding: 0 16px;\n  }\n\n  .yh-nav,\n  .yh-account-desktop {\n    display: none;\n  }\n\n  .yh-mobile-toggle {\n    display: inline-flex;\n  }\n\n  .yh-expired-notice,\n  .yh-logout-notice {\n    padding: 8px 16px;\n  }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  *, *::before, *::after {\n    transition: none !important;\n    animation: none !important;\n  }\n}\n";
function E(e) {
	return typeof e == "object" && !!e;
}
function D(e) {
	if (typeof e != "string") return null;
	let t = e.trim();
	return t.length > 0 ? t : null;
}
function O(e) {
	if (!e) return null;
	try {
		let t = new URL(e);
		return t.protocol === "https:" ? t.href : null;
	} catch {
		return null;
	}
}
function k(e) {
	if (/\s/.test(e)) return !0;
	for (let t = 0; t < e.length; t += 1) {
		let n = e.charCodeAt(t);
		if (n <= 32 || n === 127 || n === 92) return !0;
	}
	return !1;
}
function A(e) {
	let t = e.indexOf("://");
	if (t < 0) return null;
	let n = e.slice(t + 3), r = n.search(/[/?#]/), i = r >= 0 ? n.slice(0, r) : n;
	if (!i || i.includes("@") || i.startsWith("[")) return null;
	let a = i.indexOf(":");
	return (a >= 0 ? i.slice(0, a) : i).toLowerCase();
}
function j(e, n = { allowLocalhost: C }) {
	let r;
	if (typeof e == "string") {
		if (!e || k(e)) return !1;
		try {
			r = new URL(e);
		} catch {
			return !1;
		}
	} else r = e;
	if (r.username || r.password) return !1;
	let i = r.hostname.toLowerCase();
	if (r.protocol === "https:") return r.port === "" && t(i);
	if (r.protocol === "http:") {
		if (!n.allowLocalhost || i !== "localhost" && i !== "127.0.0.1") return !1;
		if (typeof e == "string") {
			let t = A(e);
			return t === "localhost" || t === "127.0.0.1";
		}
		return !0;
	}
	return !1;
}
function M(e) {
	if (!e || k(e)) return x;
	try {
		let t = new URL(e);
		return j(e, { allowLocalhost: C }) ? t.origin : x;
	} catch {
		return x;
	}
}
function N(e, t) {
	let n = `${t}/?view=profile`;
	if (!e || k(e)) return n;
	if (e.startsWith("/") && !e.startsWith("//")) return e;
	try {
		let t = new URL(e);
		return j(e, { allowLocalhost: C }) ? t.href : n;
	} catch {
		return n;
	}
}
function P(e) {
	try {
		let t = new URL(e);
		return t.hash = "", t.searchParams.delete("auth"), t.toString();
	} catch {
		return e;
	}
}
function F(e) {
	let t = e.trim().split(/\s+/).filter(Boolean).slice(0, 2);
	return t.length === 0 ? "U" : t.map((e) => Array.from(e)[0] ?? "").join("").toUpperCase();
}
function I(e) {
	if (!E(e) || e.ok === !1) return null;
	let t = e.user;
	if (!E(t)) return null;
	let n = D(t.id);
	if (!n) return null;
	let r = D(t.email), i = E(t.user_metadata) ? t.user_metadata : null, a = D(t.display_name) ?? (i ? D(i.full_name) : null), o = r && r.split("@")[0]?.trim() || null, s = a ?? o ?? "User";
	return {
		id: n,
		email: r,
		displayName: s,
		rawDisplayName: a,
		avatarUrl: O(D(t.avatar_url) ?? (i ? D(i.avatar_url) : null)),
		initials: F(s)
	};
}
function L() {
	if (typeof document > "u" || !document.cookie) return "";
	let e = "";
	for (let t of document.cookie.split(";")) {
		let n = t.indexOf("=");
		if (n <= 0 || t.slice(0, n).trim() !== "csrf") continue;
		let r = t.slice(n + 1).trim();
		try {
			e = decodeURIComponent(r);
		} catch {
			e = r;
		}
	}
	return e;
}
function R(e) {
	let t = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	return t.setAttribute("viewBox", "0 0 24 24"), t.setAttribute("width", "18"), t.setAttribute("height", "18"), t.setAttribute("fill", "none"), t.setAttribute("stroke", "currentColor"), t.setAttribute("stroke-width", "2"), t.setAttribute("stroke-linecap", "round"), t.setAttribute("stroke-linejoin", "round"), t.setAttribute("aria-hidden", "true"), e && t.setAttribute("class", e), t;
}
function z(e, t) {
	let n = R(t), r = document.createElementNS("http://www.w3.org/2000/svg", "path");
	return r.setAttribute("d", e), n.appendChild(r), n;
}
function B() {
	return z("M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z");
}
function V() {
	let e = "http://www.w3.org/2000/svg", t = R(), n = document.createElementNS(e, "circle");
	n.setAttribute("cx", "12"), n.setAttribute("cy", "12"), n.setAttribute("r", "4"), t.appendChild(n);
	for (let n of [
		"M12 2v2",
		"M12 20v2",
		"m4.93 4.93 1.41 1.41",
		"m17.66 17.66 1.41 1.41",
		"M2 12h2",
		"M20 12h2",
		"m6.34 17.66-1.41 1.41",
		"m19.07 4.93-1.41 1.41"
	]) {
		let r = document.createElementNS(e, "path");
		r.setAttribute("d", n), t.appendChild(r);
	}
	return t;
}
function H(e) {
	let t = document.createElement("span");
	if (t.className = "yh-avatar", t.setAttribute("aria-hidden", "true"), e.avatarUrl) {
		let n = document.createElement("img");
		n.src = e.avatarUrl, n.alt = "", n.referrerPolicy = "no-referrer", n.decoding = "async", n.addEventListener("error", () => {
			n.remove(), t.textContent = e.initials;
		}), t.appendChild(n);
	} else t.textContent = e.initials;
	return t;
}
var U = class extends HTMLElement {
	static get observedAttributes() {
		return [
			"app",
			"auth-base",
			"variant",
			"profile-url",
			"hide-account",
			"skip-target",
			"no-theme-toggle"
		];
	}
	_state = "loading";
	_lastStableState = "loading";
	_user = null;
	_stale = !1;
	_menuOpen = !1;
	_sheetOpen = !1;
	_loggingOut = !1;
	_logoutError = !1;
	_abortController = null;
	_loadingTimer = null;
	_lastAnnouncedAuthKey = null;
	_rendered = !1;
	_shadow;
	_skipLink;
	_themeBtn;
	_accountDesktop;
	_expiredNotice;
	_logoutNotice;
	_mobileToggleBtn;
	_sheetBackdrop;
	_sheetDialog;
	_sheetCloseBtn;
	_sheetNav;
	_sheetAccount;
	_navSlot;
	_liveRegion;
	_accountButtonEl = null;
	_menuEl = null;
	_onWindowFocus = () => {
		this.refresh();
	};
	_onVisibilityChange = () => {
		document.visibilityState === "visible" && this.refresh();
	};
	_onDocumentClick = (e) => {
		this._menuOpen && (e.composedPath().includes(this._accountDesktop) || this._setMenuOpen(!1, !1));
	};
	_onDocumentKeyDown = (e) => {
		if (this._sheetOpen && e.key === "Escape") {
			e.preventDefault(), this._setSheetOpen(!1, !0);
			return;
		}
		this._menuOpen && e.key === "Escape" && (e.preventDefault(), this._setMenuOpen(!1, !0));
	};
	_onThemeChange = () => {
		this._renderThemeButton();
	};
	constructor() {
		super(), this._shadow = this.attachShadow({ mode: "open" });
	}
	get state() {
		return this._state;
	}
	get user() {
		return this._user;
	}
	get stale() {
		return this._stale;
	}
	get theme() {
		let e = document.documentElement.dataset.theme;
		return e === "light" || e === "dark" ? e : h();
	}
	setTheme(e) {
		v(e);
	}
	get authBase() {
		return M(this.getAttribute("auth-base"));
	}
	get profileUrl() {
		return N(this.getAttribute("profile-url"), this.authBase);
	}
	get hideAccount() {
		return this.hasAttribute("hide-account");
	}
	get skipTarget() {
		let e = this.getAttribute("skip-target")?.trim();
		return e && w.test(e) ? e : "#main";
	}
	connectedCallback() {
		this._ensureDom(), this._syncAttributes(), this._renderThemeButton(), window.addEventListener("focus", this._onWindowFocus), document.addEventListener("visibilitychange", this._onVisibilityChange), document.addEventListener("click", this._onDocumentClick), document.addEventListener("keydown", this._onDocumentKeyDown), document.addEventListener(c, this._onThemeChange), this.refresh();
	}
	disconnectedCallback() {
		window.removeEventListener("focus", this._onWindowFocus), document.removeEventListener("visibilitychange", this._onVisibilityChange), document.removeEventListener("click", this._onDocumentClick), document.removeEventListener("keydown", this._onDocumentKeyDown), document.removeEventListener(c, this._onThemeChange), this._abortPending();
	}
	attributeChangedCallback(e, t, n) {
		t === n || !this._rendered || (this._syncAttributes(), e === "auth-base" ? this.refresh() : (e === "hide-account" || e === "profile-url") && this._renderAccountRegions());
	}
	async refresh() {
		this._abortPending();
		let e = new AbortController();
		this._abortController = e;
		let t = this._lastStableState === "signed-in";
		this._state !== "signed-in" && (this._state = "loading", this._renderAccountRegions());
		let n = !1, r = setTimeout(() => {
			n = !0, e.abort("timeout");
		}, S);
		this._loadingTimer = r;
		try {
			let r = await fetch(`${this.authBase}/api/auth/me`, {
				method: "GET",
				credentials: "include",
				signal: e.signal
			});
			if (e.signal.aborted) {
				if (n) throw Error("Request timed out");
				return;
			}
			if (r.status === 401 && L()) {
				let t = await this._raceWithAbort(this._tryRefreshSession(), e.signal);
				if (e.signal.aborted) {
					if (n) throw Error("Request timed out");
					return;
				}
				if (t && (r = await fetch(`${this.authBase}/api/auth/me`, {
					method: "GET",
					credentials: "include",
					signal: e.signal
				}), e.signal.aborted)) {
					if (n) throw Error("Request timed out");
					return;
				}
			}
			if (r.status === 200) {
				let e = null;
				try {
					e = await r.json();
				} catch {
					e = null;
				}
				let n = I(e);
				if (n) {
					let e = this._lastStableState !== "signed-in" || this._user?.id !== n.id;
					this._stale = !1, this._state = "signed-in", this._lastStableState = "signed-in", this._user = n, e && this._announce(`Đã đăng nhập với tên ${n.displayName}`);
				} else this._applySignedOutOrExpired(t);
			} else r.status === 401 ? this._applySignedOutOrExpired(t) : (this._stale = !1, this._logoutError = !1, this._state = "error", this._lastStableState = "error", this._user = null);
		} catch {
			if (n) t && this._user ? (this._stale = !0, this._state = "signed-in", this._lastStableState = "signed-in") : (this._stale = !1, this._logoutError = !1, this._state = "signed-out", this._lastStableState = "signed-out", this._user = null);
			else if (e.signal.aborted) return;
			else this._stale = !1, this._logoutError = !1, this._state = "error", this._lastStableState = "error", this._user = null;
		} finally {
			clearTimeout(r), this._loadingTimer === r && (this._loadingTimer = null), this._abortController === e && (this._abortController = null);
		}
		this._renderAccountRegions(), this._dispatchAuthChange();
	}
	_raceWithAbort(e, t) {
		return t.aborted ? Promise.reject(/* @__PURE__ */ Error("Aborted")) : new Promise((n, r) => {
			let i = () => {
				r(/* @__PURE__ */ Error("Aborted"));
			};
			t.addEventListener("abort", i, { once: !0 }), e.then((e) => {
				t.removeEventListener("abort", i), n(e);
			}, (e) => {
				t.removeEventListener("abort", i), r(e instanceof Error ? e : /* @__PURE__ */ Error("Refresh failed"));
			});
		});
	}
	async _tryRefreshSession() {
		return await a(`${this.authBase}/api/auth/refresh`, L) !== "failed";
	}
	_applySignedOutOrExpired(e) {
		this._stale = !1, this._logoutError = !1, this._user = null, this._menuOpen = !1, e ? (this._state = "expired", this._lastStableState = "expired") : (this._state = "signed-out", this._lastStableState = "signed-out");
	}
	_abortPending() {
		this._loadingTimer !== null && (clearTimeout(this._loadingTimer), this._loadingTimer = null), this._abortController &&= (this._abortController.abort("superseded"), null);
	}
	_ensureDom() {
		if (this._rendered) return;
		this._rendered = !0;
		let e = document.createElement("style");
		e.textContent = T;
		let t = document.createElement("header");
		t.setAttribute("part", "bar"), t.className = "yh-bar", this._skipLink = document.createElement("a"), this._skipLink.className = "yh-skip-link", this._skipLink.textContent = "Bỏ qua đến nội dung";
		let n = document.createElement("div");
		n.className = "yh-left";
		let r = document.createElement("slot");
		r.name = "brand", n.appendChild(r);
		let i = document.createElement("nav");
		i.className = "yh-nav", i.setAttribute("aria-label", "Điều hướng chính"), this._navSlot = document.createElement("slot"), this._navSlot.name = "nav", this._navSlot.addEventListener("slotchange", () => {
			this._sheetOpen && this._syncMobileNavClone();
		}), i.appendChild(this._navSlot);
		let a = document.createElement("div");
		a.className = "yh-right";
		let o = document.createElement("slot");
		o.name = "actions", this._themeBtn = document.createElement("button"), this._themeBtn.type = "button", this._themeBtn.className = "yh-theme-toggle", this._themeBtn.title = "Chuyển chế độ sáng/tối", this._themeBtn.setAttribute("aria-label", "Chuyển chế độ sáng/tối"), this._themeBtn.addEventListener("click", () => {
			this.setTheme(this.theme === "dark" ? "light" : "dark");
		}), this._accountDesktop = document.createElement("div"), this._accountDesktop.className = "yh-account-desktop", this._mobileToggleBtn = document.createElement("button"), this._mobileToggleBtn.type = "button", this._mobileToggleBtn.className = "yh-btn yh-btn-icon yh-mobile-toggle", this._mobileToggleBtn.setAttribute("aria-label", "Mở menu"), this._mobileToggleBtn.setAttribute("aria-expanded", "false"), this._mobileToggleBtn.appendChild(z("M4 6h16M4 12h16M4 18h16")), this._mobileToggleBtn.addEventListener("click", () => {
			this._setSheetOpen(!this._sheetOpen, !1);
		}), a.append(o, this._themeBtn, this._accountDesktop, this._mobileToggleBtn), t.append(this._skipLink, n, i, a), this._expiredNotice = document.createElement("div"), this._expiredNotice.className = "yh-expired-notice", this._expiredNotice.setAttribute("role", "status"), this._expiredNotice.hidden = !0;
		let s = document.createElement("span");
		s.textContent = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
		let c = document.createElement("button");
		c.type = "button", c.className = "yh-btn yh-btn-primary", c.textContent = "Đăng nhập lại", c.addEventListener("click", () => {
			this._handleAuthClick("signin");
		}), this._expiredNotice.append(s, c), this._logoutNotice = document.createElement("div"), this._logoutNotice.className = "yh-logout-notice", this._logoutNotice.setAttribute("role", "alert"), this._logoutNotice.hidden = !0;
		let l = document.createElement("span");
		l.textContent = "Đăng xuất không thành công, bạn vẫn đang đăng nhập.";
		let u = document.createElement("button");
		u.type = "button", u.className = "yh-btn yh-btn-primary", u.textContent = "Thử lại", u.addEventListener("click", () => {
			this._handleLogout();
		}), this._logoutNotice.append(l, u), this._sheetBackdrop = document.createElement("div"), this._sheetBackdrop.className = "yh-sheet-backdrop", this._sheetBackdrop.hidden = !0, this._sheetBackdrop.addEventListener("click", (e) => {
			e.target === this._sheetBackdrop && this._setSheetOpen(!1, !0);
		}), this._sheetDialog = document.createElement("div"), this._sheetDialog.className = "yh-sheet", this._sheetDialog.setAttribute("role", "dialog"), this._sheetDialog.setAttribute("aria-modal", "true"), this._sheetDialog.setAttribute("aria-label", "Menu"), this._sheetDialog.addEventListener("keydown", (e) => {
			this._handleSheetKeyDown(e);
		});
		let d = document.createElement("div");
		d.className = "yh-sheet-header";
		let f = document.createElement("span");
		f.className = "yh-sheet-title", f.textContent = "Menu", this._sheetCloseBtn = document.createElement("button"), this._sheetCloseBtn.type = "button", this._sheetCloseBtn.className = "yh-btn yh-btn-icon", this._sheetCloseBtn.setAttribute("aria-label", "Đóng menu"), this._sheetCloseBtn.appendChild(z("M18 6L6 18M6 6l12 12")), this._sheetCloseBtn.addEventListener("click", () => {
			this._setSheetOpen(!1, !0);
		}), d.append(f, this._sheetCloseBtn), this._sheetNav = document.createElement("div"), this._sheetNav.className = "yh-sheet-nav", this._sheetAccount = document.createElement("div"), this._sheetAccount.className = "yh-sheet-account", this._sheetDialog.append(d, this._sheetNav, this._sheetAccount), this._sheetBackdrop.appendChild(this._sheetDialog), this._liveRegion = document.createElement("div"), this._liveRegion.className = "yh-sr-only", this._liveRegion.setAttribute("aria-live", "polite"), this._liveRegion.setAttribute("aria-atomic", "true"), this._shadow.append(e, t, this._expiredNotice, this._logoutNotice, this._sheetBackdrop, this._liveRegion);
	}
	_syncAttributes() {
		this._skipLink.href = this.skipTarget, this._themeBtn.hidden = this.hasAttribute("no-theme-toggle");
	}
	_renderThemeButton() {
		if (!this._themeBtn) return;
		let e = this.theme === "dark";
		this._themeBtn.setAttribute("aria-pressed", String(e)), this._themeBtn.replaceChildren(e ? V() : B());
	}
	_announce(e) {
		!this._liveRegion || this._lastAnnouncedAuthKey === e || (this._lastAnnouncedAuthKey = e, this._liveRegion.textContent = e);
	}
	_dispatchAuthChange() {
		this.dispatchEvent(new CustomEvent("yh-auth-change", {
			detail: {
				state: this._state,
				user: this._user
			},
			bubbles: !0,
			composed: !0
		}));
	}
	_handleAuthClick(e) {
		let t = new CustomEvent(e === "signin" ? "yh-signin-click" : "yh-signup-click", {
			bubbles: !0,
			composed: !0,
			cancelable: !0
		}), n = this.dispatchEvent(t);
		if (this._sheetOpen && this._setSheetOpen(!1, !1), n) {
			let t = encodeURIComponent(P(window.location.href));
			window.location.assign(`${this.authBase}/?auth=${e}&next=${t}`);
		}
	}
	async _handleLogout() {
		if (this._loggingOut) return;
		this._loggingOut = !0, this._logoutError = !1, this._renderAccountRegions();
		let e = !1;
		try {
			let t = L();
			e = (await fetch(`${this.authBase}/api/auth/logout`, {
				method: "POST",
				credentials: "include",
				headers: { "x-csrf-token": t }
			})).ok;
		} catch {
			e = !1;
		}
		if (this._loggingOut = !1, this._menuOpen = !1, this._sheetOpen && this._setSheetOpen(!1, !1), !e) {
			this._logoutError = !0, this._renderAccountRegions();
			return;
		}
		this._logoutError = !1, this._stale = !1, this._lastStableState = "signed-out", this._announce("Đã đăng xuất"), await this.refresh(), this.dispatchEvent(new CustomEvent("yh-logout", {
			bubbles: !0,
			composed: !0
		}));
	}
	_setMenuOpen(e, t) {
		this._menuOpen !== e && (this._menuOpen = e, this._accountButtonEl && this._accountButtonEl.setAttribute("aria-expanded", String(e)), this._menuEl && (this._menuEl.hidden = !e), !e && t && this._accountButtonEl?.focus());
	}
	_focusMenuItem(e) {
		if (!this._menuEl) return;
		let t = Array.from(this._menuEl.querySelectorAll("[role=\"menuitem\"]"));
		t.length !== 0 && t[(e % t.length + t.length) % t.length]?.focus();
	}
	_handleMenuKeyDown(e) {
		if (!this._menuEl) return;
		let t = Array.from(this._menuEl.querySelectorAll("[role=\"menuitem\"]"));
		if (t.length === 0) return;
		let n = this._shadow.activeElement, r = n ? t.indexOf(n) : -1;
		switch (e.key) {
			case "ArrowDown":
				e.preventDefault(), this._focusMenuItem(r < 0 ? 0 : r + 1);
				break;
			case "ArrowUp":
				e.preventDefault(), this._focusMenuItem(r < 0 ? t.length - 1 : r - 1);
				break;
			case "Home":
				e.preventDefault(), this._focusMenuItem(0);
				break;
			case "End":
				e.preventDefault(), this._focusMenuItem(t.length - 1);
				break;
			case "Escape":
				e.preventDefault(), this._setMenuOpen(!1, !0);
				break;
			case "Tab": this._setMenuOpen(!1, !1);
		}
	}
	_setSheetOpen(e, t) {
		this._sheetOpen !== e && (this._sheetOpen = e, this._sheetBackdrop.hidden = !e, this._mobileToggleBtn.setAttribute("aria-expanded", String(e)), this._mobileToggleBtn.setAttribute("aria-label", e ? "Đóng menu" : "Mở menu"), e ? (this._syncMobileNavClone(), this._sheetCloseBtn.focus()) : t && this._mobileToggleBtn.focus(), this.dispatchEvent(new CustomEvent("yh-menu-toggle", {
			detail: { open: e },
			bubbles: !0,
			composed: !0
		})));
	}
	_syncMobileNavClone() {
		this._sheetNav.replaceChildren();
		let e = this._navSlot.assignedElements({ flatten: !0 });
		for (let t of e) {
			let e = t.cloneNode(!0);
			e instanceof HTMLElement && (e.removeAttribute("slot"), e.addEventListener("click", (e) => {
				e.target?.closest("a") && this._setSheetOpen(!1, !1);
			})), this._sheetNav.appendChild(e);
		}
	}
	_handleSheetKeyDown(e) {
		if (e.key !== "Tab") return;
		let t = Array.from(this._sheetDialog.querySelectorAll("a[href], button:not([disabled]), [tabindex]:not([tabindex=\"-1\"])")).filter((e) => !e.hasAttribute("hidden"));
		if (t.length === 0) return;
		let n = t[0], r = t[t.length - 1], i = this._shadow.activeElement;
		e.shiftKey && i === n ? (e.preventDefault(), r?.focus()) : !e.shiftKey && i === r && (e.preventDefault(), n?.focus());
	}
	_renderAccountRegions() {
		if (this._rendered) {
			if (this._expiredNotice.hidden = this.hideAccount || this._state !== "expired", this._logoutNotice.hidden = this.hideAccount || !this._logoutError || this._state !== "signed-in", this.hideAccount) {
				this._accountDesktop.hidden = !0, this._accountDesktop.replaceChildren(), this._sheetAccount.hidden = !0, this._sheetAccount.replaceChildren(), this._accountButtonEl = null, this._menuEl = null;
				return;
			}
			this._accountDesktop.hidden = !1, this._sheetAccount.hidden = !1, this._renderDesktopAccount(), this._renderSheetAccount();
		}
	}
	_renderDesktopAccount() {
		if (this._accountDesktop.replaceChildren(), this._accountButtonEl = null, this._menuEl = null, this._state === "loading") {
			let e = document.createElement("div");
			e.className = "yh-skeleton", e.setAttribute("aria-busy", "true"), e.setAttribute("aria-label", "Đang tải tài khoản");
			let t = document.createElement("span");
			t.className = "yh-skeleton-circle";
			let n = document.createElement("span");
			n.className = "yh-skeleton-bar", e.append(t, n), this._accountDesktop.appendChild(e);
			return;
		}
		if (this._state === "error") {
			let e = document.createElement("div");
			e.className = "yh-error-inline";
			let t = document.createElement("span");
			t.className = "yh-muted-text", t.textContent = "Không tải được tài khoản";
			let n = document.createElement("button");
			n.type = "button", n.className = "yh-btn yh-btn-icon", n.setAttribute("aria-label", "Thử lại"), n.title = "Thử lại", n.appendChild(z("M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15")), n.addEventListener("click", () => {
				this.refresh();
			}), e.append(t, n), this._accountDesktop.appendChild(e);
			return;
		}
		if (this._state === "signed-in" && this._user) {
			let e = this._user, t = document.createElement("button");
			t.type = "button", t.className = "yh-account-btn", t.setAttribute("part", "account-button"), t.setAttribute("aria-haspopup", "menu"), t.setAttribute("aria-expanded", String(this._menuOpen)), t.setAttribute("aria-label", `Tài khoản: ${e.displayName}`);
			let n = document.createElement("span");
			n.className = "yh-account-name", n.textContent = e.displayName;
			let r = z("M6 9l6 6 6-6", "yh-chevron");
			t.append(H(e), n, r), t.addEventListener("click", () => {
				this._setMenuOpen(!this._menuOpen, !1);
			}), t.addEventListener("keydown", (e) => {
				e.key === "Enter" || e.key === " " || e.key === "ArrowDown" ? (e.preventDefault(), this._setMenuOpen(!0, !1), this._focusMenuItem(0)) : e.key === "Escape" && this._menuOpen && (e.preventDefault(), this._setMenuOpen(!1, !1));
			});
			let i = document.createElement("div");
			i.className = "yh-menu", i.setAttribute("part", "menu"), i.setAttribute("role", "menu"), i.hidden = !this._menuOpen, i.addEventListener("keydown", (e) => {
				this._handleMenuKeyDown(e);
			});
			let a = document.createElement("div");
			a.className = "yh-menu-header";
			let o = document.createElement("div");
			o.className = "yh-menu-identity";
			let s = document.createElement("span");
			s.className = "yh-menu-name", s.textContent = e.displayName;
			let c = document.createElement("span");
			c.className = "yh-menu-email", c.textContent = e.email ?? "", o.append(s, c), a.append(H(e), o);
			let l = document.createElement("a");
			l.className = "yh-menu-item", l.setAttribute("role", "menuitem"), l.href = this.profileUrl, l.textContent = "Hồ sơ";
			let u = document.createElement("a");
			u.className = "yh-menu-item", u.setAttribute("role", "menuitem"), u.href = this.authBase, u.textContent = "Về YunDev.space";
			let d = document.createElement("hr");
			d.className = "yh-menu-divider", d.setAttribute("role", "separator");
			let f = document.createElement("button");
			f.type = "button", f.className = "yh-menu-item", f.setAttribute("role", "menuitem"), f.disabled = this._loggingOut, f.textContent = this._loggingOut ? "Đang đăng xuất…" : "Đăng xuất (mọi site)", f.addEventListener("click", () => {
				this._handleLogout();
			}), i.append(a, l, u, d, f), this._accountButtonEl = t, this._menuEl = i, this._accountDesktop.append(t, i);
			return;
		}
		let e = document.createElement("button");
		e.type = "button", e.className = "yh-btn yh-btn-text", e.textContent = "Đăng nhập", e.addEventListener("click", () => {
			this._handleAuthClick("signin");
		});
		let t = document.createElement("button");
		t.type = "button", t.className = "yh-btn yh-btn-primary", t.textContent = "Đăng ký", t.addEventListener("click", () => {
			this._handleAuthClick("signup");
		}), this._accountDesktop.append(e, t);
	}
	_renderSheetAccount() {
		if (this._sheetAccount.replaceChildren(), this._state === "loading") {
			let e = document.createElement("div");
			e.className = "yh-skeleton", e.setAttribute("aria-busy", "true");
			let t = document.createElement("span");
			t.className = "yh-skeleton-circle";
			let n = document.createElement("span");
			n.className = "yh-skeleton-bar", e.append(t, n), this._sheetAccount.appendChild(e);
			return;
		}
		if (this._state === "error") {
			let e = document.createElement("div");
			e.className = "yh-error-inline";
			let t = document.createElement("span");
			t.className = "yh-muted-text", t.textContent = "Không tải được tài khoản";
			let n = document.createElement("button");
			n.type = "button", n.className = "yh-btn yh-btn-icon", n.setAttribute("aria-label", "Thử lại"), n.appendChild(z("M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15")), n.addEventListener("click", () => {
				this.refresh();
			}), e.append(t, n), this._sheetAccount.appendChild(e);
			return;
		}
		if (this._state === "signed-in" && this._user) {
			let e = this._user, t = document.createElement("div");
			t.className = "yh-menu-header";
			let n = document.createElement("div");
			n.className = "yh-menu-identity";
			let r = document.createElement("span");
			r.className = "yh-menu-name", r.textContent = e.displayName;
			let i = document.createElement("span");
			i.className = "yh-menu-email", i.textContent = e.email ?? "", n.append(r, i), t.append(H(e), n);
			let a = document.createElement("div");
			a.className = "yh-sheet-account-actions";
			let o = document.createElement("a");
			o.className = "yh-menu-item", o.href = this.profileUrl, o.textContent = "Hồ sơ";
			let s = document.createElement("a");
			s.className = "yh-menu-item", s.href = this.authBase, s.textContent = "Về YunDev.space";
			let c = document.createElement("button");
			c.type = "button", c.className = "yh-menu-item", c.disabled = this._loggingOut, c.textContent = this._loggingOut ? "Đang đăng xuất…" : "Đăng xuất (mọi site)", c.addEventListener("click", () => {
				this._handleLogout();
			}), a.append(o, s, c), this._sheetAccount.append(t, a);
			return;
		}
		let e = document.createElement("div");
		e.className = "yh-sheet-account-actions";
		let t = document.createElement("button");
		t.type = "button", t.className = "yh-btn yh-btn-text", t.textContent = "Đăng nhập", t.addEventListener("click", () => {
			this._handleAuthClick("signin");
		});
		let n = document.createElement("button");
		n.type = "button", n.className = "yh-btn yh-btn-primary", n.textContent = "Đăng ký", n.addEventListener("click", () => {
			this._handleAuthClick("signup");
		}), e.append(t, n), this._sheetAccount.appendChild(e);
	}
};
//#endregion
//#region src/yun-header/index.ts
function W(e = "yun-header") {
	typeof customElements < "u" && !customElements.get(e) && customElements.define(e, U);
}
b(), W();
//#endregion
export { s as THEME_COOKIE, c as THEME_EVENT, o as THEME_STORAGE_KEY, U as YunHeader, W as defineYunHeader, b as initTheme, j as isAllowedAuthOrigin, h as resolveTheme, v as setTheme };

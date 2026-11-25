(function (global) {
    'use strict';

    const AUTH_ORIGIN = 'https://www.yundev.space';

    function readCookie(name) {
        if (typeof document === 'undefined' || !document.cookie) {
            return '';
        }
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i += 1) {
            const item = cookies[i].trim();
            const eqIdx = item.indexOf('=');
            if (eqIdx === -1) {
                continue;
            }
            const key = item.slice(0, eqIdx).trim();
            if (key === name) {
                const rawVal = item.slice(eqIdx + 1);
                try {
                    return decodeURIComponent(rawVal);
                } catch (_err) {
                    return rawVal;
                }
            }
        }
        return '';
    }

    async function getMe() {
        try {
            const res = await fetch(`${AUTH_ORIGIN}/api/auth/me`, {
                method: 'GET',
                credentials: 'include',
                cache: 'no-store'
            });
            if (res.status === 401 || !res.ok) {
                return null;
            }
            const data = await res.json();
            if (data && data.ok !== false && data.user) {
                return data.user;
            }
            return null;
        } catch (_err) {
            return null;
        }
    }

    async function logout() {
        try {
            const csrf = readCookie('csrf');
            const res = await fetch(`${AUTH_ORIGIN}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': csrf
                }
            });
            return Boolean(res.ok);
        } catch (_err) {
            return false;
        }
    }

    global.YundevAuth = {
        getMe: getMe,
        logout: logout
    };
})(window);

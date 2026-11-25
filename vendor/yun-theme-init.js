// keep in sync with src/yun-header/theme.ts
(function () {
  var theme = null;
  try {
    var cookies = document.cookie ? document.cookie.split(';') : [];
    for (var i = 0; i < cookies.length; i += 1) {
      var seg = cookies[i];
      var eq = seg.indexOf('=');
      if (eq <= 0) continue;
      var key = seg.slice(0, eq).trim();
      if (key !== 'yun_theme') continue;
      var val = seg.slice(eq + 1).trim();
      try {
        val = decodeURIComponent(val);
      } catch (e) {}
      if (val === 'light' || val === 'dark') {
        theme = val;
      }
    }
  } catch (e) {}

  if (!theme) {
    try {
      var stored = window.localStorage.getItem('yun-theme');
      if (stored === 'light' || stored === 'dark') {
        theme = stored;
      } else {
        var legacy = window.localStorage.getItem('theme');
        if (legacy === 'light' || legacy === 'dark') {
          theme = legacy;
        }
      }
    } catch (e) {}
  }

  if (!theme) {
    try {
      theme =
        window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
    } catch (e) {
      theme = 'light';
    }
  }

  var root = document.documentElement;
  if (root) {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  }
})();

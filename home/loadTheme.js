(function () {
  var t = localStorage.getItem("zenThemeCache") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", t);
  var c = localStorage.getItem("zenBgColorCache_" + t);
  if (c) document.documentElement.style.setProperty("--zen-paper", c);
})();

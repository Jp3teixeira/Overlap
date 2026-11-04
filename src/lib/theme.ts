/** Preferência de tema: "auto" segue o telemóvel. O resultado (claro/escuro) vai para <html data-theme>. */
export const THEME_KEY = "theme";
export type ThemePreference = "auto" | "light" | "dark";

/**
 * Corre no <head> antes da primeira pintura (evita o flash de tema errado) e acompanha
 * o telemóvel quando a preferência é "auto". Mantém a lógica igual à de `applyTheme`.
 */
export const themeScript = `(function(){try{
var m=matchMedia('(prefers-color-scheme: dark)');
function pref(){var t=localStorage.getItem('${THEME_KEY}');return t==='light'||t==='dark'?t:'auto'}
function apply(){var p=pref();document.documentElement.dataset.theme=(p==='dark'||(p==='auto'&&m.matches))?'dark':'light'}
apply();m.addEventListener('change',apply);
}catch(e){}})();`;

export function readPreference(): ThemePreference {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : "auto";
  } catch {
    return "auto";
  }
}

export function applyTheme(pref: ThemePreference) {
  try {
    if (pref === "auto") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch {
    // sem armazenamento (janela privada): fica só para esta página
  }
  const dark =
    pref === "dark" || (pref === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  window.dispatchEvent(new Event("themechange"));
}

export const NEXT_PREFERENCE: Record<ThemePreference, ThemePreference> = {
  auto: "dark",
  dark: "light",
  light: "auto",
};
export const PREFERENCE_LABEL: Record<ThemePreference, string> = {
  auto: "Automático",
  light: "Claro",
  dark: "Escuro",
};

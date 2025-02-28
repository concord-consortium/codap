export function hideSplashScreen() {
  const splash = document.getElementById("splash-screen")
  if (!splash) return
  splash.style.display = "none"
}

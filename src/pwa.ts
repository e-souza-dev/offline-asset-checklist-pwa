import { registerSW } from "virtual:pwa-register";

export function registerPWA() {
  registerSW({
    immediate: true,
    onRegistered() {
      // Service Worker registrado
    },
    onRegisterError(error: unknown) {
      console.error("PWA SW register error:", error);
    },
  });
}

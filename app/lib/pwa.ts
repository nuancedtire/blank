/**
 * PWA Registration Helper for ED Guidelines Assistant
 */

/**
 * Registers the service worker for PWA functionality
 * @returns Promise that resolves with the ServiceWorkerRegistration or null if unsupported
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  // Check for service worker support
  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service workers are not supported in this browser');
    return null;
  }

  try {
    // Wait for the window to load before registering
    if (document.readyState === 'loading') {
      await new Promise<void>((resolve) => {
        window.addEventListener('load', () => resolve());
      });
    }

    // Register the service worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[PWA] Service worker registered successfully:', registration.scope);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content is available, notify user
            console.log('[PWA] New content available, please refresh');
            // TODO: Dispatch custom event or show update notification
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('[PWA] Service worker registration failed:', error);
    return null;
  }
}

/**
 * Unregisters all service workers (useful for development/debugging)
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const success = await registration.unregister();
      console.log('[PWA] Service worker unregistered:', success);
      return success;
    }
    return false;
  } catch (error) {
    console.error('[PWA] Service worker unregistration failed:', error);
    return false;
  }
}

/**
 * Checks if the app is running in standalone mode (installed PWA)
 */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

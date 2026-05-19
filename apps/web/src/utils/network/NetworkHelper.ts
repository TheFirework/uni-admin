interface NetworkStatus {
  online: boolean;
  quality: '4g' | '3g' | '2g' | 'offline';
}

type NetworkChangeCallback = (status: NetworkStatus) => void;

class NetworkHelper {
  private listeners: Set<NetworkChangeCallback> = new Set();

  getStatus(): NetworkStatus {
    const conn = (navigator as unknown as Record<string, unknown>).connection as
      | { effectiveType?: string }
      | undefined;

    if (!navigator.onLine) return { online: false, quality: 'offline' };

    const effectiveType = conn?.effectiveType as string | undefined;

    switch (effectiveType) {
      case '4g':
        return { online: true, quality: '4g' };
      case '3g':
        return { online: true, quality: '3g' };
      case '2g':
      case 'slow-2g':
        return { online: true, quality: '2g' };
      default:
        return { online: true, quality: '4g' };
    }
  }

  onChange(callback: NetworkChangeCallback): () => void {
    this.listeners.add(callback);

    const handleOnline = (): void => callback(this.getStatus());
    const handleOffline = (): void => callback(this.getStatus());

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      this.listeners.delete(callback);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }

  isSlowConnection(): boolean {
    const status = this.getStatus();
    return status.quality === '2g' || status.quality === 'offline';
  }
}

export const networkHelper = new NetworkHelper();

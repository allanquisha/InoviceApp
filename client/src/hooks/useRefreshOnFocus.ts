import { useEffect } from 'react';

export function useRefreshOnFocus(callback: () => void) {
  useEffect(() => {
    function onFocus() { callback(); }
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') callback();
    });
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [callback]);
}

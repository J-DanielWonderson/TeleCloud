import { useState, useEffect } from 'react';

/**
 * Checks whether the current runtime environment is Android.
 */
export const isAndroid = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
};

/**
 * Checks whether the current runtime is a mobile/tablet touch device.
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Responsive hook:
 * - On Windows/Desktop: ALWAYS returns false (Desktop UI remains fixed and never collapses to phone UI regardless of window size)
 * - On Android Phone (< breakpoint): returns true (Mobile Phone UI)
 * - On Android Tablet (>= breakpoint): returns false for mobile-phone UI, enabling tablet layout
 */
export const useMobile = (breakpoint: number = 768): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return isAndroid() && window.innerWidth < breakpoint;
  });

  useEffect(() => {
    const handleResize = () => {
      // ONLY Android phones switch to mobile layout below the breakpoint
      setIsMobile(isAndroid() && window.innerWidth < breakpoint);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
};

/**
 * Tablet hook:
 * - True on Android devices with screen width >= breakpoint (768px+)
 */
export const useTablet = (breakpoint: number = 768): boolean => {
  const [isTablet, setIsTablet] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return isAndroid() && window.innerWidth >= breakpoint;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsTablet(isAndroid() && window.innerWidth >= breakpoint);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isTablet;
};

export default useMobile;

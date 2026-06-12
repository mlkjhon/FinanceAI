import React, { Suspense } from 'react';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { QueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider } from '../contexts/AuthContext';
import { SplashScreen } from '../components/SplashScreen';

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: RootLayout,
});

function RootLayout() {
  const [splash, setSplash] = React.useState(() => !sessionStorage.getItem('splashShown'));

  React.useEffect(() => {
    if (splash) {
      const t = setTimeout(() => {
        setSplash(false);
        sessionStorage.setItem('splashShown', '1');
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [splash]);

  return (
    <AuthProvider>
      <AnimatePresence>
        {splash && <SplashScreen key="splash" type="initial" />}
      </AnimatePresence>
      {!splash && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="min-h-screen bg-[var(--color-finance-bg-light)] dark:bg-[var(--color-finance-bg-dark)] text-gray-900 dark:text-white transition-colors duration-200"
        >
          <Suspense fallback={<SplashScreen type="transition" />}>
            <Outlet />
          </Suspense>
        </motion.div>
      )}
    </AuthProvider>
  );
}

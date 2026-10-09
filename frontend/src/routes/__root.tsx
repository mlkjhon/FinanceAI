import React, { Suspense, lazy } from 'react';
import { createRootRouteWithContext, Outlet, useRouterState } from '@tanstack/react-router';
import { QueryClient } from '@tanstack/react-query';
import { AuthProvider } from '../contexts/AuthContext';

// O splash só existe nas telas do app; a landing não baixa esse código.
const SplashOverlay = lazy(() => import('../components/SplashScreen').then((m) => ({ default: m.SplashOverlay })));

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: RootLayout,
});

function RouteFallback() {
  return (
    <div className="fixed inset-0 z-[var(--z-splash)] flex items-center justify-center bg-white" role="status" aria-label="Carregando">
      <div className="w-full max-w-sm space-y-4 px-6">
        {[100, 85, 70].map((w) => (
          <span key={w} className="media-frame block h-4 rounded-full" data-loading="" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

function RootLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // A landing não espera o splash de 3s nem o fade do container:
  // a headline e a imagem do hero precisam pintar logo (LCP < 2,5s).
  const isLanding = pathname === '/';
  const [splash, setSplash] = React.useState(() => !isLanding && !sessionStorage.getItem('splashShown'));

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
      {!isLanding && (
        <Suspense fallback={splash ? <RouteFallback /> : null}>
          <SplashOverlay show={splash} />
        </Suspense>
      )}
      {!splash && (
        <div className={isLanding ? 'min-h-[100dvh] bg-white text-gray-900' : 'route-fade min-h-[100dvh] bg-white text-gray-900'}>
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </div>
      )}
    </AuthProvider>
  );
}

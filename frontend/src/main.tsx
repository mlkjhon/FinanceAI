import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './styles.css';
import { aplicarPreferencias } from './lib/preferencias';
import { Preferencias } from './components/preferencias';

// Import the generated route tree
import { routeTree } from './routeTree.gen';
import { NotFoundPage } from './components/NotFoundPage';

// Create Query Client
const queryClient = new QueryClient();

// Create a new router instance
const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  // Rotas inexistentes caem na página 404 da marca.
  defaultNotFoundComponent: NotFoundPage,
  context: {
    queryClient,
  },
});

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// Ocultar valores / reduzir animações valem desde a primeira pintura
aplicarPreferencias();

const rootElement = document.getElementById('root')!;
if (!rootElement.innerHTML) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <Preferencias>
          <RouterProvider router={router} />
        </Preferencias>
      </QueryClientProvider>
    </StrictMode>
  );
}

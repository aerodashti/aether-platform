import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';

/** Estado de servidor é do Query; estado de UI fica em useState ou contexto local. Sem store global. */
const cliente = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export function Provedores({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={cliente}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

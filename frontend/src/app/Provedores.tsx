import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { criarClienteDeConsultas } from './clienteDeConsultas';

const cliente = criarClienteDeConsultas();

export function Provedores({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={cliente}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

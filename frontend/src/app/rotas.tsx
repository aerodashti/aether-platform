import { Route, Routes } from 'react-router-dom';

import { RotaAutenticada } from '@/compartilhado/sessao/RotaAutenticada';
import { RotaDeAdministrador } from '@/compartilhado/sessao/RotaDeAdministrador';
import { PaginaDeAeronaves } from '@/features/aeronaves/componentes/PaginaDeAeronaves';
import { PaginaDeDetalheDaAeronave } from '@/features/aeronaves/componentes/PaginaDeDetalheDaAeronave';
import { PaginaDeNovaAeronave } from '@/features/aeronaves/componentes/PaginaDeNovaAeronave';
import { PaginaDeLogin } from '@/features/autenticacao/componentes/PaginaDeLogin';
import { PaginaDeConfiguracoes } from '@/features/configuracoes/componentes/PaginaDeConfiguracoes';
import { PaginaDeCustos } from '@/features/custos/componentes/PaginaDeCustos';
import { PaginaDeProprietarios } from '@/features/proprietarios/componentes/PaginaDeProprietarios';
import { PaginaSaude } from '@/features/saude/componentes/PaginaSaude';
import { PaginaDeUsuarios } from '@/features/usuarios/componentes/PaginaDeUsuarios';
import { PaginaDeVoos } from '@/features/voos/componentes/PaginaDeVoos';

import { LayoutDaAplicacao } from './LayoutDaAplicacao';

export function Rotas() {
  return (
    <Routes>
      {/* Fora do layout da aplicação: a tela de entrada ocupa a viewport inteira e não tem
          navegação — quem ainda não entrou não tem para onde navegar. */}
      <Route path="/entrar" element={<PaginaDeLogin />} />

      {/* Tudo abaixo daqui exige sessão. A guarda é conveniência de interface; quem recusa de
          verdade é a cadeia de autorização do servidor. */}
      <Route element={<RotaAutenticada />}>
        <Route element={<LayoutDaAplicacao />}>
          <Route index element={<PaginaSaude />} />
          <Route path="/aeronaves" element={<PaginaDeAeronaves />} />
          <Route path="/aeronaves/nova" element={<PaginaDeNovaAeronave />} />
          <Route path="/aeronaves/:id" element={<PaginaDeDetalheDaAeronave />} />
          <Route path="/voos" element={<PaginaDeVoos />} />
          <Route path="/custos" element={<PaginaDeCustos />} />
          <Route path="/proprietarios" element={<PaginaDeProprietarios />} />
          <Route path="/configuracoes" element={<PaginaDeConfiguracoes />} />
          <Route element={<RotaDeAdministrador />}>
            <Route path="/usuarios" element={<PaginaDeUsuarios />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

import { useSessao } from '@/compartilhado/sessao/sessao';
import { Texto } from '@/design-system/primitivos/Texto';

import { useEmpresa } from '../api/useConfiguracoes';

import { CartaoDaEmpresa } from './CartaoDaEmpresa';
import { CartaoDeAparencia } from './CartaoDeAparencia';
import { CartaoDeAviso } from './CartaoDeAviso';
import { CartaoDeSeguranca } from './CartaoDeSeguranca';
import estilos from './PaginaDeConfiguracoes.module.css';

/**
 * Configurações.
 *
 * <p>A tela é visível para todo mundo, mas nem toda seção é: dados da empresa e política de aviso
 * são escrita de administrador, e quem não é simplesmente não as vê. Esconder não é a proteção —
 * o servidor recusa com 403 de qualquer forma; é não oferecer o que seria recusado.
 */
export function PaginaDeConfiguracoes() {
  const { ehAdministrador } = useSessao();
  const consulta = useEmpresa();

  return (
    <div className={estilos.tela}>
      <div className={estilos.coluna}>
        {ehAdministrador && consulta.data ? <CartaoDaEmpresa empresa={consulta.data} /> : null}
        <CartaoDeAparencia />
        {ehAdministrador && consulta.data ? <CartaoDeAviso empresa={consulta.data} /> : null}
        {consulta.isError ? (
          <Texto variante="apoio" tom="critico" como="p">
            Não foi possível carregar os dados da empresa.
          </Texto>
        ) : null}
      </div>
      <div className={estilos.coluna}>
        <CartaoDeSeguranca />
      </div>
    </div>
  );
}

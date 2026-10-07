import { Texto } from '@/design-system/primitivos/Texto';

import estilos from './RetornoDaAcao.module.css';

export interface Retorno {
  tom: 'positivo' | 'critico';
  mensagem: string;
}

/**
 * Como terminou a última ação sobre um usuário — convidar, reenviar, desativar, reativar —, numa
 * faixa no alto da grade. As duas regiões vivas ficam sempre montadas: o leitor de tela só anuncia
 * o que muda dentro de uma região que já existia. O sucesso é `status`; a recusa, `alert`.
 */
export function RetornoDaAcao({ retorno }: { retorno: Retorno | null }) {
  return (
    <>
      <div role="status">{retorno?.tom === 'positivo' ? <Faixa retorno={retorno} /> : null}</div>
      <div role="alert">{retorno?.tom === 'critico' ? <Faixa retorno={retorno} /> : null}</div>
    </>
  );
}

function Faixa({ retorno }: { retorno: Retorno }) {
  return (
    <div className={estilos.faixa}>
      <Texto variante="apoio" tom={retorno.tom} como="p">
        {retorno.mensagem}
      </Texto>
    </div>
  );
}

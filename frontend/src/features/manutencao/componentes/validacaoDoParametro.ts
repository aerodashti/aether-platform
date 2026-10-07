import { lerNumero } from '@/compartilhado/formatacao/numero';
import {
  dataEntre,
  numero,
  obrigatorio,
  primeiraFalha,
  tamanhoMaximo,
  type Regra,
} from '@/compartilhado/formulario/regras';
import type { Erros } from '@/compartilhado/formulario/useValidacao';

import type { TipoDeParametro } from '../api/useManutencao';

import { anoDeQuatroDigitos, PRIMEIRA_DATA, ultimaDataLimite } from './datasDaManutencao';
import type { RascunhoDoParametro } from './rascunhoDoParametro';

export type CampoDoParametro = keyof RascunhoDoParametro;

/** Na ordem da tela: é a ordem em que o resumo os lista. */
export const ROTULOS_DO_PARAMETRO: Record<CampoDoParametro, string> = {
  nome: 'Nome do parâmetro',
  tipo: 'Régua do parâmetro',
  limite: 'Limite',
  dataLimite: 'Data limite',
  aviso: 'Faixa de aviso',
};

/** O teto de `NUMERIC(10,1)`, a coluna do limite e da faixa de aviso. */
export const LIMITE_MAXIMO = 999_999_999.9;

const FALTA_DO_LIMITE: Record<Exclude<TipoDeParametro, 'DATA'>, string> = {
  HORAS: 'Informe o limite em horas de célula.',
  CICLOS: 'Informe o limite em ciclos.',
};

/** Só as horas têm décimos: ciclos se contam inteiros, e o restante em dias também é inteiro. */
function casasDaRegua(tipo: TipoDeParametro): number {
  return tipo === 'HORAS' ? 1 : 0;
}

/** Com o aviso maior que o limite, o parâmetro nasceria em atenção para sempre (D20). */
function avisoAntesDoLimite(rascunho: RascunhoDoParametro): Regra {
  return (texto) => {
    const limite = lerNumero(rascunho.limite);
    const aviso = lerNumero(texto);
    return rascunho.tipo !== 'DATA' && limite !== null && aviso !== null && aviso >= limite
      ? 'A faixa de aviso precisa ser menor que o limite.'
      : undefined;
  };
}

function erroDoLimite({ tipo, limite }: RascunhoDoParametro): string | undefined {
  if (tipo === 'DATA') {
    return undefined;
  }
  return primeiraFalha(
    limite,
    obrigatorio(FALTA_DO_LIMITE[tipo]),
    numero({ maiorQue: 0, maximo: LIMITE_MAXIMO, casas: casasDaRegua(tipo) }),
  );
}

function erroDaDataLimite({ tipo, dataLimite }: RascunhoDoParametro, hoje: string) {
  if (tipo !== 'DATA') {
    return undefined;
  }
  return primeiraFalha(
    dataLimite,
    obrigatorio('Informe a data limite.'),
    anoDeQuatroDigitos,
    dataEntre({ minimo: PRIMEIRA_DATA, maximo: ultimaDataLimite(hoje) }),
  );
}

/** As regras do `ParametroRequest` e das invariantes de `ParametroDeControle`, ditas no campo. */
export function validarParametro(
  rascunho: RascunhoDoParametro,
  hoje: string,
): Erros<CampoDoParametro> {
  return {
    nome: primeiraFalha(
      rascunho.nome,
      obrigatorio('Informe o nome do parâmetro.'),
      tamanhoMaximo(120),
    ),
    limite: erroDoLimite(rascunho),
    dataLimite: erroDaDataLimite(rascunho, hoje),
    aviso: primeiraFalha(
      rascunho.aviso,
      obrigatorio('Informe a faixa de aviso.'),
      numero({ maiorQue: 0, maximo: LIMITE_MAXIMO, casas: casasDaRegua(rascunho.tipo) }),
      avisoAntesDoLimite(rascunho),
    ),
  };
}

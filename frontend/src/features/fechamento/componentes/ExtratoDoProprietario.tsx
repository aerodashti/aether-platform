import { Botao } from '@/design-system/primitivos/Botao';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { Texto } from '@/design-system/primitivos/Texto';

import type { LinhaDoProprietario } from '../api/useFechamento';

import estilos from './ExtratoDoProprietario.module.css';
import { competenciaPorExtenso, horasEmTexto, moedaEmTexto, percentualEmTexto } from './rotulos';

interface ExtratoDoProprietarioProps {
  linha: LinhaDoProprietario;
  matricula: string | undefined;
  competencia: string | undefined;
  aoFechar: () => void;
}

/**
 * O extrato de um proprietário numa competência, na ordem do protótipo: do saldo anterior ao
 * acumulado, cada linha somando ou subtraindo — quem lê confere a conta sem calculadora.
 */
export function ExtratoDoProprietario({
  linha,
  matricula,
  competencia,
  aoFechar,
}: ExtratoDoProprietarioProps) {
  const resultado = (linha.aportes ?? 0) + (linha.rendimentos ?? 0) - (linha.totalDoMes ?? 0);
  const linhas: Array<[string, string, 'normal' | 'total']> = [
    ['Participação', percentualEmTexto(linha.percentual), 'normal'],
    [
      'Utilização no mês',
      `${horasEmTexto(linha.horas)} · ${percentualEmTexto(linha.percentualDeUso)} do uso`,
      'normal',
    ],
    ['Saldo anterior', moedaEmTexto(linha.saldoAnterior), 'normal'],
    ['Custos fixos alocados', `− ${moedaEmTexto(linha.custoFixo)}`, 'normal'],
    ['Custos variáveis', `− ${moedaEmTexto(linha.custoVariavel)}`, 'normal'],
    ['Total de custos do mês', `− ${moedaEmTexto(linha.totalDoMes)}`, 'total'],
    ['Aportes no mês', `+ ${moedaEmTexto(linha.aportes)}`, 'normal'],
    ['Rendimentos do fundo', `+ ${moedaEmTexto(linha.rendimentos)}`, 'normal'],
    ['Resultado do mês', moedaEmTexto(resultado), 'total'],
    ['Saldo acumulado', moedaEmTexto(linha.saldoAcumulado), 'total'],
  ];
  const titulo = `Extrato · ${linha.nome ?? ''}`;

  return (
    <PainelModal aberto aoFechar={aoFechar} rotulo={titulo}>
      <Texto variante="titulo" como="h2">
        {titulo}
      </Texto>
      <Texto variante="apoio" tom="suave" como="p">
        {matricula} · {competenciaPorExtenso(competencia)} · valores em BRL
      </Texto>
      <dl className={estilos.lista}>
        {linhas.map(([rotulo, valor, peso]) => (
          <div className={peso === 'total' ? estilos.total : estilos.item} key={rotulo}>
            <dt>{rotulo}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
      <Texto variante="apoio" tom="suave" como="p">
        Saldo positivo é crédito no fundo; negativo, valor a aportar.
      </Texto>
      <div className={estilos.acoes}>
        <Botao variante="secundario" aoClicar={aoFechar}>
          Fechar
        </Botao>
      </div>
    </PainelModal>
  );
}

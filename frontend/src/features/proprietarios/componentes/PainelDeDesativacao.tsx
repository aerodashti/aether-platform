import { useState } from 'react';

import { ErroDeApi } from '@/api/cliente';
import type { VinculoVigenteResponse } from '@/compartilhado/participacoes/useVinculosVigentes';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { Texto } from '@/design-system/primitivos/Texto';

import {
  useDesativarProprietario,
  useSairDosContratos,
  type ProprietarioResponse,
} from '../api/useProprietarios';

import estilos from './PainelDeDesativacao.module.css';
import {
  contratoFecha,
  contratosSemQuemSai,
  lerPercentual,
  somaDasFatias,
  type ContratoSemQuemSai,
} from './rebalanceamento';

interface PainelDeDesativacaoProps {
  proprietario: ProprietarioResponse;
  vinculos: VinculoVigenteResponse[] | undefined;
  /** Quem pode entrar no lugar: os proprietários ativos. */
  proprietarios: ProprietarioResponse[];
  aoFechar: () => void;
}

const DUAS_CASAS = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

/**
 * O "Excluir proprietário" do protótipo, que aqui é desativar. Sem participação vigente, só
 * confirma. Com participação, mostra cada aeronave dele com os demais na participação atual, para
 * a pessoa distribuir o percentual liberado — entre eles ou para alguém que entra — até fechar
 * 100%. Confirmar cria um contrato novo por aeronave, arquiva o anterior e desativa, tudo de uma vez.
 */
export function PainelDeDesativacao({
  proprietario,
  vinculos,
  proprietarios,
  aoFechar,
}: PainelDeDesativacaoProps) {
  const id = proprietario.id ?? 0;
  const [contratos, setContratos] = useState<ContratoSemQuemSai[]>(() =>
    contratosSemQuemSai(vinculos, id),
  );
  const desativar = useDesativarProprietario();
  const sair = useSairDosContratos();
  const comParticipacao = contratos.length > 0;
  const mutacao = comParticipacao ? sair : desativar;
  const nomes = new Map(proprietarios.map((dono) => [dono.id ?? 0, dono.nome ?? '']));
  const podeConfirmar = contratos.every((contrato) => contratoFecha(contrato.fatias));

  function mudar(
    aeronaveId: number,
    mudanca: (contrato: ContratoSemQuemSai) => ContratoSemQuemSai,
  ) {
    setContratos((atuais) =>
      atuais.map((contrato) => (contrato.aeronaveId === aeronaveId ? mudanca(contrato) : contrato)),
    );
  }

  function confirmar() {
    const aoTerminar = { onSuccess: aoFechar };
    if (!comParticipacao) {
      desativar.mutate(id, aoTerminar);
      return;
    }
    sair.mutate(
      {
        proprietarioId: id,
        contratos: contratos.map((contrato) => ({
          aeronaveId: contrato.aeronaveId,
          participacoes: contrato.fatias.map((fatia) => ({
            proprietarioId: fatia.proprietarioId,
            percentual: lerPercentual(fatia.percentual),
          })),
        })),
      },
      aoTerminar,
    );
  }

  const erro = mutacao.error instanceof ErroDeApi ? mutacao.error.message : undefined;

  return (
    <PainelModal aberto aoFechar={aoFechar} rotulo={`Desativar ${proprietario.nome ?? ''}`}>
      <Texto variante="titulo" como="h2">
        Desativar proprietário · {proprietario.nome}
      </Texto>
      {comParticipacao ? (
        <Texto variante="apoio" tom="suave" como="p">
          Os demais proprietários aparecem com a participação atual — distribua o percentual
          liberado até a soma fechar em 100%. Um novo contrato vigente será criado em cada aeronave
          e o anterior arquivado no histórico.
        </Texto>
      ) : (
        <Texto variante="apoio" tom="suave" como="p">
          Este proprietário não possui participações ativas. Desativar apenas o tornará inativo — o
          cadastro e o histórico são preservados.
        </Texto>
      )}

      {contratos.map((contrato) => {
        const soma = somaDasFatias(contrato.fatias);
        const fora = proprietarios.filter(
          (dono) =>
            dono.situacao === 'ATIVO' &&
            dono.id !== id &&
            !contrato.fatias.some((fatia) => fatia.proprietarioId === dono.id),
        );
        return (
          <section
            key={contrato.aeronaveId}
            className={estilos.aeronave}
            aria-label={`Contrato novo da ${contrato.matricula}`}
          >
            <div className={estilos.cabecalho}>
              <span className={estilos.matricula}>{contrato.matricula}</span>
              <Texto variante="apoio" tom="suave" como="span">
                {DUAS_CASAS.format(contrato.liberado)}% liberado
              </Texto>
            </div>
            {contrato.fatias.map((fatia) => (
              <div key={fatia.proprietarioId} className={estilos.fatia}>
                <span className={estilos.nome}>{nomes.get(fatia.proprietarioId)}</span>
                <CampoDeTexto
                  rotulo={`Participação de ${nomes.get(fatia.proprietarioId) ?? ''} na ${contrato.matricula} em %`}
                  rotuloOculto
                  valor={fatia.percentual}
                  inputMode="decimal"
                  alinhamento="direita"
                  aoMudar={(valor) =>
                    mudar(contrato.aeronaveId, (atual) => ({
                      ...atual,
                      fatias: atual.fatias.map((f) =>
                        f.proprietarioId === fatia.proprietarioId ? { ...f, percentual: valor } : f,
                      ),
                    }))
                  }
                />
              </div>
            ))}
            {fora.length > 0 ? (
              <Selecao
                rotulo={`Incluir proprietário na ${contrato.matricula}`}
                rotuloOculto
                valor=""
                opcoes={[
                  { valor: '', rotulo: '+ Incluir outro proprietário…' },
                  ...fora.map((dono) => ({ valor: String(dono.id), rotulo: dono.nome ?? '' })),
                ]}
                aoMudar={(escolhido) =>
                  escolhido &&
                  mudar(contrato.aeronaveId, (atual) => ({
                    ...atual,
                    fatias: [
                      ...atual.fatias,
                      { proprietarioId: Number(escolhido), percentual: '' },
                    ],
                  }))
                }
              />
            ) : null}
            <Texto
              variante="apoio"
              tom={contratoFecha(contrato.fatias) ? 'positivo' : 'atencao'}
              como="p"
            >
              Soma: {DUAS_CASAS.format(soma)}%
              {contratoFecha(contrato.fatias)
                ? ' — fechado em 100%.'
                : ` — faltam ${DUAS_CASAS.format(100 - soma)}% para fechar.`}
            </Texto>
          </section>
        );
      })}

      {erro ? (
        <div role="alert">
          <Texto variante="apoio" tom="critico" como="p">
            {erro}
          </Texto>
        </div>
      ) : null}

      <div className={estilos.acoes}>
        <Botao variante="secundario" aoClicar={aoFechar}>
          Cancelar
        </Botao>
        <Botao desabilitado={!podeConfirmar} carregando={mutacao.isPending} aoClicar={confirmar}>
          {comParticipacao ? 'Redistribuir e desativar' : 'Desativar'}
        </Botao>
      </div>
    </PainelModal>
  );
}

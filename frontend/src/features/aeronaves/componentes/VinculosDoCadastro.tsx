import { useCallback, useState } from 'react';

import { numeroParaCampo } from '@/compartilhado/formatacao/numero';
import { percentualEmTexto } from '@/compartilhado/formatacao/percentual';
import {
  useProprietarios,
  type ProprietarioResponse,
} from '@/compartilhado/proprietarios/useProprietarios';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { PontoDeCor } from '@/design-system/primitivos/SeletorDeCor';
import { Texto, type TomDeTexto } from '@/design-system/primitivos/Texto';

import { comVinculo, type VinculoDoCadastro } from './rascunhoDaNovaAeronave';
import { dividirIgualmente } from './rotulos';
import {
  campoDaParticipacao,
  rotuloDaParticipacao,
  situacaoDaSoma,
  somarParticipacoes,
  type CampoDaNovaAeronave,
} from './validacaoDaNovaAeronave';
import estilos from './VinculosDoCadastro.module.css';

type MudancaDosVinculos = (atuais: VinculoDoCadastro[]) => VinculoDoCadastro[];

interface VinculosDoCadastroProps {
  vinculos: VinculoDoCadastro[];
  alterar: (mudar: MudancaDosVinculos) => void;
  erroDe: (campo: CampoDaNovaAeronave) => string | undefined;
}

/**
 * Quem entra no contrato e com quanto. Opcional no cadastro — o contrato pode ser definido depois,
 * no detalhe —, mas, com vínculo, cada percentual e a soma seguem as regras do contrato.
 */
export function VinculosDoCadastro({ vinculos, alterar, erroDe }: VinculosDoCadastroProps) {
  const [recemVinculado, setRecemVinculado] = useState<number>();
  // Quem acabou de vincular vai direto para o percentual da linha nova.
  const focarAoMontar = useCallback((campo: HTMLInputElement | null) => campo?.focus(), []);

  function vincular(dono: ProprietarioResponse) {
    alterar((atuais) => comVinculo(atuais, dono));
    setRecemVinculado(dono.id);
  }

  function mudarPercentual(proprietarioId: number, percentual: string) {
    alterar((atuais) =>
      atuais.map((cada) =>
        cada.proprietarioId === proprietarioId ? { ...cada, percentual } : cada,
      ),
    );
  }

  function dividir() {
    alterar((atuais) => {
      const fatias = dividirIgualmente(atuais.length);
      return atuais.map((cada, indice) => ({
        ...cada,
        percentual: numeroParaCampo(fatias[indice]),
      }));
    });
  }

  return (
    <>
      {vinculos.length > 0 ? (
        <ul className={estilos.vinculos}>
          {vinculos.map((vinculo, indice) => (
            <li key={vinculo.proprietarioId} className={estilos.vinculo}>
              <span className={estilos.dono}>
                <PontoDeCor cor={vinculo.cor} />
                <span className={estilos.trunca}>{vinculo.nome}</span>
              </span>
              <span className={estilos.campoDePercentual}>
                <CampoDeTexto
                  ref={vinculo.proprietarioId === recemVinculado ? focarAoMontar : undefined}
                  rotulo={rotuloDaParticipacao(vinculo.nome)}
                  rotuloOculto
                  obrigatorio
                  valor={vinculo.percentual}
                  aoMudar={(valor) => mudarPercentual(vinculo.proprietarioId, valor)}
                  erro={erroDe(campoDaParticipacao(indice))}
                  inputMode="decimal"
                  alinhamento="direita"
                  exemplo="0,00"
                />
              </span>
              <Botao
                variante="fantasma"
                tamanho="pequeno"
                tom="critico"
                rotuloAcessivel={`Remover ${vinculo.nome}`}
                aoClicar={() =>
                  alterar((atuais) =>
                    atuais.filter((cada) => cada.proprietarioId !== vinculo.proprietarioId),
                  )
                }
              >
                Remover
              </Botao>
            </li>
          ))}
        </ul>
      ) : null}

      <div className={estilos.adicionar}>
        <AdicionarVinculo vinculados={vinculos} aoVincular={vincular} />
        {vinculos.length > 0 ? (
          <LinhaDaSoma vinculos={vinculos} erro={erroDe('participacoes')} aoDividir={dividir} />
        ) : null}
      </div>
    </>
  );
}

/**
 * A escolha só vale no "Vincular": no select nativo, as setas disparam `change` em alguns
 * navegadores, e percorrer a lista pelo teclado vincularia um proprietário a cada seta.
 */
function AdicionarVinculo({
  vinculados,
  aoVincular,
}: {
  vinculados: VinculoDoCadastro[];
  aoVincular: (dono: ProprietarioResponse) => void;
}) {
  const proprietarios = useProprietarios();
  const [escolhido, setEscolhido] = useState('');
  const [semEscolha, setSemEscolha] = useState(false);

  if (proprietarios.isPending) {
    return (
      <Texto variante="apoio" tom="suave" como="p">
        Carregando proprietários…
      </Texto>
    );
  }
  if (proprietarios.isError) {
    return (
      <div className={estilos.linha}>
        <Texto variante="apoio" tom="critico" como="p">
          Não foi possível carregar os proprietários.
        </Texto>
        <Botao variante="fantasma" tamanho="pequeno" aoClicar={() => void proprietarios.refetch()}>
          Tentar de novo
        </Botao>
      </div>
    );
  }

  const disponiveis = proprietarios.data.filter(
    (dono) => dono.situacao === 'ATIVO' && !vinculados.some((v) => v.proprietarioId === dono.id),
  );
  if (disponiveis.length === 0) {
    return (
      <Texto variante="apoio" tom="suave" como="p">
        {vinculados.length === 0
          ? 'Nenhum proprietário ativo para vincular — cadastre o primeiro por aqui.'
          : 'Todos os proprietários ativos já estão vinculados.'}
      </Texto>
    );
  }

  const dono = disponiveis.find((cada) => String(cada.id) === escolhido);

  function vincularEscolhido() {
    setSemEscolha(dono === undefined);
    if (dono) {
      aoVincular(dono);
      setEscolhido('');
    }
  }

  return (
    <div className={estilos.linha}>
      <Selecao
        rotulo="Adicionar vínculo"
        rotuloOculto
        valor={dono ? escolhido : ''}
        opcoes={[
          { valor: '', rotulo: 'Escolha um proprietário…' },
          ...disponiveis.map((cada) => ({ valor: String(cada.id), rotulo: cada.nome ?? '' })),
        ]}
        aoMudar={(valor) => {
          setEscolhido(valor);
          setSemEscolha(false);
        }}
        erro={semEscolha ? 'Escolha quem vincular.' : undefined}
      />
      <Botao variante="secundario" tamanho="pequeno" aoClicar={vincularEscolhido}>
        Vincular
      </Botao>
    </div>
  );
}

function tomDaSoma(fechada: boolean, erro: string | undefined): TomDeTexto {
  if (erro) {
    return 'critico';
  }
  return fechada ? 'positivo' : 'atencao';
}

/** A soma acompanha a digitação em voz alta: o leitor de tela ouve quanto falta, sem procurar. */
function LinhaDaSoma({
  vinculos,
  erro,
  aoDividir,
}: {
  vinculos: VinculoDoCadastro[];
  erro: string | undefined;
  aoDividir: () => void;
}) {
  const soma = somarParticipacoes(vinculos);
  const { fechada, texto } = situacaoDaSoma(soma);

  return (
    <>
      <div className={estilos.somaLinha}>
        <div aria-live="polite">
          <Texto variante="corpo" tom={tomDaSoma(fechada, erro)} como="p">
            {`Soma das participações: ${percentualEmTexto(soma)} — ${texto}`}
          </Texto>
        </div>
        <Botao variante="fantasma" tamanho="pequeno" aoClicar={aoDividir}>
          Dividir igualmente
        </Botao>
      </div>
      {erro ? (
        <Texto variante="apoio" tom="critico" como="p">
          {erro}
        </Texto>
      ) : null}
    </>
  );
}

import { useState } from 'react';

import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { useValidacao } from '@/compartilhado/formulario/useValidacao';
import { contexto } from '@/compartilhado/observabilidade/observabilidade';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { Texto } from '@/design-system/primitivos/Texto';

import {
  useAtualizarFichaTecnica,
  useCorrigirContadores,
  type DetalheDaAeronaveResponse,
} from '../api/useDetalheDaAeronave';

import estilos from './PainelDeFichaTecnica.module.css';
import {
  contadoresForamAlterados,
  contadoresParaEnvio,
  fichaParaEnvio,
  rascunhoDaFicha,
  rascunhoDosContadores,
  ROTULOS_DA_FICHA,
  ROTULOS_DOS_CONTADORES,
  type CampoDaFicha,
  type CampoDosContadores,
} from './rascunhoDaFichaTecnica';
import { validarContadores, validarFichaTecnica } from './validacaoDaFichaTecnica';

interface PainelDeFichaTecnicaProps {
  detalhe: DetalheDaAeronaveResponse;
  ehAdministrador: boolean;
  aoFechar: () => void;
}

const ROTULOS = { ...ROTULOS_DA_FICHA, ...ROTULOS_DOS_CONTADORES };

const EXEMPLO_DE_HORAS = '1234,5';

/**
 * Edição da ficha técnica em duas seções, como no protótipo: identificação para quem gere, e os
 * contadores — que reescrevem horas e ciclos na mão — só para administrador. A matrícula aparece
 * mas não se edita: é identidade.
 *
 * <p>São dois PUTs, com permissões diferentes: a ficha primeiro, e os contadores só se alguém mexeu
 * neles. Se o segundo falhar, o painel diz que a identificação já foi salva.
 */
export function PainelDeFichaTecnica({
  detalhe,
  ehAdministrador,
  aoFechar,
}: PainelDeFichaTecnicaProps) {
  // A leitura de quando o painel abriu: o detalhe recarrega depois do primeiro PUT, e comparar com
  // ele esconderia um voo lançado no meio.
  const [leitura] = useState(() => ({
    contadores: rascunhoDosContadores(detalhe),
    totais: detalhe.contadores,
  }));
  const [ficha, setFicha] = useState(() => rascunhoDaFicha(detalhe));
  const [contadores, setContadores] = useState(leitura.contadores);

  const id = detalhe.id ?? 0;
  const atualizarFicha = useAtualizarFichaTecnica(id);
  const corrigirContadores = useCorrigirContadores(id);
  const salvando = atualizarFicha.isPending || corrigirContadores.isPending;

  const validacao = useValidacao<CampoDaFicha | CampoDosContadores>({
    erros: {
      ...validarFichaTecnica(ficha),
      ...(ehAdministrador ? validarContadores(contadores) : {}),
    },
    valores: { ...ficha, ...contadores },
    rotulos: ROTULOS,
    falha: atualizarFicha.error ?? corrigirContadores.error,
  });

  const fichaSalvaSemContadores = atualizarFicha.isSuccess && corrigirContadores.isError;
  const resumo = fichaSalvaSemContadores
    ? ['A identificação foi salva, mas os contadores não foram corrigidos.', validacao.resumo]
        .filter(Boolean)
        .join(' ')
    : validacao.resumo;

  function salvar() {
    return contexto.interacao('salvar-ficha-tecnica', async () => {
      corrigirContadores.reset();
      await atualizarFicha.mutateAsync(fichaParaEnvio(ficha));
      const alterados = ehAdministrador && contadoresForamAlterados(contadores, leitura.contadores);
      contexto.decisao('ficha.contadoresAlterados', alterados);
      if (alterados) {
        await corrigirContadores.mutateAsync(contadoresParaEnvio(contadores, leitura.totais));
      }
      aoFechar();
    });
  }

  function enviar() {
    validacao.enviar(() => {
      // A recusa fica no estado da mutação, e é de lá que o painel a mostra.
      void salvar().catch(() => undefined);
    });
  }

  function campoDaFicha(campo: CampoDaFicha) {
    return {
      rotulo: ROTULOS_DA_FICHA[campo],
      valor: ficha[campo],
      aoMudar: (valor: string) => setFicha((atual) => ({ ...atual, [campo]: valor })),
      erro: validacao.erroDe(campo),
    };
  }

  function campoDosContadores(campo: CampoDosContadores) {
    return {
      rotulo: ROTULOS_DOS_CONTADORES[campo],
      valor: contadores[campo],
      aoMudar: (valor: string) => setContadores((atual) => ({ ...atual, [campo]: valor })),
      erro: validacao.erroDe(campo),
      alinhamento: 'direita' as const,
    };
  }

  return (
    <PainelModal aberto aoFechar={aoFechar} rotulo="Editar ficha técnica" podeFechar={!salvando}>
      <form
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault();
          enviar();
        }}
      >
        <div ref={validacao.refDoFormulario} className={estilos.formulario}>
          <Texto variante="titulo" como="h2">
            Editar ficha técnica
          </Texto>

          <Texto variante="legenda" tom="suave" como="h3">
            Identificação
          </Texto>
          <div className={estilos.duasColunas}>
            <CampoDeTexto
              rotulo="Matrícula"
              valor={detalhe.matricula ?? ''}
              aoMudar={() => {}}
              desabilitado
            />
            <CampoDeTexto {...campoDaFicha('fabricante')} />
            <CampoDeTexto {...campoDaFicha('modelo')} obrigatorio />
            <CampoDeTexto {...campoDaFicha('numeroDeSerie')} />
            <CampoDeTexto
              {...campoDaFicha('base')}
              aoMudar={(valor) => setFicha((atual) => ({ ...atual, base: valor.toUpperCase() }))}
              obrigatorio
              exemplo="SBSP"
            />
            <CampoDeTexto {...campoDaFicha('hangar')} />
            <CampoDeTexto
              {...campoDaFicha('pesoMaxDecolagemKg')}
              inputMode="numeric"
              alinhamento="direita"
              exemplo="5.670"
            />
            <CampoDeTexto
              {...campoDaFicha('pesoMaxPousoKg')}
              inputMode="numeric"
              alinhamento="direita"
              apoio="Até o peso máximo de decolagem."
            />
          </div>

          <Texto variante="legenda" tom="suave" como="h3">
            Seguro
          </Texto>
          <CampoDeTexto
            {...campoDaFicha('apoliceDoSeguro')}
            apoio="A vigência é o vencimento da RETA, editado na tela de documentos."
          />

          {ehAdministrador ? (
            <>
              <Texto variante="legenda" tom="suave" como="h3">
                Horas, ciclos e motores
              </Texto>
              <Texto variante="apoio" tom="suave" como="p">
                A correção substitui os totais que os voos lançados somaram. Se um voo for lançado
                enquanto você edita, ela é recusada para não apagá-lo. Horas em decimal, como
                1234,5. Deixe vazio o motor ou a APU que a aeronave não tem: vazio é “não tem”, zero
                é “tem, com zero horas”.
              </Texto>
              <div className={estilos.duasColunas}>
                <CampoDeTexto
                  {...campoDosContadores('horasDeCelula')}
                  obrigatorio
                  inputMode="decimal"
                  exemplo={EXEMPLO_DE_HORAS}
                />
                <CampoDeTexto {...campoDosContadores('ciclos')} obrigatorio inputMode="numeric" />
                <CampoDeTexto {...campoDosContadores('kmVoados')} obrigatorio inputMode="decimal" />
                <CampoDeTexto
                  {...campoDosContadores('horasMotor1')}
                  inputMode="decimal"
                  exemplo={EXEMPLO_DE_HORAS}
                />
                <CampoDeTexto
                  {...campoDosContadores('horasMotor2')}
                  inputMode="decimal"
                  exemplo={EXEMPLO_DE_HORAS}
                />
                <CampoDeTexto
                  {...campoDosContadores('horasMotor3')}
                  inputMode="decimal"
                  exemplo={EXEMPLO_DE_HORAS}
                />
                <CampoDeTexto
                  {...campoDosContadores('horasApu')}
                  inputMode="decimal"
                  exemplo={EXEMPLO_DE_HORAS}
                />
              </div>
            </>
          ) : (
            <Texto variante="apoio" tom="suave" como="p">
              Horas de voo e ciclos só podem ser alterados por um administrador do sistema.
            </Texto>
          )}

          <ResumoDoFormulario resumo={resumo} />
          <div className={estilos.acoes}>
            <Botao variante="secundario" aoClicar={aoFechar} desabilitado={salvando}>
              Cancelar
            </Botao>
            <Botao tipo="submit" carregando={salvando}>
              Salvar
            </Botao>
          </div>
        </div>
      </form>
    </PainelModal>
  );
}

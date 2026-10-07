import { useId, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { hojeLocal } from '@/compartilhado/formatacao/datas';
import { numeroParaCampo } from '@/compartilhado/formatacao/numero';
import { Formulario } from '@/compartilhado/formulario/Formulario';
import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { useValidacao } from '@/compartilhado/formulario/useValidacao';
import { PainelDeProprietario } from '@/compartilhado/proprietarios/PainelDeProprietario';
import { useSessao } from '@/compartilhado/sessao/sessao';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { GrupoDeOpcoes } from '@/design-system/primitivos/GrupoDeOpcoes';
import { LinkDeTexto } from '@/design-system/primitivos/LinkDeTexto';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { Texto } from '@/design-system/primitivos/Texto';

import { useDefinirContratoAoCadastrar } from '../api/useContratos';
import {
  useCriarAeronave,
  type BaseDoRateio,
  type ModeloDeAporte,
} from '../api/useDetalheDaAeronave';
import { useAvisoAoSair } from '../hooks/useAvisoAoSair';

import { ConversorDeMilhas } from './ConversorDeMilhas';
import estilos from './PaginaDeNovaAeronave.module.css';
import { podeGerirFrota } from './permissoes';
import {
  comVinculo,
  foiAlterado,
  motoresEscolhidos,
  paraCadastro,
  paraContrato,
  RASCUNHO_INICIAL,
  type QuantidadeDeMotores,
  type RascunhoDaNovaAeronave,
  type VinculoDoCadastro,
} from './rascunhoDaNovaAeronave';
import {
  PERIODICIDADES,
  ROTULO_DA_BASE_DO_RATEIO,
  ROTULO_DA_SITUACAO,
  ROTULO_DO_MODELO_DE_APORTE,
} from './rotulos';
import {
  campoDoServidor,
  limitesDosVencimentos,
  rotulosDaNovaAeronave,
  ROTULOS_DA_NOVA_AERONAVE as ROTULOS,
  validarNovaAeronave,
  valoresDaNovaAeronave,
  type CampoDaNovaAeronave,
  type CampoDoCadastro,
} from './validacaoDaNovaAeronave';
import { VinculosDoCadastro } from './VinculosDoCadastro';

const QUANTIDADES_DE_MOTORES = [
  { valor: '1', rotulo: '1 motor' },
  { valor: '2', rotulo: '2 motores' },
  { valor: '3', rotulo: '3 motores' },
];

const DIAS_DE_FECHAMENTO = Array.from({ length: 28 }, (_, indice) => ({
  valor: String(indice + 1),
  rotulo: String(indice + 1),
}));

/** Os campos que o rascunho guarda como texto livre, sem conversão no caminho. */
type CampoTextual = Exclude<CampoDoCadastro, 'baseDoRateio' | 'modeloDeAporte'>;

interface AeronaveCriada {
  id: number;
  matricula: string;
}

type Alterar = <C extends keyof RascunhoDaNovaAeronave>(
  campo: C,
  valor: RascunhoDaNovaAeronave[C],
) => void;

interface PropsDaSecao {
  rascunho: RascunhoDaNovaAeronave;
  alterar: Alterar;
  erroDe: (campo: CampoDaNovaAeronave) => string | undefined;
}

/** Rótulo, valor, edição e erro de um campo de texto — o que todo campo do cadastro repete. */
function propsDoCampo({ rascunho, alterar, erroDe }: PropsDaSecao, campo: CampoTextual) {
  return {
    rotulo: ROTULOS[campo],
    valor: rascunho[campo],
    aoMudar: (valor: string) => alterar(campo, valor),
    erro: erroDe(campo),
  };
}

/** Vencido é aceito, mas quem cadastra precisa saber o que acontece ao salvar. */
function avisoDeVencido(data: string, hoje: string): string | undefined {
  return data !== '' && data < hoje
    ? `Esta data já passou: a aeronave entra na frota como ${ROTULO_DA_SITUACAO.VENCIDO}.`
    : undefined;
}

/**
 * O cadastro de aeronave, nas seções do protótipo. Uma ausência deliberada, registrada em
 * `docs/design-system.md`: o passo de documentos (pertence à tela de documentos). E duas
 * presenças: o vencimento do CVA, sem o qual a frota não sabe julgar a situação regulatória, e os
 * ciclos, sem os quais os limites de manutenção por pousos partiriam do zero.
 */
export function PaginaDeNovaAeronave() {
  const { usuario, carregando } = useSessao();
  if (carregando) {
    return null;
  }
  return podeGerirFrota(usuario?.papel) ? <FormularioDeNovaAeronave /> : <SemPermissao />;
}

/** Quem não cadastra fica sabendo antes de preencher, e não pelo 403 no fim. */
function SemPermissao() {
  return (
    <div className={estilos.tela}>
      <section className={estilos.secao} aria-label="Nova aeronave">
        <Texto variante="corpo" como="p">
          Seu perfil não cadastra aeronaves: o cadastro é do administrador e do gestor da frota.
        </Texto>
        <LinkDeTexto para="/aeronaves">Voltar para a frota</LinkDeTexto>
      </section>
    </div>
  );
}

function FormularioDeNovaAeronave() {
  const navegar = useNavigate();
  const criar = useCriarAeronave();
  const definirContrato = useDefinirContratoAoCadastrar();
  const idDoResumo = useId();
  const [rascunho, setRascunho] = useState(RASCUNHO_INICIAL);
  // Criada a aeronave, só o contrato pode faltar: um novo envio não pode recadastrá-la.
  const [aeronaveCriada, setAeronaveCriada] = useState<AeronaveCriada>();
  const [painel, setPainel] = useState<'conversor' | 'proprietario' | 'descarte'>();

  const hoje = hojeLocal();
  const rotulos = rotulosDaNovaAeronave(rascunho);
  const validacao = useValidacao({
    erros: validarNovaAeronave(rascunho, hoje),
    valores: valoresDaNovaAeronave(rascunho),
    rotulos,
    falha: criar.error ?? definirContrato.error,
    campoDoServidor: campoDoServidor(rotulos),
  });
  const salvando = criar.isPending || definirContrato.isPending;
  const alterado = foiAlterado(rascunho);
  useAvisoAoSair(alterado);

  const alterar: Alterar = (campo, valor) => setRascunho((atual) => ({ ...atual, [campo]: valor }));
  const alterarVinculos = (mudar: (atuais: VinculoDoCadastro[]) => VinculoDoCadastro[]) =>
    setRascunho((atual) => ({ ...atual, vinculos: mudar(atual.vinculos) }));
  const secao: PropsDaSecao = { rascunho, alterar, erroDe: validacao.erroDe };

  function concluir(aeronave: AeronaveCriada) {
    if (rascunho.vinculos.length === 0) {
      void navegar(`/aeronaves/${aeronave.id}`);
      return;
    }
    setAeronaveCriada(aeronave);
    definirContrato.mutate(
      { aeronaveId: aeronave.id, request: paraContrato(rascunho) },
      { onSuccess: () => void navegar(`/aeronaves/${aeronave.id}`) },
    );
  }

  function salvar() {
    if (aeronaveCriada !== undefined) {
      concluir(aeronaveCriada);
      return;
    }
    criar.mutate(paraCadastro(rascunho), {
      onSuccess: (criada) => concluir({ id: criada.id ?? 0, matricula: criada.matricula ?? '' }),
    });
  }

  function cancelar() {
    if (aeronaveCriada !== undefined) {
      void navegar(`/aeronaves/${aeronaveCriada.id}`);
      return;
    }
    if (alterado) {
      setPainel('descarte');
      return;
    }
    void navegar('/aeronaves');
  }

  const fecharPainel = () => setPainel(undefined);

  return (
    <div className={estilos.tela}>
      {/* Os painéis ficam fora do Formulario: são formulários próprios, e form não se aninha. */}
      <Formulario
        referencia={validacao.refDoFormulario}
        aoEnviar={() => validacao.enviar(salvar)}
        rotulo="Nova aeronave"
      >
        <Texto variante="apoio" tom="suave" como="p">
          Os campos marcados com * são obrigatórios.
        </Texto>

        {/* Depois de criada, a aeronave é a do servidor: só as participações seguem editáveis. */}
        <fieldset className={estilos.conjunto} disabled={aeronaveCriada !== undefined}>
          <SecaoDeIdentificacao {...secao} hoje={hoje} />
          <SecaoDeParametros {...secao} aoAbrirConversor={() => setPainel('conversor')} />
          <SecaoDeRateio {...secao} />
        </fieldset>

        <section className={estilos.secao} aria-label="Proprietários">
          <Cabecalho
            numero="4"
            titulo="Proprietários"
            descricao="Cada proprietário entra com um percentual de participação. Opcional — dá para definir depois, no detalhe."
            acao={
              <Botao
                variante="secundario"
                tamanho="pequeno"
                aoClicar={() => setPainel('proprietario')}
              >
                + Cadastrar proprietário
              </Botao>
            }
          />
          <VinculosDoCadastro
            vinculos={rascunho.vinculos}
            alterar={alterarVinculos}
            erroDe={validacao.erroDe}
          />
        </section>

        {aeronaveCriada !== undefined ? (
          <div role="status">
            <Texto variante="apoio" tom="atencao" como="p">
              A aeronave {aeronaveCriada.matricula} já está cadastrada; faltam as participações.
              Corrija-as e salve de novo, ou siga para a aeronave e defina o contrato lá.
            </Texto>
          </div>
        ) : null}

        <div className={estilos.acoes}>
          <div className={estilos.resumo}>
            <ResumoDoFormulario resumo={validacao.resumo} id={idDoResumo} />
          </div>
          <Botao variante="secundario" desabilitado={salvando} aoClicar={cancelar}>
            {aeronaveCriada === undefined ? 'Cancelar' : 'Ir para a aeronave'}
          </Botao>
          <Botao tipo="submit" carregando={salvando} descritoPor={idDoResumo}>
            {aeronaveCriada === undefined ? 'Cadastrar aeronave' : 'Salvar participações'}
          </Botao>
        </div>
      </Formulario>

      {painel === 'conversor' ? (
        <ConversorDeMilhas
          aoUsar={(km) => alterar('kmVoados', numeroParaCampo(km))}
          aoFechar={fecharPainel}
        />
      ) : null}

      {/* O cadastro rápido é o mesmo painel da tela de Proprietários; o recém-criado já entra
          vinculado, com o percentual por preencher. */}
      {painel === 'proprietario' ? (
        <PainelDeProprietario
          aoSalvar={(dono) => alterarVinculos((atuais) => comVinculo(atuais, dono))}
          aoFechar={fecharPainel}
        />
      ) : null}

      {painel === 'descarte' ? (
        <ConfirmacaoDeDescarte
          aoDescartar={() => void navegar('/aeronaves')}
          aoFechar={fecharPainel}
        />
      ) : null}
    </div>
  );
}

function SecaoDeIdentificacao(props: PropsDaSecao & { hoje: string }) {
  const { rascunho, hoje } = props;
  const limites = limitesDosVencimentos(hoje);
  return (
    <section className={estilos.secao} aria-label="Identificação">
      <Cabecalho numero="1" titulo="Identificação" descricao="Dados de registro da aeronave." />
      <div className={estilos.grade}>
        <CampoDeTexto
          {...propsDoCampo(props, 'matricula')}
          obrigatorio
          exemplo="PS-MEP"
          apoio="Formato do RAB: PS-MEP."
        />
        <CampoDeTexto {...propsDoCampo(props, 'fabricante')} />
        <CampoDeTexto {...propsDoCampo(props, 'modelo')} obrigatorio />
        <CampoDeTexto {...propsDoCampo(props, 'numeroDeSerie')} />
        <CampoDeTexto
          {...propsDoCampo(props, 'base')}
          obrigatorio
          exemplo="SBSP"
          apoio="Código ICAO de quatro letras."
        />
        <CampoDeTexto {...propsDoCampo(props, 'hangar')} />
        <CampoDeTexto {...propsDoCampo(props, 'apoliceDoSeguro')} />
        <CampoDeTexto
          {...propsDoCampo(props, 'vencimentoReta')}
          obrigatorio
          tipo="data"
          minimo={limites.minimo}
          maximo={limites.maximoDoSeguro}
          apoio={avisoDeVencido(rascunho.vencimentoReta, hoje)}
        />
        <CampoDeTexto
          {...propsDoCampo(props, 'vencimentoCva')}
          obrigatorio
          tipo="data"
          minimo={limites.minimo}
          maximo={limites.maximoDoCva}
          apoio={
            avisoDeVencido(rascunho.vencimentoCva, hoje) ??
            'Vale 12 meses. É ele que decide a situação regulatória na frota.'
          }
        />
        <CampoDeTexto {...propsDoCampo(props, 'pesoMaxDecolagemKg')} inputMode="numeric" />
        <CampoDeTexto {...propsDoCampo(props, 'pesoMaxPousoKg')} inputMode="numeric" />
      </div>
    </section>
  );
}

function SecaoDeParametros(props: PropsDaSecao & { aoAbrirConversor: () => void }) {
  const { rascunho, alterar, aoAbrirConversor } = props;
  return (
    <section className={estilos.secao} aria-label="Parâmetros atuais">
      <Cabecalho
        numero="2"
        titulo="Parâmetros atuais"
        descricao="Valores acumulados na data do cadastro — base para o controle de manutenção."
      />
      <div className={estilos.grade}>
        <CampoDeTexto
          {...propsDoCampo(props, 'horasDeCelula')}
          obrigatorio
          inputMode="decimal"
          exemplo="1234,5"
          apoio="Em horas decimais, com uma casa."
        />
        <CampoDeTexto
          {...propsDoCampo(props, 'ciclos')}
          obrigatorio
          inputMode="numeric"
          apoio="Total de pousos: é dele que partem os limites por ciclos."
        />
        <div>
          <CampoDeTexto {...propsDoCampo(props, 'kmVoados')} obrigatorio inputMode="decimal" />
          <Botao variante="fantasma" tamanho="pequeno" aoClicar={aoAbrirConversor}>
            Conversor de milhas náuticas
          </Botao>
        </div>
        <CampoDeTexto
          {...propsDoCampo(props, 'horasApu')}
          inputMode="decimal"
          apoio="Deixe vazio se a aeronave não tem APU."
        />
      </div>
      <div className={estilos.motores}>
        <GrupoDeOpcoes
          rotulo="Motores"
          obrigatorio
          valor={rascunho.quantidadeDeMotores}
          opcoes={QUANTIDADES_DE_MOTORES}
          aoEscolher={(valor) => alterar('quantidadeDeMotores', valor as QuantidadeDeMotores)}
          apoio="Informe as horas de cada motor — 0 se for novo."
          marcador
        />
        <div className={estilos.grade}>
          {motoresEscolhidos(rascunho).map((campo) => (
            <CampoDeTexto
              key={campo}
              {...propsDoCampo(props, campo)}
              obrigatorio
              inputMode="decimal"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function SecaoDeRateio(props: PropsDaSecao) {
  const { rascunho, alterar, erroDe } = props;
  const aporteFixo = rascunho.modeloDeAporte === 'FIXO';
  return (
    <section className={estilos.secao} aria-label="Rateio e fundo">
      <Cabecalho
        numero="3"
        titulo="Rateio e fundo"
        descricao="Como os custos são divididos e quanto o fundo tem hoje."
      />
      <div className={estilos.grade}>
        <Selecao
          rotulo={ROTULOS.baseDoRateio}
          obrigatorio
          valor={rascunho.baseDoRateio}
          opcoes={(Object.keys(ROTULO_DA_BASE_DO_RATEIO) as BaseDoRateio[]).map((valor) => ({
            valor,
            rotulo: ROTULO_DA_BASE_DO_RATEIO[valor],
          }))}
          aoMudar={(valor) => alterar('baseDoRateio', valor as BaseDoRateio)}
          erro={erroDe('baseDoRateio')}
        />
        <Selecao
          rotulo={ROTULOS.modeloDeAporte}
          obrigatorio
          valor={rascunho.modeloDeAporte}
          opcoes={(Object.keys(ROTULO_DO_MODELO_DE_APORTE) as ModeloDeAporte[]).map((valor) => ({
            valor,
            rotulo: ROTULO_DO_MODELO_DE_APORTE[valor],
          }))}
          aoMudar={(valor) => alterar('modeloDeAporte', valor as ModeloDeAporte)}
          erro={erroDe('modeloDeAporte')}
          apoio={
            aporteFixo
              ? undefined
              : 'Cada aporte segue o uso apurado no período: não há valor combinado.'
          }
        />
        <Selecao
          rotulo={ROTULOS.periodicidadeDoAporteMeses}
          obrigatorio
          valor={rascunho.periodicidadeDoAporteMeses}
          opcoes={PERIODICIDADES.map((opcao) => ({
            valor: String(opcao.valor),
            rotulo: opcao.rotulo,
          }))}
          aoMudar={(valor) => alterar('periodicidadeDoAporteMeses', valor)}
          erro={erroDe('periodicidadeDoAporteMeses')}
        />
        {aporteFixo ? (
          <CampoDeTexto
            {...propsDoCampo(props, 'valorDoAporte')}
            obrigatorio
            inputMode="decimal"
            alinhamento="direita"
            exemplo="0,00"
            apoio="Cobrado a cada período da periodicidade acima."
          />
        ) : null}
        <Selecao
          rotulo={ROTULOS.diaDeFechamento}
          obrigatorio
          valor={rascunho.diaDeFechamento}
          opcoes={DIAS_DE_FECHAMENTO}
          aoMudar={(valor) => alterar('diaDeFechamento', valor)}
          erro={erroDe('diaDeFechamento')}
          apoio="Define o período de apuração dos custos. Vai até 28 para existir em todo mês."
        />
        {/* Texto, e não `decimal`: o teclado decimal do iPhone não tem o sinal de menos. */}
        <CampoDeTexto
          {...propsDoCampo(props, 'saldoDeAbertura')}
          obrigatorio
          inputMode="text"
          alinhamento="direita"
          exemplo="0,00"
          apoio="Distribuído entre os proprietários pela participação. Negativo quando eles devem: -12.500,00."
        />
      </div>
    </section>
  );
}

function ConfirmacaoDeDescarte({
  aoDescartar,
  aoFechar,
}: {
  aoDescartar: () => void;
  aoFechar: () => void;
}) {
  return (
    <PainelModal aberto aoFechar={aoFechar} rotulo="Descartar o cadastro?">
      <Texto variante="titulo" como="h2">
        Descartar o cadastro?
      </Texto>
      <Texto variante="apoio" tom="suave" como="p">
        O que foi preenchido nesta tela não será salvo.
      </Texto>
      <div className={estilos.acoesDoPainel}>
        <Botao variante="secundario" tom="critico" aoClicar={aoDescartar}>
          Descartar
        </Botao>
        <Botao aoClicar={aoFechar}>Continuar cadastrando</Botao>
      </div>
    </PainelModal>
  );
}

function Cabecalho({
  numero,
  titulo,
  descricao,
  acao,
}: {
  numero: string;
  titulo: string;
  descricao: string;
  acao?: ReactNode;
}) {
  return (
    <div className={estilos.cabecalhoDaSecao}>
      <span className={estilos.numero} aria-hidden="true">
        {numero}
      </span>
      <div className={estilos.textoDaSecao}>
        <h2 className={estilos.tituloDaSecao}>{titulo}</h2>
        <Texto variante="apoio" tom="suave" como="p">
          {descricao}
        </Texto>
      </div>
      {acao ? <div className={estilos.acaoDaSecao}>{acao}</div> : null}
    </div>
  );
}

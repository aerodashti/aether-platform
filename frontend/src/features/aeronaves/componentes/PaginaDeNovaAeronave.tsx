import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { ErroDeApi } from '@/api/cliente';
import { PainelDeProprietario } from '@/compartilhado/proprietarios/PainelDeProprietario';
import {
  useProprietarios,
  type ProprietarioResponse,
} from '@/compartilhado/proprietarios/useProprietarios';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { GrupoDeOpcoes } from '@/design-system/primitivos/GrupoDeOpcoes';
import { LinkDeTexto } from '@/design-system/primitivos/LinkDeTexto';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { PontoDeCor, type CorDeIdentificacao } from '@/design-system/primitivos/SeletorDeCor';
import { Texto } from '@/design-system/primitivos/Texto';

import { useDefinirContratoAoCadastrar } from '../api/useContratos';
import {
  useCriarAeronave,
  type BaseDoRateio,
  type ModeloDeAporte,
} from '../api/useDetalheDaAeronave';

import { ConversorDeMilhas } from './ConversorDeMilhas';
import estilos from './PaginaDeNovaAeronave.module.css';
import {
  dividirIgualmente,
  lerPercentual,
  percentualEmTexto,
  PERIODICIDADES,
  ROTULO_DA_BASE_DO_RATEIO,
  ROTULO_DO_MODELO_DE_APORTE,
} from './rotulos';

interface Vinculo {
  proprietarioId: number;
  nome: string;
  cor: CorDeIdentificacao;
  percentual: string;
}

/** Número digitado, aceitando vírgula. Vazio é ausência, não zero. */
function numeroOuNulo(valor: string): number | undefined {
  const limpo = valor.trim().replace(',', '.');
  return limpo === '' ? undefined : Number(limpo);
}

/**
 * O cadastro de aeronave, nas seções do protótipo. Duas ausências deliberadas, registradas em
 * `docs/design-system.md`: o saldo do fundo (pertence a aportes) e o passo de documentos
 * (pertence à tela de documentos). E uma presença: o vencimento do CVA, sem o qual a frota não
 * sabe julgar a situação regulatória.
 */
export function PaginaDeNovaAeronave() {
  const navegar = useNavigate();
  const criar = useCriarAeronave();
  const definirContrato = useDefinirContratoAoCadastrar();
  const proprietarios = useProprietarios();

  // 1 — Identificação
  const [matricula, setMatricula] = useState('');
  const [fabricante, setFabricante] = useState('');
  const [modelo, setModelo] = useState('');
  const [numeroDeSerie, setNumeroDeSerie] = useState('');
  const [base, setBase] = useState('');
  const [hangar, setHangar] = useState('');
  const [apolice, setApolice] = useState('');
  const [vencimentoCva, setVencimentoCva] = useState('');
  const [vencimentoReta, setVencimentoReta] = useState('');
  const [pesoDecolagem, setPesoDecolagem] = useState('');
  const [pesoPouso, setPesoPouso] = useState('');

  // 2 — Parâmetros atuais
  const [horasDeCelula, setHorasDeCelula] = useState('');
  const [kmVoados, setKmVoados] = useState('');
  const [horasApu, setHorasApu] = useState('');
  const [motores, setMotores] = useState('2');
  const [horasMotores, setHorasMotores] = useState(['', '', '']);
  const [conversorAberto, setConversorAberto] = useState(false);

  // 3 — Rateio e fundo
  const [baseDoRateio, setBaseDoRateio] = useState<BaseDoRateio>('POR_USO');
  const [modeloDeAporte, setModeloDeAporte] = useState<ModeloDeAporte>('FIXO');
  const [periodicidade, setPeriodicidade] = useState('1');
  const [valorDoAporte, setValorDoAporte] = useState('');
  const [diaDeFechamento, setDiaDeFechamento] = useState('1');

  // 4 — Proprietários (opcional no cadastro)
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [cadastrandoProprietario, setCadastrandoProprietario] = useState(false);

  function vincular(dono: ProprietarioResponse) {
    setVinculos((atuais) => [
      ...atuais,
      {
        proprietarioId: dono.id ?? 0,
        nome: dono.nome ?? '',
        cor: (dono.corDeIdentificacao ?? 'CINZA') as CorDeIdentificacao,
        percentual: '',
      },
    ]);
  }

  const quantidadeDeMotores = Number(motores);
  const somaDosVinculos = vinculos.reduce((total, vinculo) => {
    const valor = lerPercentual(vinculo.percentual);
    return Number.isNaN(valor) ? total : total + valor;
  }, 0);
  const contratoFecha = vinculos.length === 0 || Math.abs(somaDosVinculos - 100) < 0.005;

  const disponiveis = (proprietarios.data ?? []).filter(
    (dono) => dono.situacao === 'ATIVO' && !vinculos.some((v) => v.proprietarioId === dono.id),
  );

  const obrigatoriosOk =
    matricula.trim().length > 0 &&
    modelo.trim().length > 0 &&
    base.trim().length === 4 &&
    vencimentoCva !== '' &&
    vencimentoReta !== '' &&
    horasDeCelula.trim() !== '' &&
    kmVoados.trim() !== '';

  function cadastrar() {
    criar.mutate(
      {
        matricula,
        fabricante,
        modelo,
        numeroDeSerie,
        base,
        hangar,
        apoliceDoSeguro: apolice,
        pesoMaxDecolagemKg: numeroOuNulo(pesoDecolagem),
        pesoMaxPousoKg: numeroOuNulo(pesoPouso),
        vencimentoCva,
        vencimentoReta,
        contadores: {
          horasDeCelula: numeroOuNulo(horasDeCelula) ?? 0,
          ciclos: 0,
          kmVoados: numeroOuNulo(kmVoados) ?? 0,
          horasMotor1: quantidadeDeMotores >= 1 ? numeroOuNulo(horasMotores[0] ?? '') : undefined,
          horasMotor2: quantidadeDeMotores >= 2 ? numeroOuNulo(horasMotores[1] ?? '') : undefined,
          horasMotor3: quantidadeDeMotores >= 3 ? numeroOuNulo(horasMotores[2] ?? '') : undefined,
          horasApu: numeroOuNulo(horasApu),
        },
        configuracaoFinanceira: {
          baseDoRateio,
          modeloDeAporte,
          periodicidadeDoAporteMeses: Number(periodicidade),
          valorDoAporte: numeroOuNulo(valorDoAporte),
          diaDeFechamento: Number(diaDeFechamento),
        },
      },
      {
        onSuccess: (criada) => {
          const aeronaveId = criada.id ?? 0;
          if (vinculos.length === 0) {
            void navegar(`/aeronaves/${aeronaveId}`);
            return;
          }
          // O contrato é um segundo ato na rota dele. Se falhar, a aeronave já existe — estado
          // válido — e o detalhe abre com o contrato por definir.
          definirContrato.mutate(
            {
              aeronaveId,
              request: {
                participacoes: vinculos.map((vinculo) => ({
                  proprietarioId: vinculo.proprietarioId,
                  percentual: lerPercentual(vinculo.percentual),
                })),
              },
            },
            {
              onSuccess: () => void navegar(`/aeronaves/${aeronaveId}`),
              onError: () => void navegar(`/aeronaves/${aeronaveId}`),
            },
          );
        },
      },
    );
  }

  const erro = criar.error instanceof ErroDeApi ? criar.error.message : undefined;

  return (
    <div className={estilos.tela}>
      <nav aria-label="Trilha">
        <LinkDeTexto para="/aeronaves">← Aeronaves</LinkDeTexto>
      </nav>

      <section className={estilos.secao} aria-label="Identificação">
        <Cabecalho numero="1" titulo="Identificação" descricao="Dados de registro da aeronave." />
        <div className={estilos.grade}>
          <CampoDeTexto
            rotulo="Matrícula"
            valor={matricula}
            aoMudar={setMatricula}
            exemplo="PS-AER"
            maxLength={7}
            erro={erro}
          />
          <CampoDeTexto
            rotulo="Fabricante"
            valor={fabricante}
            aoMudar={setFabricante}
            maxLength={80}
          />
          <CampoDeTexto rotulo="Modelo" valor={modelo} aoMudar={setModelo} maxLength={120} />
          <CampoDeTexto
            rotulo="Nº de série"
            valor={numeroDeSerie}
            aoMudar={setNumeroDeSerie}
            maxLength={40}
          />
          <CampoDeTexto
            rotulo="Base (ICAO)"
            valor={base}
            aoMudar={setBase}
            exemplo="SBSP"
            maxLength={4}
          />
          <CampoDeTexto rotulo="Hangar" valor={hangar} aoMudar={setHangar} maxLength={60} />
          <CampoDeTexto
            rotulo="Apólice do seguro"
            valor={apolice}
            aoMudar={setApolice}
            maxLength={40}
          />
          <CampoDeTexto
            rotulo="Vigência do seguro (vencimento)"
            tipo="data"
            valor={vencimentoReta}
            aoMudar={setVencimentoReta}
          />
          <CampoDeTexto
            rotulo="Vencimento do CVA"
            tipo="data"
            valor={vencimentoCva}
            aoMudar={setVencimentoCva}
            apoio="É ele que decide a situação regulatória na frota."
          />
          <CampoDeTexto
            rotulo="Peso máx. de decolagem (kg)"
            valor={pesoDecolagem}
            aoMudar={setPesoDecolagem}
            inputMode="numeric"
          />
          <CampoDeTexto
            rotulo="Peso máx. de pouso (kg)"
            valor={pesoPouso}
            aoMudar={setPesoPouso}
            inputMode="numeric"
          />
        </div>
      </section>

      <section className={estilos.secao} aria-label="Parâmetros atuais">
        <Cabecalho
          numero="2"
          titulo="Parâmetros atuais"
          descricao="Valores acumulados na data do cadastro — base para o controle de manutenção."
        />
        <div className={estilos.grade}>
          <CampoDeTexto
            rotulo="Horas de voo (célula)"
            valor={horasDeCelula}
            aoMudar={setHorasDeCelula}
            inputMode="numeric"
          />
          <div>
            <CampoDeTexto
              rotulo="Kilômetros voados"
              valor={kmVoados}
              aoMudar={setKmVoados}
              inputMode="numeric"
            />
            <Botao variante="fantasma" tamanho="pequeno" aoClicar={() => setConversorAberto(true)}>
              Conversor de milhas náuticas
            </Botao>
          </div>
          <CampoDeTexto
            rotulo="Horas de APU"
            valor={horasApu}
            aoMudar={setHorasApu}
            inputMode="numeric"
          />
        </div>
        <div className={estilos.motores}>
          <GrupoDeOpcoes
            rotulo="Motores"
            valor={motores}
            opcoes={[
              { valor: '1', rotulo: '1 motor' },
              { valor: '2', rotulo: '2 motores' },
              { valor: '3', rotulo: '3 motores' },
            ]}
            aoEscolher={setMotores}
            marcador
          />
          <div className={estilos.grade}>
            {Array.from({ length: quantidadeDeMotores }, (_, indice) => (
              <CampoDeTexto
                key={indice}
                rotulo={`Motor ${indice + 1} (h)`}
                valor={horasMotores[indice] ?? ''}
                inputMode="numeric"
                aoMudar={(valor) =>
                  setHorasMotores((atuais) =>
                    atuais.map((cada, i) => (i === indice ? valor : cada)),
                  )
                }
              />
            ))}
          </div>
        </div>
      </section>

      <section className={estilos.secao} aria-label="Rateio e fundo">
        <Cabecalho
          numero="3"
          titulo="Rateio e fundo"
          descricao="Como os custos são divididos entre os proprietários."
        />
        <div className={estilos.grade}>
          <Selecao
            rotulo="Base do rateio"
            valor={baseDoRateio}
            opcoes={(Object.keys(ROTULO_DA_BASE_DO_RATEIO) as BaseDoRateio[]).map((valor) => ({
              valor,
              rotulo: ROTULO_DA_BASE_DO_RATEIO[valor],
            }))}
            aoMudar={(valor) => setBaseDoRateio(valor as BaseDoRateio)}
          />
          <Selecao
            rotulo="Modelo de aporte"
            valor={modeloDeAporte}
            opcoes={(Object.keys(ROTULO_DO_MODELO_DE_APORTE) as ModeloDeAporte[]).map((valor) => ({
              valor,
              rotulo: ROTULO_DO_MODELO_DE_APORTE[valor],
            }))}
            aoMudar={(valor) => setModeloDeAporte(valor as ModeloDeAporte)}
          />
          <Selecao
            rotulo="Aporte a cada quantos meses"
            valor={periodicidade}
            opcoes={PERIODICIDADES.map((opcao) => ({
              valor: String(opcao.valor),
              rotulo: opcao.rotulo,
            }))}
            aoMudar={setPeriodicidade}
          />
          <CampoDeTexto
            rotulo="Valor do aporte (R$)"
            valor={valorDoAporte}
            aoMudar={setValorDoAporte}
            inputMode="numeric"
          />
          <CampoDeTexto
            rotulo="Dia de fechamento da fatura"
            valor={diaDeFechamento}
            aoMudar={setDiaDeFechamento}
            inputMode="numeric"
            apoio="Define o período de apuração dos custos. De 1 a 28."
          />
        </div>
        <Texto variante="apoio" tom="suave" como="p">
          O saldo atual do fundo e a distribuição entre proprietários entram com a tela de aportes.
        </Texto>
      </section>

      <section className={estilos.secao} aria-label="Proprietários">
        <Cabecalho
          numero="4"
          titulo="Proprietários"
          descricao="Cada proprietário entra com um percentual de participação. Opcional — dá para definir depois, no detalhe."
          acao={
            <Botao
              variante="secundario"
              tamanho="pequeno"
              aoClicar={() => setCadastrandoProprietario(true)}
            >
              + Cadastrar proprietário
            </Botao>
          }
        />
        {vinculos.length > 0 ? (
          <ul className={estilos.vinculos}>
            {vinculos.map((vinculo) => (
              <li key={vinculo.proprietarioId} className={estilos.vinculo}>
                <span className={estilos.dono}>
                  <PontoDeCor cor={vinculo.cor} />
                  <span className={estilos.trunca}>{vinculo.nome}</span>
                </span>
                <span className={estilos.campoDePercentual}>
                  <CampoDeTexto
                    rotulo={`Participação de ${vinculo.nome} em %`}
                    rotuloOculto
                    valor={vinculo.percentual}
                    inputMode="numeric"
                    aoMudar={(valor) =>
                      setVinculos((atuais) =>
                        atuais.map((cada) =>
                          cada.proprietarioId === vinculo.proprietarioId
                            ? { ...cada, percentual: valor }
                            : cada,
                        ),
                      )
                    }
                  />
                </span>
                <Botao
                  variante="fantasma"
                  tamanho="pequeno"
                  tom="critico"
                  rotuloAcessivel={`Remover ${vinculo.nome}`}
                  aoClicar={() =>
                    setVinculos((atuais) =>
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
          {disponiveis.length > 0 ? (
            <Selecao
              rotulo="Adicionar vínculo"
              rotuloOculto
              valor=""
              opcoes={[
                { valor: '', rotulo: 'Adicionar vínculo…' },
                ...disponiveis.map((dono) => ({ valor: String(dono.id), rotulo: dono.nome ?? '' })),
              ]}
              aoMudar={(escolhido) => {
                const dono = disponiveis.find((cada) => String(cada.id) === escolhido);
                if (dono) {
                  vincular(dono);
                }
              }}
            />
          ) : (
            <Texto variante="apoio" tom="suave" como="p">
              {vinculos.length === 0
                ? 'Nenhum proprietário cadastrado ainda — cadastre o primeiro por aqui.'
                : 'Todos os proprietários cadastrados já estão vinculados.'}
            </Texto>
          )}
          {vinculos.length > 0 ? (
            <div className={estilos.somaLinha}>
              <Texto variante="corpo" tom={contratoFecha ? 'positivo' : 'atencao'} como="span">
                Soma das participações {percentualEmTexto(Math.round(somaDosVinculos * 100) / 100)}
              </Texto>
              <Botao
                variante="fantasma"
                tamanho="pequeno"
                aoClicar={() =>
                  setVinculos((atuais) => {
                    const fatias = dividirIgualmente(atuais.length);
                    return atuais.map((cada, indice) => ({
                      ...cada,
                      percentual: String(fatias[indice] ?? ''),
                    }));
                  })
                }
              >
                Dividir igualmente
              </Botao>
            </div>
          ) : null}
        </div>
      </section>

      {erro ? (
        <div role="alert">
          <Texto variante="apoio" tom="critico" como="p">
            {erro}
          </Texto>
        </div>
      ) : null}

      <div className={estilos.acoes}>
        <Botao variante="secundario" aoClicar={() => void navegar('/aeronaves')}>
          Cancelar
        </Botao>
        <Botao
          aoClicar={cadastrar}
          desabilitado={!obrigatoriosOk || !contratoFecha}
          carregando={criar.isPending || definirContrato.isPending}
        >
          Cadastrar aeronave
        </Botao>
      </div>

      {conversorAberto ? (
        <ConversorDeMilhas
          aoUsar={(km) => setKmVoados(String(km))}
          aoFechar={() => setConversorAberto(false)}
        />
      ) : null}

      {/* O cadastro rápido é o mesmo painel da tela de Proprietários; o recém-criado já entra
          vinculado, com o percentual por preencher. */}
      {cadastrandoProprietario ? (
        <PainelDeProprietario
          aoSalvar={vincular}
          aoFechar={() => setCadastrandoProprietario(false)}
        />
      ) : null}
    </div>
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
        <Texto variante="subtitulo" como="h2">
          {titulo}
        </Texto>
        <Texto variante="apoio" tom="suave" como="p">
          {descricao}
        </Texto>
      </div>
      {acao ? <div className={estilos.acaoDaSecao}>{acao}</div> : null}
    </div>
  );
}

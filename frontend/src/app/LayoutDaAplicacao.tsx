import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useSessao } from '@/compartilhado/sessao/sessao';
import { Avatar } from '@/design-system/primitivos/Avatar';
import { Botao } from '@/design-system/primitivos/Botao';
import { LinkDeNavegacao } from '@/design-system/primitivos/LinkDeNavegacao';
import { MenuSuspenso, type ItemDeMenu } from '@/design-system/primitivos/MenuSuspenso';
import { Texto } from '@/design-system/primitivos/Texto';
import { useSair } from '@/features/autenticacao/api/useAcesso';

import {
  IconeAeronave,
  IconeBalanca,
  IconeCalendario,
  IconeCartaoDeIdentidade,
  IconeChave,
  IconeDiario,
  IconeEngrenagem,
  IconeMoedas,
  IconePessoas,
  IconePulso,
  IconeRecibo,
  IconeSaida,
  IconeTroca,
} from './Icones';
import estilos from './LayoutDaAplicacao.module.css';

/** O título que o cabeçalho mostra para cada rota, como o `screenTitle` do protótipo. */
const TITULOS: Array<{ padrao: RegExp; titulo: string }> = [
  { padrao: /^\/$/, titulo: 'Saúde' },
  { padrao: /^\/aeronaves\/nova$/, titulo: 'Nova aeronave' },
  { padrao: /^\/aeronaves\/[^/]+\/documentos$/, titulo: 'Documentos' },
  { padrao: /^\/aeronaves\/[^/]+$/, titulo: 'Aeronave' },
  { padrao: /^\/aeronaves$/, titulo: 'Aeronaves' },
  { padrao: /^\/voos/, titulo: 'Diário de voos' },
  { padrao: /^\/trocas/, titulo: 'Trocas de KM' },
  { padrao: /^\/custos/, titulo: 'Lançamentos' },
  { padrao: /^\/aportes/, titulo: 'Aportes' },
  { padrao: /^\/fechamento/, titulo: 'Fechamento' },
  { padrao: /^\/manutencao/, titulo: 'Manutenção' },
  { padrao: /^\/calendario/, titulo: 'Calendário' },
  { padrao: /^\/proprietarios/, titulo: 'Proprietários' },
  { padrao: /^\/usuarios/, titulo: 'Usuários' },
  { padrao: /^\/configuracoes/, titulo: 'Configurações' },
];

function tituloDaRota(caminho: string): string {
  return TITULOS.find(({ padrao }) => padrao.test(caminho))?.titulo ?? 'Aether';
}

/** A tela de cima, para quem chegou direto (link colado, recarregamento) e não tem para onde voltar. */
function telaDeCima(caminho: string): string | null {
  const partes = caminho.split('/').filter(Boolean);
  return partes.length > 1 ? `/${partes.slice(0, -1).join('/')}` : null;
}

interface Registro {
  rotulo: string;
  apoio: string;
  tela: string;
  podeRegistrar: (papel: string | undefined) => boolean;
}

const gere = (papel: string | undefined) => papel === 'ADMINISTRADOR' || papel === 'GESTOR';

/**
 * O "Registro rápido" do protótipo. Cada item leva à tela dona do registro com `?registrar=1`,
 * que abre o formulário de lá: a casca não conhece formulário de feature nenhuma.
 */
const REGISTROS: Registro[] = [
  {
    rotulo: 'Custo',
    apoio: 'Despesa fixa ou variável',
    tela: '/custos',
    podeRegistrar: gere,
  },
  {
    rotulo: 'Trecho',
    apoio: 'Perna voada, horas e KM',
    tela: '/voos',
    // Como no diário: quem volta do voo com os horários na mão é o piloto.
    podeRegistrar: (papel) => gere(papel) || papel === 'PILOTO',
  },
  {
    rotulo: 'Troca de KM',
    apoio: 'Horas cedidas entre proprietários',
    tela: '/trocas',
    podeRegistrar: gere,
  },
  {
    rotulo: 'Aporte',
    apoio: 'Entrada no fundo da aeronave',
    tela: '/aportes',
    podeRegistrar: gere,
  },
];

/**
 * A casca da área logada: navegação à esquerda; no alto, o voltar das telas internas, o título,
 * o "+ Registrar" e a identificação; a tela no meio — a moldura do Projeto final.
 *
 * <p>Do protótipo ainda faltam o sino de notificações, que é a porta da Central de avisos, e o
 * seletor de idioma, fora de escopo por decisão de produto. Ver `docs/design-system.md`.
 */
export function LayoutDaAplicacao() {
  const { usuario, ehAdministrador } = useSessao();
  const sair = useSair();
  const localizacao = useLocation();
  const navegar = useNavigate();

  const acima = telaDeCima(localizacao.pathname);
  // A chave "default" é a da primeira entrada desta aba: não há tela do Aether para onde voltar.
  const voltar = () => (localizacao.key === 'default' ? navegar(acima ?? '/') : navegar(-1));

  // Estando numa aeronave, o registro já nasce nela.
  const aeronaveAberta = /^\/aeronaves\/(\d+)$/.exec(localizacao.pathname)?.[1];
  const registros: ItemDeMenu[] = REGISTROS.filter((registro) =>
    registro.podeRegistrar(usuario?.papel),
  ).map((registro) => ({
    rotulo: registro.rotulo,
    apoio: registro.apoio,
    aoEscolher: () =>
      navegar(`${registro.tela}?${aeronaveAberta ? `aeronave=${aeronaveAberta}&` : ''}registrar=1`),
  }));

  return (
    <div className={estilos.moldura}>
      <nav className={estilos.navegacao} aria-label="Navegação principal">
        <div className={estilos.marca}>
          <Texto variante="titulo" como="span">
            Æther
          </Texto>
          <Texto variante="legenda" tom="suave" como="span">
            INTELLIGENT AIR ASSET MANAGEMENT
          </Texto>
        </div>
        <ul className={estilos.itens}>
          <li>
            <LinkDeNavegacao para="/" exata icone={<IconePulso />}>
              Saúde
            </LinkDeNavegacao>
          </li>
          <li>
            <LinkDeNavegacao para="/aeronaves" icone={<IconeAeronave />}>
              Aeronaves
            </LinkDeNavegacao>
          </li>
          <li>
            <LinkDeNavegacao para="/voos" icone={<IconeDiario />}>
              Diário de voos
            </LinkDeNavegacao>
          </li>
          <li>
            <LinkDeNavegacao para="/trocas" icone={<IconeTroca />}>
              Trocas de KM
            </LinkDeNavegacao>
          </li>
          <li>
            <LinkDeNavegacao para="/custos" icone={<IconeRecibo />}>
              Lançamentos
            </LinkDeNavegacao>
          </li>
          <li>
            <LinkDeNavegacao para="/aportes" icone={<IconeMoedas />}>
              Aportes
            </LinkDeNavegacao>
          </li>
          <li>
            <LinkDeNavegacao para="/fechamento" icone={<IconeBalanca />}>
              Fechamento
            </LinkDeNavegacao>
          </li>
          <li>
            <LinkDeNavegacao para="/manutencao" icone={<IconeChave />}>
              Manutenção
            </LinkDeNavegacao>
          </li>
          <li>
            <LinkDeNavegacao para="/calendario" icone={<IconeCalendario />}>
              Calendário
            </LinkDeNavegacao>
          </li>
          <li>
            <LinkDeNavegacao para="/proprietarios" icone={<IconeCartaoDeIdentidade />}>
              Proprietários
            </LinkDeNavegacao>
          </li>
          {/* A área restrita não aparece para quem não é administrador. Isto não é a proteção —
              é só não oferecer o que o servidor recusaria. A guarda está em RotaDeAdministrador
              e, de verdade, na cadeia de autorização do backend. */}
          {ehAdministrador ? (
            <li>
              <LinkDeNavegacao para="/usuarios" icone={<IconePessoas />}>
                Usuários
              </LinkDeNavegacao>
            </li>
          ) : null}
          <li>
            <LinkDeNavegacao para="/configuracoes" icone={<IconeEngrenagem />}>
              Configurações
            </LinkDeNavegacao>
          </li>
        </ul>
      </nav>
      <div className={estilos.coluna}>
        <header className={estilos.topo}>
          <div className={estilos.titulo}>
            {acima ? (
              <Botao
                variante="secundario"
                tamanho="pequeno"
                rotuloAcessivel="Voltar"
                aoClicar={voltar}
              >
                <span aria-hidden="true">←</span>
              </Botao>
            ) : null}
            <Texto variante="subtitulo" como="h1">
              {tituloDaRota(localizacao.pathname)}
            </Texto>
          </div>
          {registros.length > 0 ? (
            <MenuSuspenso rotulo="+ Registrar" titulo="Registro rápido" itens={registros} />
          ) : null}
          <div className={estilos.identidade}>
            <Avatar nome={usuario?.nome} tom="escuro" />
            <div className={estilos.nomeEEmail}>
              <Texto variante="corpo" como="span">
                {usuario?.nome}
              </Texto>
              <Texto variante="apoio" tom="suave" como="span">
                {usuario?.email}
              </Texto>
            </div>
          </div>
          <Botao
            variante="fantasma"
            tamanho="pequeno"
            aoClicar={() => sair.mutate()}
            carregando={sair.isPending}
            iconeAoFim={<IconeSaida />}
          >
            Sair
          </Botao>
        </header>
        <main className={estilos.conteudo}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

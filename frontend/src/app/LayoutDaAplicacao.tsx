import { Outlet, useLocation } from 'react-router-dom';

import { useSessao } from '@/compartilhado/sessao/sessao';
import { Avatar } from '@/design-system/primitivos/Avatar';
import { Botao } from '@/design-system/primitivos/Botao';
import { LinkDeNavegacao } from '@/design-system/primitivos/LinkDeNavegacao';
import { Texto } from '@/design-system/primitivos/Texto';
import { useSair } from '@/features/autenticacao/api/useAcesso';

import {
  IconeAeronave,
  IconeCalendario,
  IconeCartaoDeIdentidade,
  IconeChave,
  IconeDiario,
  IconeEngrenagem,
  IconePessoas,
  IconePulso,
  IconeRecibo,
  IconeSaida,
} from './Icones';
import estilos from './LayoutDaAplicacao.module.css';

/** O título que o cabeçalho mostra para cada rota, como o `screenTitle` do protótipo. */
const TITULOS: Array<{ padrao: RegExp; titulo: string }> = [
  { padrao: /^\/$/, titulo: 'Saúde' },
  { padrao: /^\/aeronaves\/nova$/, titulo: 'Nova aeronave' },
  { padrao: /^\/aeronaves\/[^/]+$/, titulo: 'Aeronave' },
  { padrao: /^\/aeronaves$/, titulo: 'Aeronaves' },
  { padrao: /^\/voos/, titulo: 'Diário de voos' },
  { padrao: /^\/custos/, titulo: 'Lançamentos' },
  { padrao: /^\/manutencao/, titulo: 'Manutenção' },
  { padrao: /^\/calendario/, titulo: 'Calendário' },
  { padrao: /^\/proprietarios/, titulo: 'Proprietários' },
  { padrao: /^\/usuarios/, titulo: 'Usuários' },
  { padrao: /^\/configuracoes/, titulo: 'Configurações' },
];

function tituloDaRota(caminho: string): string {
  return TITULOS.find(({ padrao }) => padrao.test(caminho))?.titulo ?? 'Aether';
}

/**
 * A casca da área logada: navegação à esquerda, título da tela e identificação no alto, tela no
 * meio — a moldura do Projeto final.
 *
 * <p>É deliberadamente o mínimo que as telas existentes exigem. A casca do protótipo tem ainda o
 * "+ Registrar", a fila de avisos e o seletor de idioma — nada disso foi implementado porque
 * nenhuma tela em pé consome. Ver `docs/design-system.md`.
 */
export function LayoutDaAplicacao() {
  const { usuario, ehAdministrador } = useSessao();
  const sair = useSair();
  const localizacao = useLocation();

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
            <LinkDeNavegacao para="/custos" icone={<IconeRecibo />}>
              Lançamentos
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
          <Texto variante="subtitulo" como="h1">
            {tituloDaRota(localizacao.pathname)}
          </Texto>
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

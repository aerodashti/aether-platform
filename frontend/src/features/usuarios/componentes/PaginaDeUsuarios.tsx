import { useDeferredValue, useState } from 'react';

import type { PapelDoUsuario } from '@/compartilhado/sessao/sessao';
import { useSessao } from '@/compartilhado/sessao/sessao';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { Texto } from '@/design-system/primitivos/Texto';

import {
  TAMANHO_DA_PAGINA,
  useUsuarios,
  type FiltroDeUsuarios,
  type SituacaoDoUsuario,
} from '../api/useUsuarios';

import estilos from './PaginaDeUsuarios.module.css';
import { PainelDeConvite } from './PainelDeConvite';
import { OPCOES_DE_PAPEL, OPCOES_DE_SITUACAO } from './rotulos';
import { TabelaDeUsuarios } from './TabelaDeUsuarios';

const FILTRO_INICIAL: FiltroDeUsuarios = { busca: '', papel: '', situacao: '', pagina: 0 };

export function PaginaDeUsuarios() {
  const [filtro, setFiltro] = useState<FiltroDeUsuarios>(FILTRO_INICIAL);
  const [convidando, setConvidando] = useState(false);
  const { usuario } = useSessao();

  // A busca acompanha a digitação sem disparar uma requisição por tecla: o React entrega o valor
  // adiado quando a digitação dá trégua, e o `placeholderData` da consulta segura a grade
  // enquanto isso. É a alternativa a um debounce com timer, que teria que ser cancelado à mão.
  const filtroAdiado = useDeferredValue(filtro);
  const consulta = useUsuarios(filtroAdiado);

  /** Qualquer mudança de recorte volta para a primeira página: a quinta pode não existir mais. */
  function ajustar(parcial: Partial<FiltroDeUsuarios>) {
    setFiltro((atual) => ({ ...atual, ...parcial, pagina: 0 }));
  }

  const pagina = consulta.data;
  const total = pagina?.total ?? 0;
  const primeiro = total === 0 ? 0 : filtroAdiado.pagina * TAMANHO_DA_PAGINA + 1;
  const ultimo = Math.min(primeiro + TAMANHO_DA_PAGINA - 1, total);

  return (
    <div className={estilos.tela}>
      <div className={estilos.cabecalho}>
        <div className={estilos.aviso}>
          <span className={estilos.etiqueta}>ADMIN</span>
          <Texto variante="corpo" tom="suave" como="span">
            Página restrita — visível apenas para administradores.
          </Texto>
        </div>
        <Botao aoClicar={() => setConvidando(true)}>Convidar usuário</Botao>
      </div>

      <div className={estilos.filtros}>
        <div className={estilos.busca}>
          <CampoDeTexto
            rotulo="Buscar usuário"
            rotuloOculto
            valor={filtro.busca}
            aoMudar={(busca) => ajustar({ busca })}
            exemplo="Buscar por nome ou e-mail…"
          />
        </div>
        <Selecao
          rotulo="Filtrar por papel"
          rotuloOculto
          valor={filtro.papel}
          opcoes={OPCOES_DE_PAPEL}
          aoMudar={(papel) => ajustar({ papel: papel as PapelDoUsuario | '' })}
        />
        <Selecao
          rotulo="Filtrar por situação"
          rotuloOculto
          valor={filtro.situacao}
          opcoes={OPCOES_DE_SITUACAO}
          aoMudar={(situacao) => ajustar({ situacao: situacao as SituacaoDoUsuario | '' })}
        />
      </div>

      <div className={estilos.painel}>
        {/* Quem está na sessão é reconhecido pelo e-mail, e não por id: `SessaoResponse` não
            carrega id, e o e-mail já é chave única normalizada dos dois lados. */}
        <TabelaDeUsuarios
          itens={pagina?.itens ?? []}
          carregando={consulta.isPending}
          erro={consulta.isError}
          emailDaSessao={usuario?.email}
          aoTentarDeNovo={() => void consulta.refetch()}
        />
        <div className={estilos.rodape}>
          <Texto variante="apoio" tom="suave" como="span">
            {total === 0 ? 'Nenhum usuário' : `${primeiro}–${ultimo} de ${total}`}
          </Texto>
          <div className={estilos.paginacao}>
            <Botao
              variante="secundario"
              tamanho="pequeno"
              desabilitado={filtroAdiado.pagina === 0}
              aoClicar={() => setFiltro((atual) => ({ ...atual, pagina: atual.pagina - 1 }))}
            >
              Anterior
            </Botao>
            <Botao
              variante="secundario"
              tamanho="pequeno"
              desabilitado={ultimo >= total}
              aoClicar={() => setFiltro((atual) => ({ ...atual, pagina: atual.pagina + 1 }))}
            >
              Próxima
            </Botao>
          </div>
        </div>
      </div>

      <Texto variante="apoio" tom="suave" como="p">
        O convidado recebe um e-mail com link para completar o cadastro e criar a própria senha —
        nenhuma senha é definida pelo administrador.
      </Texto>

      <PainelDeConvite aberto={convidando} aoFechar={() => setConvidando(false)} />
    </div>
  );
}

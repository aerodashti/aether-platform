import { useDeferredValue, useState } from 'react';

import { useSessao } from '@/compartilhado/sessao/sessao';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { Texto } from '@/design-system/primitivos/Texto';

import {
  useProprietarios,
  type ProprietarioResponse,
  type SituacaoDoProprietario,
} from '../api/useProprietarios';

import estilos from './PaginaDeProprietarios.module.css';
import { PainelDeProprietario } from './PainelDeProprietario';
import { OPCOES_DE_SITUACAO } from './rotulos';
import { TabelaDeProprietarios } from './TabelaDeProprietarios';

type Painel = { modo: 'novo' } | { modo: 'editar'; proprietario: ProprietarioResponse } | null;

export function PaginaDeProprietarios() {
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState<SituacaoDoProprietario | ''>('');
  const [painel, setPainel] = useState<Painel>(null);
  const { usuario } = useSessao();

  // O recorte é local — a lista completa já está aqui —, mas digitar não pode travar a grade:
  // o valor adiado deixa o filtro correr quando a digitação dá trégua.
  const buscaAdiada = useDeferredValue(busca);
  const consulta = useProprietarios();

  const podeGerir = usuario?.papel === 'ADMINISTRADOR' || usuario?.papel === 'GESTOR';

  const termo = buscaAdiada.trim().toLowerCase();
  const itens = (consulta.data ?? []).filter((proprietario) => {
    if (situacao && proprietario.situacao !== situacao) {
      return false;
    }
    if (!termo) {
      return true;
    }
    return [proprietario.nome, proprietario.email, proprietario.cpfCnpj]
      .filter(Boolean)
      .some((campo) => String(campo).toLowerCase().includes(termo));
  });

  return (
    <div className={estilos.tela}>
      <div className={estilos.cabecalho}>
        <Texto variante="corpo" tom="suave" como="p">
          Um proprietário pode participar de várias aeronaves, com percentual diferente em cada uma.
        </Texto>
        {podeGerir ? (
          <Botao aoClicar={() => setPainel({ modo: 'novo' })}>Novo proprietário</Botao>
        ) : null}
      </div>

      <div className={estilos.filtros}>
        <div className={estilos.busca}>
          <CampoDeTexto
            rotulo="Buscar proprietário"
            rotuloOculto
            valor={busca}
            aoMudar={setBusca}
            exemplo="Buscar por nome, e-mail ou documento…"
          />
        </div>
        <Selecao
          rotulo="Filtrar por situação"
          rotuloOculto
          valor={situacao}
          opcoes={OPCOES_DE_SITUACAO}
          aoMudar={(valor) => setSituacao(valor as SituacaoDoProprietario | '')}
        />
      </div>

      <div className={estilos.painel}>
        <TabelaDeProprietarios
          itens={itens}
          carregando={consulta.isPending}
          erro={consulta.isError}
          podeGerir={podeGerir}
          aoEditar={(proprietario) => setPainel({ modo: 'editar', proprietario })}
          aoTentarDeNovo={() => void consulta.refetch()}
        />
      </div>

      <Texto variante="apoio" tom="suave" como="p">
        A participação por aeronave e o saldo de cada proprietário aparecem aqui quando o contrato
        de participação for definido na aeronave.
      </Texto>

      {/* O `key` remonta o painel a cada alvo: é a remontagem que zera o formulário. */}
      {painel ? (
        <PainelDeProprietario
          key={painel.modo === 'editar' ? painel.proprietario.id : 'novo'}
          proprietario={painel.modo === 'editar' ? painel.proprietario : undefined}
          aoFechar={() => setPainel(null)}
        />
      ) : null}
    </div>
  );
}

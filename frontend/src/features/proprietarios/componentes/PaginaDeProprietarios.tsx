import { useDeferredValue, useState } from 'react';

import {
  agruparPorProprietario,
  useVinculosVigentes,
} from '@/compartilhado/participacoes/useVinculosVigentes';
import { PainelDeProprietario } from '@/compartilhado/proprietarios/PainelDeProprietario';
import { useSessao } from '@/compartilhado/sessao/sessao';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { Esqueleto } from '@/design-system/primitivos/Esqueleto';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { Texto } from '@/design-system/primitivos/Texto';

import {
  useProprietarios,
  type ProprietarioResponse,
  type SituacaoDoProprietario,
} from '../api/useProprietarios';

import { CartaoDeProprietario } from './CartaoDeProprietario';
import estilos from './PaginaDeProprietarios.module.css';
import { OPCOES_DE_SITUACAO } from './rotulos';

type Painel = { modo: 'novo' } | { modo: 'editar'; proprietario: ProprietarioResponse } | null;

const CARTOES_DO_ESQUELETO = 3;

/**
 * A grade de cartões de proprietários do protótipo: um cartão por proprietário, com as aeronaves
 * em que participa. O CRUD mora aqui; o cadastro de aeronave só abre o mesmo painel para criar.
 */
export function PaginaDeProprietarios() {
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState<SituacaoDoProprietario | ''>('');
  const [painel, setPainel] = useState<Painel>(null);
  const { usuario } = useSessao();

  // O recorte é local — a lista completa já está aqui —, mas digitar não pode travar a grade:
  // o valor adiado deixa o filtro correr quando a digitação dá trégua.
  const buscaAdiada = useDeferredValue(busca);
  const consulta = useProprietarios();
  // Os vínculos chegam à parte e não seguram a grade: sem eles o cartão mostra "sem vínculo"
  // por um instante, e com eles as barras aparecem — nunca um cartão em branco.
  const vinculos = useVinculosVigentes();
  const vinculosPorProprietario = agruparPorProprietario(vinculos.data);

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
          <Botao variante="contorno" aoClicar={() => setPainel({ modo: 'novo' })}>
            + Novo proprietário
          </Botao>
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

      {consulta.isError ? (
        <div className={estilos.recado} role="alert">
          <Texto variante="corpo" como="p">
            Não foi possível carregar os proprietários.
          </Texto>
          <Texto variante="apoio" tom="suave" como="p">
            A conexão com o servidor falhou. Nada foi alterado.
          </Texto>
          <Botao variante="secundario" tamanho="pequeno" aoClicar={() => void consulta.refetch()}>
            Tentar de novo
          </Botao>
        </div>
      ) : consulta.isPending ? (
        <>
          <div role="status" className={estilos.apenasLeitor}>
            Carregando proprietários…
          </div>
          <ul className={estilos.grade} aria-hidden="true">
            {Array.from({ length: CARTOES_DO_ESQUELETO }, (_, indice) => (
              <li key={indice} className={estilos.cartaoDoEsqueleto}>
                <Esqueleto />
                <Esqueleto />
              </li>
            ))}
          </ul>
        </>
      ) : itens.length === 0 ? (
        <div className={estilos.recado}>
          <Texto variante="corpo" como="p">
            Nenhum proprietário encontrado com os filtros atuais.
          </Texto>
          <Texto variante="apoio" tom="suave" como="p">
            Limpe a busca ou volte o filtro de situação para "Todas".
          </Texto>
        </div>
      ) : (
        <ul className={estilos.grade} aria-label="Proprietários">
          {itens.map((proprietario) => (
            <CartaoDeProprietario
              key={proprietario.id}
              proprietario={proprietario}
              vinculos={vinculosPorProprietario.get(proprietario.id ?? 0) ?? []}
              podeGerir={podeGerir}
              aoEditar={(alvo) => setPainel({ modo: 'editar', proprietario: alvo })}
            />
          ))}
        </ul>
      )}

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

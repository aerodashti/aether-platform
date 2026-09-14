import type { VinculoVigenteResponse } from '@/compartilhado/participacoes/useVinculosVigentes';
import { Avatar } from '@/design-system/primitivos/Avatar';
import { Botao } from '@/design-system/primitivos/Botao';
import { LinkDeTexto } from '@/design-system/primitivos/LinkDeTexto';
import { Texto } from '@/design-system/primitivos/Texto';

import {
  useDesativarProprietario,
  useReativarProprietario,
  type ProprietarioResponse,
} from '../api/useProprietarios';

import estilos from './CartaoDeProprietario.module.css';
import { formatarCpfCnpj, percentualEmTexto } from './rotulos';

interface CartaoDeProprietarioProps {
  proprietario: ProprietarioResponse;
  vinculos: VinculoVigenteResponse[];
  /** Escrita é de administrador e gestor; para os demais o cartão é só leitura. */
  podeGerir: boolean;
  aoEditar: (proprietario: ProprietarioResponse) => void;
}

/**
 * Um proprietário e as aeronaves em que participa, como no protótipo: identificação em cima, uma
 * linha por vínculo embaixo com a barra do percentual.
 *
 * <p>O saldo por aeronave que o protótipo mostra ao lado da barra não está aqui: pertence a
 * aportes, e **coluna vazia não existe**. E o "Excluir" do protótipo é "Desativar": excluir de
 * verdade não existe neste domínio (ver o glossário).
 */
export function CartaoDeProprietario({
  proprietario,
  vinculos,
  podeGerir,
  aoEditar,
}: CartaoDeProprietarioProps) {
  const desativar = useDesativarProprietario();
  const reativar = useReativarProprietario();

  const id = proprietario.id ?? 0;
  const inativo = proprietario.situacao === 'INATIVO';
  const identificacao = [
    proprietario.cpfCnpj ? formatarCpfCnpj(proprietario.cpfCnpj) : null,
    proprietario.email,
    proprietario.telefone,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className={estilos.cartao}>
      <div className={estilos.identidade}>
        <Avatar nome={proprietario.nome} tamanho="grande" />
        <div className={estilos.nomes}>
          <Texto variante="corpo" como="span">
            <span className={estilos.nome}>{proprietario.nome}</span>
          </Texto>
          <span className={estilos.contato}>{identificacao || '—'}</span>
        </div>
        {inativo ? <span className={estilos.etiqueta}>Inativo</span> : null}
        {podeGerir ? (
          <span className={estilos.acoes}>
            {inativo ? (
              <Botao
                variante="contorno"
                tamanho="pequeno"
                carregando={reativar.isPending}
                aoClicar={() => reativar.mutate(id)}
              >
                Reativar
              </Botao>
            ) : (
              <>
                <Botao
                  variante="secundario"
                  tamanho="pequeno"
                  aoClicar={() => aoEditar(proprietario)}
                >
                  Editar
                </Botao>
                <Botao
                  variante="secundario"
                  tamanho="pequeno"
                  tom="critico"
                  carregando={desativar.isPending}
                  aoClicar={() => desativar.mutate(id)}
                >
                  Desativar
                </Botao>
              </>
            )}
          </span>
        ) : null}
      </div>

      {vinculos.length === 0 ? (
        <div className={estilos.semVinculo}>
          {inativo
            ? 'Fora de qualquer contrato vigente.'
            : 'Sem vínculo com aeronave ainda — defina o contrato de participação na aeronave.'}
        </div>
      ) : (
        <ul className={estilos.vinculos} aria-label={`Aeronaves de ${proprietario.nome}`}>
          {vinculos.map((vinculo) => {
            const percentual = Number(vinculo.percentual ?? 0);
            return (
              <li key={vinculo.aeronaveId} className={estilos.vinculo}>
                <span className={estilos.matricula}>
                  <LinkDeTexto para={`/aeronaves/${vinculo.aeronaveId}`} mono>
                    {vinculo.matricula}
                  </LinkDeTexto>
                </span>
                <span className={estilos.trilho} aria-hidden="true">
                  <span className={estilos.barra} style={{ width: `${percentual}%` }} />
                </span>
                <span className={estilos.percentual}>{percentualEmTexto(percentual)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

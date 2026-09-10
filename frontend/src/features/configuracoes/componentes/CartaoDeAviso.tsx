import { useEffect, useState } from 'react';

import { ErroDeApi } from '@/api/cliente';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { GrupoDeOpcoes } from '@/design-system/primitivos/GrupoDeOpcoes';
import { Texto } from '@/design-system/primitivos/Texto';

import { useAlterarAviso, type EmpresaResponse } from '../api/useConfiguracoes';

import { Cartao } from './Cartao';
import estilos from './CartaoDeAviso.module.css';
import { AVISOS_SUGERIDOS } from './rotulos';

const OPCOES = AVISOS_SUGERIDOS.map((dias) => ({ valor: String(dias), rotulo: `${dias} dias` }));

/**
 * Com quantos dias de antecedência avisar antes de um documento vencer.
 *
 * <p>Este número não é decoração: ele governa a coluna Situação da tela de Aeronaves. Encolher a
 * janela tira aeronaves de "Atenção"; alargá-la coloca outras. É a razão de a tela dizer o que o
 * número faz, e não só pedi-lo.
 */
export function CartaoDeAviso({ empresa }: { empresa: EmpresaResponse }) {
  const vigente = empresa.diasDeAviso ?? 30;
  const [dias, setDias] = useState(String(vigente));
  const alterar = useAlterarAviso();

  useEffect(() => setDias(String(vigente)), [vigente]);

  const numero = Number(dias);
  const valido = Number.isInteger(numero) && numero >= 1 && numero <= 365;
  const erro = alterar.error instanceof ErroDeApi ? alterar.error.message : undefined;
  const sugerido = OPCOES.some((opcao) => opcao.valor === dias) ? dias : '';

  return (
    <Cartao
      titulo="Alertas de vencimento"
      descricao="Com quantos dias de antecedência o sistema deve avisar antes de um documento vencer. Vale para o CVA e para a apólice RETA de toda a frota."
    >
      <GrupoDeOpcoes
        rotulo="Antecedência do aviso"
        valor={sugerido}
        opcoes={OPCOES}
        aoEscolher={setDias}
      />

      <div className={estilos.personalizado}>
        <div className={estilos.campo}>
          <CampoDeTexto
            rotulo="Personalizado"
            valor={dias}
            aoMudar={setDias}
            inputMode="numeric"
            alinhamento="centro"
            maxLength={3}
            erro={valido ? erro : 'Informe de 1 a 365 dias.'}
          />
        </div>
        <span className={estilos.unidade}>
          <Texto variante="apoio" tom="suave" como="span">
            dias antes
          </Texto>
        </span>
      </div>

      <div className={estilos.acao}>
        <Botao
          aoClicar={() => alterar.mutate(numero)}
          desabilitado={!valido || numero === vigente}
          carregando={alterar.isPending}
        >
          Salvar antecedência
        </Botao>
        {alterar.isSuccess && numero === vigente ? (
          <Texto variante="apoio" tom="positivo" como="span">
            Antecedência salva.
          </Texto>
        ) : null}
      </div>
    </Cartao>
  );
}

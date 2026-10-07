import { useState } from 'react';

import { Formulario } from '@/compartilhado/formulario/Formulario';
import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { useValidacao } from '@/compartilhado/formulario/useValidacao';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { Texto } from '@/design-system/primitivos/Texto';

import estilos from './ConversorDeMilhas.module.css';
import {
  kmDasMilhas,
  ROTULOS_DO_CONVERSOR,
  validarConversorDeMilhas,
} from './validacaoDoConversorDeMilhas';

const KM = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

interface ConversorDeMilhasProps {
  aoUsar: (km: number) => void;
  aoFechar: () => void;
}

/** O conversor do protótipo: quem tem o total em NM digita aqui e o campo de km recebe pronto. */
export function ConversorDeMilhas({ aoUsar, aoFechar }: ConversorDeMilhasProps) {
  const [milhas, setMilhas] = useState('');
  const validacao = useValidacao({
    erros: validarConversorDeMilhas(milhas),
    valores: { milhas },
    rotulos: ROTULOS_DO_CONVERSOR,
  });
  const km = kmDasMilhas(milhas);

  function usar() {
    if (km !== null) {
      aoUsar(km);
    }
    aoFechar();
  }

  return (
    <PainelModal aberto aoFechar={aoFechar} rotulo="Conversor de milhas náuticas">
      <Formulario referencia={validacao.refDoFormulario} aoEnviar={() => validacao.enviar(usar)}>
        <Texto variante="titulo" como="h2">
          Milhas náuticas → km
        </Texto>
        <Texto variante="apoio" tom="suave" como="p">
          1 NM = 1,852 km
        </Texto>
        <CampoDeTexto
          rotulo={ROTULOS_DO_CONVERSOR.milhas}
          obrigatorio
          valor={milhas}
          aoMudar={setMilhas}
          erro={validacao.erroDe('milhas')}
          inputMode="decimal"
          exemplo="432.000"
        />
        {/* A conta muda a cada tecla: quem usa leitor de tela ouve o resultado sem sair do campo. */}
        <div aria-live="polite">
          <Texto variante="corpo" como="p">
            {`Equivale a ${km === null ? '—' : KM.format(km)} km`}
          </Texto>
        </div>
        <ResumoDoFormulario resumo={validacao.resumo} />
        <div className={estilos.acoes}>
          <Botao variante="secundario" aoClicar={aoFechar}>
            Cancelar
          </Botao>
          <Botao tipo="submit">Usar valor</Botao>
        </div>
      </Formulario>
    </PainelModal>
  );
}

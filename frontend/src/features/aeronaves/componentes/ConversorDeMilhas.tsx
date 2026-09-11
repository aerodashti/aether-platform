import { useState } from 'react';

import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { Texto } from '@/design-system/primitivos/Texto';

import estilos from './ConversorDeMilhas.module.css';

/** 1 NM = 1,852 km, por definição — é a constante da milha náutica, não configuração. */
const KM_POR_MILHA_NAUTICA = 1.852;

interface ConversorDeMilhasProps {
  aoUsar: (km: number) => void;
  aoFechar: () => void;
}

/** O conversor do protótipo: quem tem o total em NM digita aqui e o campo de km recebe pronto. */
export function ConversorDeMilhas({ aoUsar, aoFechar }: ConversorDeMilhasProps) {
  const [milhas, setMilhas] = useState('');

  const valor = Number(milhas.trim().replace(',', '.'));
  const km = Number.isFinite(valor) && milhas.trim() !== '' ? valor * KM_POR_MILHA_NAUTICA : NaN;
  const kmArredondado = Math.round(km);

  return (
    <PainelModal aberto aoFechar={aoFechar} rotulo="Conversor de milhas náuticas">
      <Texto variante="titulo" como="h2">
        Milhas náuticas → km
      </Texto>
      <Texto variante="apoio" tom="suave" como="p">
        1 NM = 1,852 km
      </Texto>
      <CampoDeTexto
        rotulo="Milhas náuticas (NM)"
        valor={milhas}
        aoMudar={setMilhas}
        inputMode="numeric"
        exemplo="800000"
      />
      <Texto variante="corpo" como="p">
        {Number.isNaN(km)
          ? 'Equivale a — km'
          : `Equivale a ${kmArredondado.toLocaleString('pt-BR')} km`}
      </Texto>
      <div className={estilos.acoes}>
        <Botao variante="secundario" aoClicar={aoFechar}>
          Cancelar
        </Botao>
        <Botao
          desabilitado={Number.isNaN(km)}
          aoClicar={() => {
            aoUsar(kmArredondado);
            aoFechar();
          }}
        >
          Usar valor
        </Botao>
      </div>
    </PainelModal>
  );
}

import { Botao } from '@/design-system/primitivos/Botao';

import type { DetalheDaAeronaveResponse } from '../api/useDetalheDaAeronave';

import estilos from './CartaoDeFichaTecnica.module.css';
import { CartaoDeSecao } from './CartaoDeSecao';
import { dataCurta, horasEmTexto, inteiroEmTexto } from './rotulos';

function pesoEmTexto(kg: number | null | undefined): string {
  return kg == null ? '—' : `${kg.toLocaleString('pt-BR')} kg`;
}

interface CartaoDeFichaTecnicaProps {
  detalhe: DetalheDaAeronaveResponse;
  podeGerir: boolean;
  aoEditar: () => void;
}

/** A ficha técnica em pares chave/valor, como no protótipo. Ausente é travessão, nunca zero. */
export function CartaoDeFichaTecnica({ detalhe, podeGerir, aoEditar }: CartaoDeFichaTecnicaProps) {
  const contadores = detalhe.contadores;
  const vigencia = detalhe.vencimentoReta ? `${dataCurta(detalhe.vencimentoReta)}` : '—';

  const pares: Array<[string, string]> = [
    ['Matrícula', detalhe.matricula ?? '—'],
    ['Fabricante', detalhe.fabricante ?? '—'],
    ['Modelo', detalhe.modelo ?? '—'],
    ['Nº de série', detalhe.numeroDeSerie ?? '—'],
    ['Base', detalhe.base ?? '—'],
    ['Hangar', detalhe.hangar ?? '—'],
    ['Horas de célula', horasEmTexto(contadores?.horasDeCelula)],
    ['Ciclos / pousos', inteiroEmTexto(contadores?.ciclos)],
    ['KM voados', inteiroEmTexto(contadores?.kmVoados)],
    ['Motor 1', horasEmTexto(contadores?.horasMotor1)],
    ['Motor 2', horasEmTexto(contadores?.horasMotor2)],
    ['Motor 3', horasEmTexto(contadores?.horasMotor3)],
    ['Horas APU', horasEmTexto(contadores?.horasApu)],
    ['Peso máx. decolagem', pesoEmTexto(detalhe.pesoMaxDecolagemKg)],
    ['Peso máx. pouso', pesoEmTexto(detalhe.pesoMaxPousoKg)],
    ['Apólice do seguro', detalhe.apoliceDoSeguro ?? '—'],
    ['Vigência do seguro', vigencia],
  ];

  // Motor 3 só aparece em trimotor: um travessão permanente em toda a frota seria data slop.
  const visiveis = pares.filter(([chave, valor]) => chave !== 'Motor 3' || valor !== '—');

  return (
    <CartaoDeSecao
      titulo="Ficha técnica"
      acao={
        podeGerir ? (
          <Botao variante="contorno" tamanho="medio" aoClicar={aoEditar}>
            Editar
          </Botao>
        ) : null
      }
    >
      <dl className={estilos.pares}>
        {visiveis.map(([chave, valor]) => (
          <div key={chave} className={estilos.par}>
            <dt className={estilos.chave}>{chave}</dt>
            <dd className={estilos.valor}>{valor}</dd>
          </div>
        ))}
      </dl>
    </CartaoDeSecao>
  );
}

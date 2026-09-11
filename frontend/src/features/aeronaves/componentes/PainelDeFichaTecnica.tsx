import { useState } from 'react';

import { ErroDeApi } from '@/api/cliente';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { Texto } from '@/design-system/primitivos/Texto';

import {
  useAtualizarFichaTecnica,
  useCorrigirContadores,
  type DetalheDaAeronaveResponse,
} from '../api/useDetalheDaAeronave';

import estilos from './PainelDeFichaTecnica.module.css';

interface PainelDeFichaTecnicaProps {
  detalhe: DetalheDaAeronaveResponse;
  ehAdministrador: boolean;
  aoFechar: () => void;
}

function texto(valor: number | undefined): string {
  return valor === undefined ? '' : String(valor);
}

/** Número digitado, aceitando vírgula. Vazio é ausência (nulo), não zero. */
function numeroOuNulo(valor: string): number | undefined {
  const limpo = valor.trim().replace(',', '.');
  return limpo === '' ? undefined : Number(limpo);
}

/**
 * Edição da ficha técnica em duas seções, como no protótipo: identificação para quem gere, e os
 * contadores — que reescrevem horas e ciclos na mão — só para administrador. A matrícula aparece
 * mas não se edita: é identidade.
 */
export function PainelDeFichaTecnica({
  detalhe,
  ehAdministrador,
  aoFechar,
}: PainelDeFichaTecnicaProps) {
  const [fabricante, setFabricante] = useState(detalhe.fabricante ?? '');
  const [modelo, setModelo] = useState(detalhe.modelo ?? '');
  const [numeroDeSerie, setNumeroDeSerie] = useState(detalhe.numeroDeSerie ?? '');
  const [base, setBase] = useState(detalhe.base ?? '');
  const [hangar, setHangar] = useState(detalhe.hangar ?? '');
  const [apolice, setApolice] = useState(detalhe.apoliceDoSeguro ?? '');
  const [pesoDecolagem, setPesoDecolagem] = useState(texto(detalhe.pesoMaxDecolagemKg));
  const [pesoPouso, setPesoPouso] = useState(texto(detalhe.pesoMaxPousoKg));
  const [horasDeCelula, setHorasDeCelula] = useState(texto(detalhe.contadores?.horasDeCelula));
  const [ciclos, setCiclos] = useState(texto(detalhe.contadores?.ciclos));
  const [kmVoados, setKmVoados] = useState(texto(detalhe.contadores?.kmVoados));
  const [horasMotor1, setHorasMotor1] = useState(texto(detalhe.contadores?.horasMotor1));
  const [horasMotor2, setHorasMotor2] = useState(texto(detalhe.contadores?.horasMotor2));
  const [horasMotor3, setHorasMotor3] = useState(texto(detalhe.contadores?.horasMotor3));
  const [horasApu, setHorasApu] = useState(texto(detalhe.contadores?.horasApu));

  const id = detalhe.id ?? 0;
  const atualizarFicha = useAtualizarFichaTecnica(id);
  const corrigirContadores = useCorrigirContadores(id);

  function salvar() {
    const ficha = {
      fabricante,
      modelo,
      numeroDeSerie,
      base,
      hangar,
      apoliceDoSeguro: apolice,
      pesoMaxDecolagemKg: numeroOuNulo(pesoDecolagem),
      pesoMaxPousoKg: numeroOuNulo(pesoPouso),
    };
    atualizarFicha.mutate(ficha, {
      onSuccess: () => {
        // Os contadores só seguem depois de a ficha gravar: são duas rotas com permissões
        // diferentes, e um 403 no segundo passo não pode desfazer o primeiro.
        if (!ehAdministrador) {
          aoFechar();
          return;
        }
        corrigirContadores.mutate(
          {
            horasDeCelula: numeroOuNulo(horasDeCelula) ?? 0,
            ciclos: numeroOuNulo(ciclos) ?? 0,
            kmVoados: numeroOuNulo(kmVoados) ?? 0,
            horasMotor1: numeroOuNulo(horasMotor1),
            horasMotor2: numeroOuNulo(horasMotor2),
            horasMotor3: numeroOuNulo(horasMotor3),
            horasApu: numeroOuNulo(horasApu),
          },
          { onSuccess: aoFechar },
        );
      },
    });
  }

  const erroDaFicha =
    atualizarFicha.error instanceof ErroDeApi ? atualizarFicha.error.message : undefined;
  const erroDosContadores =
    corrigirContadores.error instanceof ErroDeApi ? corrigirContadores.error.message : undefined;
  const salvando = atualizarFicha.isPending || corrigirContadores.isPending;
  const podeSalvar = modelo.trim().length > 0 && base.trim().length === 4;

  return (
    <PainelModal aberto aoFechar={aoFechar} rotulo="Editar ficha técnica">
      <Texto variante="titulo" como="h2">
        Editar ficha técnica
      </Texto>

      <Texto variante="legenda" tom="suave" como="h3">
        Identificação
      </Texto>
      <div className={estilos.duasColunas}>
        <CampoDeTexto
          rotulo="Matrícula"
          valor={detalhe.matricula ?? ''}
          aoMudar={() => {}}
          desabilitado
        />
        <CampoDeTexto
          rotulo="Fabricante"
          valor={fabricante}
          aoMudar={setFabricante}
          maxLength={80}
        />
        <CampoDeTexto
          rotulo="Modelo"
          valor={modelo}
          aoMudar={setModelo}
          maxLength={120}
          erro={erroDaFicha}
        />
        <CampoDeTexto
          rotulo="Nº de série"
          valor={numeroDeSerie}
          aoMudar={setNumeroDeSerie}
          maxLength={40}
        />
        <CampoDeTexto
          rotulo="Base (ICAO)"
          valor={base}
          aoMudar={setBase}
          maxLength={4}
          exemplo="SBSP"
        />
        <CampoDeTexto rotulo="Hangar" valor={hangar} aoMudar={setHangar} maxLength={60} />
        <CampoDeTexto
          rotulo="Peso máx. decolagem (kg)"
          valor={pesoDecolagem}
          aoMudar={setPesoDecolagem}
          inputMode="numeric"
        />
        <CampoDeTexto
          rotulo="Peso máx. pouso (kg)"
          valor={pesoPouso}
          aoMudar={setPesoPouso}
          inputMode="numeric"
        />
      </div>

      <Texto variante="legenda" tom="suave" como="h3">
        Seguro
      </Texto>
      <CampoDeTexto
        rotulo="Apólice do seguro"
        valor={apolice}
        aoMudar={setApolice}
        maxLength={40}
        apoio="A vigência é o vencimento da RETA, editado na tela de documentos."
      />

      {ehAdministrador ? (
        <>
          <Texto variante="legenda" tom="suave" como="h3">
            Horas, ciclos e motores
          </Texto>
          <Texto variante="apoio" tom="suave" como="p">
            Correção manual dos totais — quando o diário de voos existir, é ele que os alimenta.
          </Texto>
          <div className={estilos.duasColunas}>
            <CampoDeTexto
              rotulo="Horas de célula"
              valor={horasDeCelula}
              aoMudar={setHorasDeCelula}
              inputMode="numeric"
              erro={erroDosContadores}
            />
            <CampoDeTexto rotulo="Ciclos" valor={ciclos} aoMudar={setCiclos} inputMode="numeric" />
            <CampoDeTexto
              rotulo="KM voados"
              valor={kmVoados}
              aoMudar={setKmVoados}
              inputMode="numeric"
            />
            <CampoDeTexto
              rotulo="Motor 1 (h)"
              valor={horasMotor1}
              aoMudar={setHorasMotor1}
              inputMode="numeric"
            />
            <CampoDeTexto
              rotulo="Motor 2 (h)"
              valor={horasMotor2}
              aoMudar={setHorasMotor2}
              inputMode="numeric"
            />
            <CampoDeTexto
              rotulo="Motor 3 (h)"
              valor={horasMotor3}
              aoMudar={setHorasMotor3}
              inputMode="numeric"
            />
            <CampoDeTexto
              rotulo="Horas APU"
              valor={horasApu}
              aoMudar={setHorasApu}
              inputMode="numeric"
            />
          </div>
        </>
      ) : (
        <Texto variante="apoio" tom="suave" como="p">
          Horas de voo e ciclos só podem ser alterados por um administrador do sistema.
        </Texto>
      )}

      <div className={estilos.acoes}>
        <Botao variante="secundario" aoClicar={aoFechar}>
          Cancelar
        </Botao>
        <Botao aoClicar={salvar} desabilitado={!podeSalvar} carregando={salvando}>
          Salvar
        </Botao>
      </div>
    </PainelModal>
  );
}

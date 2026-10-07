import { EtiquetaDeSituacao } from '@/compartilhado/aeronaves/EtiquetaDeSituacao';
import { juntarClasses } from '@/design-system/classes';
import { LinkDeTexto } from '@/design-system/primitivos/LinkDeTexto';

import estilos from './CartaoDaFrota.module.css';
import { custoPorHora, faixaDeCobertura, larguraDaCobertura, type LinhaDaFrota } from './regras';
import { cobertura, horas, km, moeda, moedaCurta } from './rotulos';

const AVISOS_NO_CARTAO = 2;

/**
 * Uma aeronave na "Frota gerenciada": a situação, o saldo do fundo em destaque, a cobertura — quanto
 * tempo o fundo aguenta —, os números do mês e os avisos que pedem ação. O cartão inteiro abre o
 * detalhe.
 */
export function CartaoDaFrota({ linha }: { linha: LinhaDaFrota }) {
  const faixa = faixaDeCobertura(linha.saldo < 0 ? 0 : linha.coberturaEmMeses);
  const porHora = custoPorHora(linha);
  const extras = linha.avisos.length - AVISOS_NO_CARTAO;
  return (
    <li className={estilos.cartao}>
      <div className={estilos.topo}>
        <div className={estilos.identidade}>
          <span className={estilos.matricula}>
            <LinkDeTexto para={`/aeronaves/${linha.aeronaveId}`} mono>
              {linha.matricula}
            </LinkDeTexto>
          </span>
          <span className={estilos.modelo}>{linha.modelo}</span>
        </div>
        <EtiquetaDeSituacao situacao={linha.situacao} />
      </div>

      <div className={estilos.saldo}>
        <span className={juntarClasses(estilos.valorDoSaldo, linha.saldo < 0 && estilos.devedor)}>
          {moedaCurta(linha.saldo)}
        </span>
        <span className={estilos.apoio}>saldo do fundo</span>
      </div>

      <div className={estilos.cobertura}>
        <div className={estilos.trilho} aria-hidden="true">
          {/* A largura é o dado: a fração de seis meses que o fundo cobre. */}
          <div
            className={juntarClasses(estilos.barra, estilos[faixa])}
            style={{
              width: `${larguraDaCobertura(linha.saldo < 0 ? 0 : linha.coberturaEmMeses)}%`,
            }}
          />
        </div>
        <span className={estilos.apoio}>
          Cobertura:{' '}
          <span className={juntarClasses(estilos.textoDaCobertura, estilos[faixa])}>
            {cobertura(linha.coberturaEmMeses, linha.saldo)}
          </span>
        </span>
      </div>

      <dl className={estilos.numeros}>
        <div>
          <dt className={estilos.apoio}>Custo (mês)</dt>
          <dd>{moeda(linha.fixos + linha.variaveis)}</dd>
        </div>
        <div>
          <dt className={estilos.apoio}>Horas · KM</dt>
          <dd>
            {horas(linha.horas)} · {km(linha.km)}
          </dd>
        </div>
        <div>
          <dt className={estilos.apoio}>R$ / hora</dt>
          <dd>{porHora === undefined ? '—' : moedaCurta(porHora)}</dd>
        </div>
      </dl>

      {linha.avisos.length > 0 ? (
        <ul className={estilos.avisos} aria-label={`Avisos da ${linha.matricula}`}>
          {linha.avisos.slice(0, AVISOS_NO_CARTAO).map((aviso) => (
            <li
              key={aviso.chave}
              className={juntarClasses(
                estilos.aviso,
                aviso.gravidade === 'VENCIDO' ? estilos.avisoVencido : estilos.avisoProximo,
              )}
            >
              {aviso.titulo}
            </li>
          ))}
          {extras > 0 ? <li className={estilos.aviso}>+{extras}</li> : null}
        </ul>
      ) : null}
    </li>
  );
}

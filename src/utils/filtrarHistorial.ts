import { mesEnRango } from './temporada'
import type { Temporada } from '../types/temporada'

export interface FiltrosHistorial {
  fechaDesde: string
  fechaHasta: string
  numero: string
  /** Id de Temporada seleccionada (como string, para usarlo directo en un <select>). '' = todas. */
  temporadaId: string
}

export const FILTROS_VACIOS: FiltrosHistorial = { fechaDesde: '', fechaHasta: '', numero: '', temporadaId: '' }

function dosDigitos(n: number): string {
  return String(n).padStart(2, '0')
}

function ultimoDiaDeMes(anio: number, mes: number): number {
  return new Date(anio, mes, 0).getDate()
}

/** Año calendario a partir de una fecha "YYYY-MM-DD"; si viene vacía, el año en curso. */
export function extraerAnio(fecha: string): number {
  const anio = Number(fecha?.slice(0, 4))
  return Number.isFinite(anio) && anio > 0 ? anio : new Date().getFullYear()
}

/**
 * Calcula el rango Desde/Hasta para un año dado, opcionalmente acotado a los meses de una
 * temporada (ej: Invierno mesInicio=5 mesFin=11 en 2024 => 2024-05-01 a 2024-11-30). Si la
 * temporada cruza fin de año (mesInicio > mesFin, ej: Verano Sep-Mar), el fin cae en el año
 * siguiente (Verano 2024 => 2024-09-01 a 2025-03-31).
 */
function calcularRangoFechas(anio: number, temporada: Temporada | null): Pick<FiltrosHistorial, 'fechaDesde' | 'fechaHasta'> {
  if (!temporada) return { fechaDesde: `${anio}-01-01`, fechaHasta: `${anio}-12-31` }

  const cruzaFinDeAnio = temporada.mesInicio > temporada.mesFin
  const anioFin = cruzaFinDeAnio ? anio + 1 : anio
  const ultimoDia = ultimoDiaDeMes(anioFin, temporada.mesFin)

  return {
    fechaDesde: `${anio}-${dosDigitos(temporada.mesInicio)}-01`,
    fechaHasta: `${anioFin}-${dosDigitos(temporada.mesFin)}-${dosDigitos(ultimoDia)}`,
  }
}

/**
 * Filtro por defecto al entrar a un reporte de historial (o al cambiar de cliente/proveedor,
 * o al limpiar filtros): el año en curso completo, sin N° ni temporada.
 */
export function filtrosAnioActual(): FiltrosHistorial {
  return { ...calcularRangoFechas(new Date().getFullYear(), null), numero: '', temporadaId: '' }
}

/**
 * Al elegir una temporada, el rango Desde/Hasta pasa a ser exactamente el de esa temporada
 * (respetando el año que ya estaba puesto — no lo pisa a "hoy"). Al volver a "Todas las
 * temporadas", el rango vuelve a ser el año completo, sin acotar por mes.
 */
export function conTemporada(filtros: FiltrosHistorial, temporadaId: string, temporadas: Temporada[]): FiltrosHistorial {
  const anio = extraerAnio(filtros.fechaDesde)
  const temporada = temporadaId ? (temporadas.find((t) => String(t.id) === temporadaId) ?? null) : null
  return { ...filtros, temporadaId, ...calcularRangoFechas(anio, temporada) }
}

/**
 * Combo rápido de año: recalcula Desde/Hasta para el año elegido, respetando la temporada
 * que ya esté seleccionada (si hay). El N° y la temporada elegida no se tocan.
 */
export function conAnio(filtros: FiltrosHistorial, anio: number, temporadas: Temporada[]): FiltrosHistorial {
  const temporada = filtros.temporadaId ? (temporadas.find((t) => String(t.id) === filtros.temporadaId) ?? null) : null
  return { ...filtros, ...calcularRangoFechas(anio, temporada) }
}

/**
 * Filtra ventas/compras por rango de fecha, N° y/o temporada (todo en el cliente).
 * El número busca tanto en el ID interno de VentSoft como en el campo Referencia
 * (donde suele quedar anotado el N° de comprobante que dio el cliente/proveedor).
 * La temporada es opcional y se combina (no reemplaza) con el rango de fechas — en la
 * práctica el rango ya viene acotado a esa temporada (ver conTemporada/conAnio), pero
 * se revalida acá por si el rango de fechas se tocó a mano después.
 */
export function filtrarPorFechaYNumero<T extends { id: number; fecha: string; referencias?: string | null }>(
  items: T[],
  { fechaDesde, fechaHasta, numero, temporadaId }: FiltrosHistorial,
  temporadas: Temporada[] = [],
): T[] {
  const desde = fechaDesde ? new Date(fechaDesde) : null
  const hasta = fechaHasta ? new Date(`${fechaHasta}T23:59:59.999`) : null
  const num = numero.trim().toLowerCase()
  const temporada = temporadaId ? temporadas.find((t) => String(t.id) === temporadaId) : null

  return items.filter((item) => {
    if (desde || hasta) {
      const fecha = new Date(item.fecha)
      if (desde && fecha < desde) return false
      if (hasta && fecha > hasta) return false
    }
    if (num) {
      const coincideId = item.id.toString().includes(num)
      const coincideReferencia = (item.referencias ?? '').toLowerCase().includes(num)
      if (!coincideId && !coincideReferencia) return false
    }
    if (temporada) {
      const mes = new Date(item.fecha).getMonth() + 1
      if (!mesEnRango(mes, temporada.mesInicio, temporada.mesFin)) return false
    }
    return true
  })
}

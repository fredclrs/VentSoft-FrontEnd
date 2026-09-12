import type { Temporada } from '../types/temporada'

export const MESES = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
]

export const SIN_TEMPORADA = 'Sin temporada'

export function mesEnRango(mes: number, mesInicio: number, mesFin: number): boolean {
  if (mesInicio <= mesFin) return mes >= mesInicio && mes <= mesFin
  // Rango que cruza fin de año (ej: Septiembre a Marzo => mesInicio=9, mesFin=3).
  return mes >= mesInicio || mes <= mesFin
}

/**
 * Determina a qué temporada/campaña configurada pertenece una fecha, según su mes.
 * Es puramente automático: no depende de nada cargado a mano en la venta ni en el
 * artículo. Si el negocio no configuró ninguna temporada, o la fecha no cae en
 * ningún rango, devuelve "Sin temporada".
 */
export function temporadaDeFecha(fecha: string | Date, temporadas: Temporada[]): string {
  const mes = new Date(fecha).getMonth() + 1
  const encontrada = temporadas.find((t) => mesEnRango(mes, t.mesInicio, t.mesFin))
  return encontrada?.nombre ?? SIN_TEMPORADA
}

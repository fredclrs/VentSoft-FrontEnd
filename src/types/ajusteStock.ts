export type TipoAjusteStock = 'ENTRADA' | 'SALIDA'

/** Espejo de Domain.Dtos.AjusteStockDto del backend. */
export interface AjusteStock {
  id: number
  fecha: string
  tipo: TipoAjusteStock
  /** Siempre positivo — el signo lo da tipo, no este campo. */
  cantidad: number
  motivo: string
  estado: string
  idArticulo: number
  idUsuario: number
}

export interface RegistrarAjusteStock {
  fecha: string
  tipo: TipoAjusteStock
  cantidad: number
  motivo: string
  idArticulo: number
  idUsuario: number
}

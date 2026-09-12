export type TipoMovimientoCaja = 'ENTRADA' | 'SALIDA'

/** Espejo de Domain.Dtos.MovimientoCajaDto del backend. */
export interface MovimientoCaja {
  id: number
  fecha: string
  tipo: TipoMovimientoCaja
  monto: number
  motivo: string
  idUsuario: number
  estado: string
}

export interface RegistrarMovimientoCaja {
  fecha: string
  tipo: TipoMovimientoCaja
  monto: number
  motivo: string
  idUsuario: number
}

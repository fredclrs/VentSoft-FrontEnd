import type { EntregaBien } from './entregaBien'

/** Espejo de Domain.Dtos.LiquidacionDto del backend. */
export interface Liquidacion {
  id: number
  fecha: string
  nota?: string | null
  estado: string
  idCliente: number
  idUsuario: number
  deudaAntes: number
  totalEntregado: number
  deudaActual: number
  montoDevueltoEfectivo: number
  saldoAFavorGenerado: number
  entregas: EntregaBien[]
}

export interface RegistrarDetalleLiquidacion {
  idEntrega: number
  precioUnitario: number
}

export interface RegistrarLiquidacion {
  idCliente: number
  idUsuario: number
  nota?: string
  entregas: RegistrarDetalleLiquidacion[]
  devolverEnEfectivo: boolean
}

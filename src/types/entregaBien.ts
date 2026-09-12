/** Espejo de Domain.Dtos.EntregaBienDto del backend. */
export interface EntregaBien {
  id: number
  fecha: string
  numeroBoleta?: string | null
  cantidad: number
  precioUnitario?: number | null
  subTotal?: number | null
  nota?: string | null
  estado: string
  idCliente: number
  idUsuario: number
  idTipoBien: number
  idLiquidacion?: number | null
}

export interface RegistrarEntregaBien {
  fecha: string
  numeroBoleta?: string
  cantidad: number
  precioUnitario?: number
  nota?: string
  idCliente: number
  idUsuario: number
  idTipoBien: number
}

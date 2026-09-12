export interface Cobro {
  id: number
  deudaActual: number
  fecha: string
  monto: number
  recibo?: string | null
  nota?: string | null
  estado: string
  idCliente: number
  idUsuario: number
}

export interface RegistrarCobro {
  fecha: string
  monto: number
  recibo?: string
  nota?: string
  idCliente: number
  idUsuario: number
}

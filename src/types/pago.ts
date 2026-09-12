export interface Pago {
  id: number
  deudaActual: number
  fecha: string
  monto: number
  recibo?: string | null
  nota?: string | null
  estado: string
  idProveedor: number
  idUsuario: number
}

export interface RegistrarPago {
  fecha: string
  monto: number
  recibo?: string
  nota?: string
  idProveedor: number
  idUsuario: number
}

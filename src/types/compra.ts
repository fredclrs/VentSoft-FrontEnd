export interface DetalleCompra {
  id: number
  cantidad: number
  costoUnitario: number
  subTotal: number
  pagado: number
  lote?: string | null
  fechaVencimiento?: string | null
  idCompra: number
  idArticulo: number
}

/** Un artículo con margen de ganancia configurado cuyo precio de venta sugerido cambió al
 * registrar la compra — todavía NO se aplicó, hay que confirmarlo o rechazarlo. */
export interface PrecioSugerido {
  idArticulo: number
  codigo: string
  precioActual: number
  precioSugerido: number
}

export interface Compra {
  id: number
  fecha: string
  referencias?: string | null
  total: number
  pagado: number
  porPagar: number
  nota?: string | null
  estado: string
  idUsuario: number
  idProveedor: number
  detalles: DetalleCompra[]
  preciosSugeridos: PrecioSugerido[]
}

export interface RegistrarDetalleCompra {
  idArticulo: number
  cantidad: number
  costoUnitario: number
  lote?: string
  fechaVencimiento?: string
}

export interface RegistrarCompra {
  fecha: string
  referencias?: string
  nota?: string
  idUsuario: number
  idProveedor: number
  pagado: number
  detalles: RegistrarDetalleCompra[]
}

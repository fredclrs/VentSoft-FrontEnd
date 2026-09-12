export interface DetalleVenta {
  id: number
  cantidad: number
  precioUnitario: number
  /** Costo del artículo al momento de esta venta — null en ventas viejas (de antes de este
   * campo), que caen de vuelta al costo actual del artículo como aproximación. */
  costoUnitario?: number | null
  descuentoMonetario?: number | null
  descuentoPorcentaje?: number | null
  subTotal: number
  pagado: number
  idVenta: number
  idArticulo: number
}

export interface Venta {
  id: number
  fecha: string
  /** Momento real (fecha Y hora) en que se registró la venta — a diferencia de "fecha", que es
   * solo la fecha "de negocio" sin hora. Se usa para mostrar la hora real en el comprobante. */
  fechaRegistro?: string | null
  referencias?: string | null
  descuentoMonetario?: number | null
  descuentoPorcentaje?: number | null
  total: number
  pagado: number
  porPagar: number
  nota?: string | null
  montoSaldoAFavorAplicado: number
  estado: string
  idCliente: number
  idUsuario: number
  idPromocion?: number | null
  detalles: DetalleVenta[]
}

export interface RegistrarDetalleVenta {
  idArticulo: number
  cantidad: number
  precioUnitario: number
  descuentoMonetario?: number
  descuentoPorcentaje?: number
}

export interface RegistrarVenta {
  fecha: string
  referencias?: string
  descuentoMonetario?: number
  descuentoPorcentaje?: number
  nota?: string
  idCliente: number
  idUsuario: number
  idPromocion?: number
  pagado: number
  montoSaldoAFavorAplicado?: number
  detalles: RegistrarDetalleVenta[]
}

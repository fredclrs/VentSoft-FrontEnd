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
  /** Recargo (%) aplicado sobre el Total por la forma de pago elegida (ej. Transferencia).
   * Null = sin recargo, como la gran mayoría de las ventas. */
  recargoPorcentaje?: number | null
  total: number
  pagado: number
  porPagar: number
  nota?: string | null
  montoSaldoAFavorAplicado: number
  estado: string
  idCliente: number
  idUsuario: number
  idPromocion?: number | null
  /** Cómo se cobró lo de "pagado" (Efectivo, Tarjeta, QR, etc.). Null en ventas 100% a crédito
   * o de antes de este campo. */
  idFormaDePago?: number | null
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
  /** Recargo (%) por la forma de pago elegida (ej. Transferencia), sugerido desde
   * FormaDePago.porcentajeRecargo pero ajustable antes de confirmar. */
  recargoPorcentaje?: number
  nota?: string
  idCliente: number
  idUsuario: number
  idPromocion?: number
  pagado: number
  montoSaldoAFavorAplicado?: number
  /** Cómo se cobró lo de "pagado" — opcional, no tiene sentido si pagado es 0. */
  idFormaDePago?: number
  detalles: RegistrarDetalleVenta[]
}

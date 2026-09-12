/** Espejo de Domain.Dtos.DetalleDevolucionVentaDto del backend. */
export interface DetalleDevolucionVenta {
  id: number
  cantidad: number
  precioUnitario: number
  subTotal: number
  vendible: boolean
  idDevolucion: number
  idDetalleVenta: number
  idArticulo: number
}

/** Espejo de Domain.Dtos.DetalleCambioVentaDto del backend. */
export interface DetalleCambioVenta {
  id: number
  cantidad: number
  precioUnitario: number
  subTotal: number
  idDevolucion: number
  idArticulo: number
}

/** Espejo de Domain.Dtos.DevolucionVentaDto del backend. */
export interface DevolucionVenta {
  id: number
  fecha: string
  motivo?: string | null
  estado: string
  idVenta: number
  idCliente: number
  idUsuario: number
  totalDevuelto: number
  totalCambio: number
  aplicadoADeudaVenta: number
  montoCobradoAhora: number
  porPagar: number
  montoDevueltoEfectivo: number
  saldoAFavorGenerado: number
  detalles: DetalleDevolucionVenta[]
  articulosCambio: DetalleCambioVenta[]
}

export interface RegistrarDetalleDevolucion {
  idDetalleVenta: number
  cantidad: number
  vendible: boolean
}

export interface RegistrarDetalleCambio {
  idArticulo: number
  cantidad: number
  precioUnitario: number
}

export interface RegistrarDevolucion {
  idVenta: number
  idUsuario: number
  motivo?: string
  detalles: RegistrarDetalleDevolucion[]
  articulosCambio: RegistrarDetalleCambio[]
  montoCobradoAhora: number
  devolverEnEfectivo: boolean
}

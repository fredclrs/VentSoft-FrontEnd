export interface ArticuloStock {
  idArticulo: number
  codigo: string
  descripcion?: string | null
  stockActual: number
  stockMinimo?: number | null
  stockIdeal?: number | null
}

export interface LoteVencimiento {
  idDetalleCompra: number
  idArticulo: number
  codigoArticulo: string
  descripcionArticulo?: string | null
  lote?: string | null
  fechaVencimiento?: string | null
  cantidad: number
  idCompra: number
  fechaCompra: string
}

export interface ClienteDeuda {
  idCliente: number
  nombreCliente: string
  deudaActual: number
  /** Crédito del cliente por devoluciones/cambios no devueltos en efectivo — aplicable en su próxima compra. */
  saldoAFavor: number
}

export interface ProveedorDeuda {
  idProveedor: number
  nombreProveedor: string
  deudaActual: number
}

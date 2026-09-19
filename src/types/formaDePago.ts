export interface FormaDePago {
  id: number
  nombre: string
  /** Si es true, cuenta como efectivo físico en la caja — el reporte "Ventas del día" la usa
   * para separar el efectivo real del resto (tarjeta, QR, transferencia). */
  esEfectivo: boolean
  /** Recargo (%) sugerido para sumar al Total cuando se cobra con esta forma de pago (ej.
   * Transferencia = 5, por el costo/comisión que le genera al negocio). Null/0 = sin recargo,
   * como la mayoría. En cada Venta se puede ajustar puntualmente. */
  porcentajeRecargo?: number | null
  estado: string
}

export type FormaDePagoFormValues = Omit<FormaDePago, 'id' | 'estado'>

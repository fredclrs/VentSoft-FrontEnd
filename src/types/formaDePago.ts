export interface FormaDePago {
  id: number
  nombre: string
  /** Si es true, cuenta como efectivo físico en la caja — el reporte "Ventas del día" la usa
   * para separar el efectivo real del resto (tarjeta, QR, transferencia). */
  esEfectivo: boolean
  estado: string
}

export type FormaDePagoFormValues = Omit<FormaDePago, 'id' | 'estado'>

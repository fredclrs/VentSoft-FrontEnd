/** Un renglón que la IA leyó de una foto de factura de compra, ya comparado contra el catálogo —
 * es solo una sugerencia para revisar y corregir antes de confirmar, nunca se agrega solo. */
export interface LineaFactura {
  descripcion: string
  cantidad: number
  costoUnitario: number
  esNuevo: boolean
  idArticuloExistente?: number | null
  codigoExistente?: string | null
}

/** Un renglón que la IA interpretó de una lista de texto libre escrita a mano. */
export interface LineaTextoProducto {
  descripcion: string
  talla?: string | null
  color?: string | null
  cantidad: number
  esNuevo: boolean
  idArticuloExistente?: number | null
  codigoExistente?: string | null
}

/** Lo que la IA leyó de la foto de un documento de identidad. */
export interface DatosClienteExtraidos {
  nombre?: string | null
  documentoIdentidad?: string | null
}

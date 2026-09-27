/** Un renglón que la IA leyó de una foto de factura de compra, ya comparado contra el catálogo —
 * es solo una sugerencia para revisar y corregir antes de confirmar, nunca se agrega solo. */
export interface LineaFactura {
  descripcion: string
  talla?: string | null
  color?: string | null
  cantidad: number
  costoUnitario: number
  esNuevo: boolean
  /** El producto (mismo código compartido) ya existe pero esta talla/color puntual es nueva —
   * hace falta completar el Tamaño nomás, el Código/Familia se reusan (ver codigoGrupo/
   * idFamiliaGrupo). Solo puede venir en true si el negocio tiene código compartido activado. */
  esVarianteNueva: boolean
  idArticuloExistente?: number | null
  codigoExistente?: string | null
  codigoGrupo?: string | null
  idFamiliaGrupo?: number | null
}

/** Un renglón que la IA interpretó de una lista de texto libre escrita a mano. */
export interface LineaTextoProducto {
  descripcion: string
  talla?: string | null
  color?: string | null
  cantidad: number
  esNuevo: boolean
  esVarianteNueva: boolean
  idArticuloExistente?: number | null
  codigoExistente?: string | null
  codigoGrupo?: string | null
  idFamiliaGrupo?: number | null
}

/** Lo que la IA leyó de la foto de un documento de identidad. */
export interface DatosClienteExtraidos {
  nombre?: string | null
  documentoIdentidad?: string | null
}

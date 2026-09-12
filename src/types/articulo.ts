export interface ArticuloCaracteristica {
  id: number
  idCaracteristica: number
  nombreCaracteristica?: string | null
  valor: string
}

export interface Articulo {
  id: number
  codigo: string
  descripcion?: string | null
  tamano: string
  unidadMedida?: string | null
  /** Unidades sueltas por paquete. 1 = no se vende por paquete (caso normal). */
  fraccion: number
  /** Precio de UN paquete completo (o de la unidad, si fraccion es 1). */
  precio: number
  costo: number
  /** Precio de una unidad suelta (fuera del paquete). Null = usar precio/fraccion de referencia. */
  precioUnidadSuelta?: number | null
  /** Margen de ganancia deseado (%, ej. 40 = 40%), opcional. Si está cargado, "precio" se
   * recalcula solo (costo × (1 + margen/100)) cada vez que cambia el costo al comprar — no se
   * edita a mano. Null = precio 100% manual, como siempre. */
  margenGanancia?: number | null
  stockMinimo?: number | null
  stockIdeal?: number | null
  imagen?: string | null
  estado: string
  idFamilia: number
  idPromocion?: number | null
  caracteristicas: ArticuloCaracteristica[]
}

export type ArticuloFormValues = Omit<Articulo, 'id' | 'estado'>

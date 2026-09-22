export interface EtiquetaPendiente {
  id: number
  idArticulo: number
  cantidad: number
  fechaAgregado: string
}

export interface AgregarEtiquetaPendiente {
  idArticulo: number
  cantidad: number
}

import { SimpleCrudPage } from '../components/crud/SimpleCrudPage'
import { tiposBienApi } from '../api/tiposBien'
import type { TipoBien, TipoBienFormValues } from '../types/tipoBien'

/** Catálogo de tipos de bien aceptados como pago en especie de una deuda (ej: "Soja", en
 * toneladas) — ver Entregas y Liquidaciones. */
export function TiposBienPage() {
  return (
    <SimpleCrudPage<TipoBien, TipoBienFormValues>
      title="Tipos de bien"
      queryKey="tiposBien"
      api={tiposBienApi}
      newButtonLabel="Nuevo tipo de bien"
      searchPlaceholder="Buscar por nombre…"
      columns={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'unidadMedida', label: 'Unidad de medida' },
        { key: 'estado', label: 'Estado' },
      ]}
      fields={[
        { key: 'nombre', label: 'Nombre', required: true },
        { key: 'unidadMedida', label: 'Unidad de medida (ej: Toneladas, Quintales, Kg)', required: true },
      ]}
      emptyForm={{ nombre: '', unidadMedida: '' }}
      toFormState={(f) => ({ nombre: f.nombre, unidadMedida: f.unidadMedida })}
      serialize={(form) => ({ nombre: form.nombre, unidadMedida: form.unidadMedida })}
      matchesSearch={(item, texto) => item.nombre.toLowerCase().includes(texto)}
    />
  )
}

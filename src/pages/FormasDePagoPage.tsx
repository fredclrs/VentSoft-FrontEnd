import { SimpleCrudPage } from '../components/crud/SimpleCrudPage'
import { formasDePagoApi } from '../api/formasDePago'
import type { FormaDePago, FormaDePagoFormValues } from '../types/formaDePago'

export function FormasDePagoPage() {
  return (
    <SimpleCrudPage<FormaDePago, FormaDePagoFormValues>
      title="Formas de pago"
      queryKey="formasDePago"
      api={formasDePagoApi}
      newButtonLabel="Nueva forma de pago"
      searchPlaceholder="Buscar por nombre…"
      columns={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'estado', label: 'Estado' },
      ]}
      fields={[{ key: 'nombre', label: 'Nombre', required: true }]}
      emptyForm={{ nombre: '' }}
      toFormState={(f) => ({ nombre: f.nombre })}
      serialize={(form) => ({ nombre: form.nombre })}
      matchesSearch={(item, texto) => item.nombre.toLowerCase().includes(texto)}
    />
  )
}

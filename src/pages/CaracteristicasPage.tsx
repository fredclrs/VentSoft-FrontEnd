import { SimpleCrudPage } from '../components/crud/SimpleCrudPage'
import { caracteristicasApi } from '../api/caracteristicas'
import type { Caracteristica, CaracteristicaFormValues } from '../types/caracteristica'

export function CaracteristicasPage() {
  return (
    <SimpleCrudPage<Caracteristica, CaracteristicaFormValues>
      title="Características"
      queryKey="caracteristicas"
      api={caracteristicasApi}
      newButtonLabel="Nueva característica"
      searchPlaceholder="Buscar por nombre…"
      columns={[
        { key: 'nombreCaracteristica', label: 'Nombre' },
        { key: 'descripcion', label: 'Descripción' },
        { key: 'estado', label: 'Estado' },
      ]}
      fields={[
        { key: 'nombreCaracteristica', label: 'Nombre', required: true },
        { key: 'descripcion', label: 'Descripción', multiline: true },
      ]}
      emptyForm={{ nombreCaracteristica: '', descripcion: '' }}
      toFormState={(c) => ({ nombreCaracteristica: c.nombreCaracteristica, descripcion: c.descripcion ?? '' })}
      serialize={(form) => ({
        nombreCaracteristica: form.nombreCaracteristica,
        descripcion: form.descripcion || undefined,
      })}
      matchesSearch={(item, texto) => item.nombreCaracteristica.toLowerCase().includes(texto)}
    />
  )
}

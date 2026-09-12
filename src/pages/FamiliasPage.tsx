import { SimpleCrudPage } from '../components/crud/SimpleCrudPage'
import { familiasApi } from '../api/familias'
import type { Familia, FamiliaFormValues } from '../types/familia'

export function FamiliasPage() {
  return (
    <SimpleCrudPage<Familia, FamiliaFormValues>
      title="Familias"
      queryKey="familias"
      api={familiasApi}
      newButtonLabel="Nueva familia"
      searchPlaceholder="Buscar por nombre…"
      columns={[
        { key: 'nombreFamilia', label: 'Nombre' },
        { key: 'descripcion', label: 'Descripción' },
        { key: 'estado', label: 'Estado' },
      ]}
      fields={[
        { key: 'nombreFamilia', label: 'Nombre', required: true },
        { key: 'descripcion', label: 'Descripción', multiline: true },
      ]}
      emptyForm={{ nombreFamilia: '', descripcion: '' }}
      toFormState={(f) => ({ nombreFamilia: f.nombreFamilia, descripcion: f.descripcion ?? '' })}
      serialize={(form) => ({ nombreFamilia: form.nombreFamilia, descripcion: form.descripcion || undefined })}
      matchesSearch={(item, texto) => item.nombreFamilia.toLowerCase().includes(texto)}
    />
  )
}

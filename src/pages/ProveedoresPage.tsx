import { SimpleCrudPage } from '../components/crud/SimpleCrudPage'
import { proveedoresApi } from '../api/proveedores'
import type { Proveedor, ProveedorFormValues } from '../types/proveedor'

function numeroOUndefined(valor: string): number | undefined {
  if (!valor.trim()) return undefined
  const n = Number(valor)
  return Number.isNaN(n) ? undefined : n
}

export function ProveedoresPage() {
  return (
    <SimpleCrudPage<Proveedor, ProveedorFormValues>
      title="Proveedores"
      queryKey="proveedores"
      api={proveedoresApi}
      newButtonLabel="Nuevo proveedor"
      searchPlaceholder="Buscar por nombre o NIT…"
      columns={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'nit', label: 'NIT' },
        { key: 'zona', label: 'Zona' },
        { key: 'telefono', label: 'Teléfono' },
        { key: 'correo', label: 'Correo' },
        { key: 'estado', label: 'Estado' },
      ]}
      fields={[
        { key: 'nombre', label: 'Nombre', required: true },
        { key: 'nit', label: 'NIT' },
        { key: 'personaContacto', label: 'Persona de contacto' },
        { key: 'zona', label: 'Zona' },
        { key: 'telefono', label: 'Teléfono', type: 'number' },
        { key: 'correo', label: 'Correo' },
        { key: 'direccion', label: 'Dirección' },
        { key: 'nota', label: 'Nota', multiline: true },
      ]}
      emptyForm={{
        nombre: '',
        nit: '',
        personaContacto: '',
        direccion: '',
        zona: '',
        telefono: '',
        correo: '',
        nota: '',
      }}
      toFormState={(p) => ({
        nombre: p.nombre,
        nit: p.nit ?? '',
        personaContacto: p.personaContacto ?? '',
        direccion: p.direccion ?? '',
        zona: p.zona ?? '',
        telefono: p.telefono?.toString() ?? '',
        correo: p.correo ?? '',
        nota: p.nota ?? '',
      })}
      serialize={(form) => ({
        nombre: form.nombre,
        nit: form.nit || undefined,
        personaContacto: form.personaContacto || undefined,
        direccion: form.direccion || undefined,
        zona: form.zona || undefined,
        telefono: numeroOUndefined(form.telefono),
        correo: form.correo || undefined,
        nota: form.nota || undefined,
      })}
      matchesSearch={(item, texto) =>
        item.nombre.toLowerCase().includes(texto) || (item.nit ?? '').toLowerCase().includes(texto)
      }
    />
  )
}

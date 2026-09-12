import { SimpleCrudPage } from '../components/crud/SimpleCrudPage'
import { temporadasApi } from '../api/temporadas'
import { MESES } from '../utils/temporada'
import type { Temporada, TemporadaFormValues } from '../types/temporada'

const OPCIONES_MES = MESES.map((m) => ({ value: String(m.value), label: m.label }))

function nombreMes(mes: number): string {
  return MESES.find((m) => m.value === mes)?.label ?? String(mes)
}

export function TemporadasPage() {
  return (
    <SimpleCrudPage<Temporada, TemporadaFormValues>
      title="Temporadas / campañas"
      queryKey="temporadas"
      api={temporadasApi}
      newButtonLabel="Nueva temporada"
      searchPlaceholder="Buscar por nombre…"
      columns={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'mesInicio', label: 'Desde', render: (t) => nombreMes(t.mesInicio) },
        { key: 'mesFin', label: 'Hasta', render: (t) => nombreMes(t.mesFin) },
        { key: 'estado', label: 'Estado' },
      ]}
      fields={[
        { key: 'nombre', label: 'Nombre', required: true },
        { key: 'mesInicio', label: 'Mes de inicio', required: true, type: 'select', options: OPCIONES_MES },
        { key: 'mesFin', label: 'Mes de fin', required: true, type: 'select', options: OPCIONES_MES },
      ]}
      emptyForm={{ nombre: '', mesInicio: '', mesFin: '' }}
      toFormState={(t) => ({ nombre: t.nombre, mesInicio: String(t.mesInicio), mesFin: String(t.mesFin) })}
      serialize={(form) => ({
        nombre: form.nombre,
        mesInicio: Number(form.mesInicio),
        mesFin: Number(form.mesFin),
      })}
      matchesSearch={(item, texto) => item.nombre.toLowerCase().includes(texto)}
    />
  )
}

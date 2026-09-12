import { SimpleCrudPage } from '../components/crud/SimpleCrudPage'
import { promocionesApi } from '../api/promociones'
import type { Promocion, PromocionFormValues } from '../types/promocion'

function numeroOUndefined(valor: string): number | undefined {
  if (!valor.trim()) return undefined
  const n = Number(valor)
  return Number.isNaN(n) ? undefined : n
}

export function PromocionesPage() {
  return (
    <SimpleCrudPage<Promocion, PromocionFormValues>
      title="Promociones"
      queryKey="promociones"
      api={promocionesApi}
      newButtonLabel="Nueva promoción"
      searchPlaceholder="Buscar por nombre…"
      columns={[
        { key: 'nombrePromocion', label: 'Nombre' },
        {
          key: 'descuentoPorcentaje',
          label: 'Descuento %',
          render: (p) => (p.descuentoPorcentaje ? `${p.descuentoPorcentaje}%` : '—'),
        },
        {
          key: 'descuentoMonetario',
          label: 'Descuento $',
          render: (p) => (p.descuentoMonetario ? p.descuentoMonetario.toFixed(2) : '—'),
        },
        { key: 'estado', label: 'Estado' },
      ]}
      fields={[
        { key: 'nombrePromocion', label: 'Nombre', required: true },
        { key: 'descuentoPorcentaje', label: 'Descuento (%)', type: 'number' },
        { key: 'descuentoMonetario', label: 'Descuento (monto fijo)', type: 'number' },
        { key: 'descripcion', label: 'Descripción', multiline: true },
      ]}
      emptyForm={{ nombrePromocion: '', descuentoPorcentaje: '', descuentoMonetario: '', descripcion: '' }}
      toFormState={(p) => ({
        nombrePromocion: p.nombrePromocion,
        descuentoPorcentaje: p.descuentoPorcentaje?.toString() ?? '',
        descuentoMonetario: p.descuentoMonetario?.toString() ?? '',
        descripcion: p.descripcion ?? '',
      })}
      serialize={(form) => ({
        nombrePromocion: form.nombrePromocion,
        descuentoPorcentaje: numeroOUndefined(form.descuentoPorcentaje),
        descuentoMonetario: numeroOUndefined(form.descuentoMonetario),
        descripcion: form.descripcion || undefined,
      })}
      matchesSearch={(item, texto) => item.nombrePromocion.toLowerCase().includes(texto)}
    />
  )
}

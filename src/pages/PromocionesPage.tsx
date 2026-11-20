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
          key: 'cantidadPromo',
          label: 'Lleva N por',
          render: (p) => (p.cantidadPromo && p.precioPromo ? `${p.cantidadPromo} x ${p.precioPromo.toFixed(2)}` : '—'),
        },
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
        {
          key: 'cantidadPromo',
          label: 'Llevando (cantidad)',
          type: 'number',
          helperText: 'Para promos tipo "2x500": acá va el 2.',
        },
        {
          key: 'precioPromo',
          label: 'Se cobra en total',
          type: 'number',
          helperText: 'Y acá el 500 (el precio por las 2 juntas, no por cada una).',
        },
        { key: 'descuentoPorcentaje', label: 'Descuento (%)', type: 'number' },
        { key: 'descuentoMonetario', label: 'Descuento (monto fijo por unidad)', type: 'number' },
        { key: 'descripcion', label: 'Descripción', multiline: true },
      ]}
      emptyForm={{
        nombrePromocion: '',
        cantidadPromo: '',
        precioPromo: '',
        descuentoPorcentaje: '',
        descuentoMonetario: '',
        descripcion: '',
      }}
      toFormState={(p) => ({
        nombrePromocion: p.nombrePromocion,
        cantidadPromo: p.cantidadPromo?.toString() ?? '',
        precioPromo: p.precioPromo?.toString() ?? '',
        descuentoPorcentaje: p.descuentoPorcentaje?.toString() ?? '',
        descuentoMonetario: p.descuentoMonetario?.toString() ?? '',
        descripcion: p.descripcion ?? '',
      })}
      serialize={(form) => ({
        nombrePromocion: form.nombrePromocion,
        cantidadPromo: numeroOUndefined(form.cantidadPromo),
        precioPromo: numeroOUndefined(form.precioPromo),
        descuentoPorcentaje: numeroOUndefined(form.descuentoPorcentaje),
        descuentoMonetario: numeroOUndefined(form.descuentoMonetario),
        descripcion: form.descripcion || undefined,
      })}
      matchesSearch={(item, texto) => item.nombrePromocion.toLowerCase().includes(texto)}
    />
  )
}

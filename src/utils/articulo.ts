import type { Articulo } from '../types/articulo'

const REEMPLAZOS: Record<string, string> = {
  á: 'a',
  é: 'e',
  í: 'i',
  ó: 'o',
  ú: 'u',
  ñ: 'n',
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .trim()
    .replace(/[áéíóúñ]/g, (letra) => REEMPLAZOS[letra] ?? letra)
}

/**
 * Busca el valor de la característica "Ubicación" del artículo (estante, pasillo,
 * depósito, lo que cada negocio decida) para saber dónde encontrarlo físicamente.
 * No es un campo obligatorio: si el negocio no la carga, devuelve null sin problema.
 */
export function obtenerUbicacion(articulo: Pick<Articulo, 'caracteristicas'>): string | null {
  const encontrada = articulo.caracteristicas.find(
    (c) => normalizar(c.nombreCaracteristica ?? '') === 'ubicacion',
  )
  return encontrada?.valor || null
}

/**
 * Texto corto que identifica una variante (talla, color, etc.) cuando varios artículos
 * comparten el mismo código de barras — ver ConfiguracionEmpresa.PermiteCodigoCompartidoEntreArticulos.
 * Junta el Tamaño con el resto de las características (sin Ubicación, que no hace a la variante
 * en sí, solo a dónde está guardada). Ej: "40 · Azul".
 */
export function resumenVariante(articulo: Pick<Articulo, 'tamano' | 'caracteristicas'>): string {
  const otras = articulo.caracteristicas
    .filter((c) => normalizar(c.nombreCaracteristica ?? '') !== 'ubicacion')
    .map((c) => c.valor)
    .filter(Boolean)
  return [articulo.tamano, ...otras].filter(Boolean).join(' · ')
}

/**
 * Label estándar de un artículo en los buscadores (EntityAutocomplete) de Ventas, Compras,
 * Devolución/Cambio y Ajuste de stock. Con código compartido entre variantes (ver
 * ConfiguracionEmpresa.PermiteCodigoCompartidoEntreArticulos) dos artículos pueden tener el
 * mismo código Y la misma descripción — sin la variante (talla/color) al final, se verían
 * idénticos en el desplegable y no habría forma de saber cuál es cuál.
 */
export function etiquetaArticulo(
  articulo: Pick<Articulo, 'codigo' | 'descripcion' | 'tamano' | 'caracteristicas'>,
  incluirVariante: boolean,
): string {
  const base = `${articulo.codigo} — ${articulo.descripcion ?? ''}`
  if (!incluirVariante) return base
  const variante = resumenVariante(articulo)
  return variante ? `${base} (${variante})` : base
}

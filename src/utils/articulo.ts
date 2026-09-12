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

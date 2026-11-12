#!/usr/bin/env python3
"""Curaduría del catálogo (se puede correr varias veces; es idempotente).

- Marca "hidden": true (con "motivoOculto") a:
    * productos con marcas/personajes licenciados (posibles copias)
    * categorías Coleccionables y Cuadros diamante
    * productos con precio mayor a ₡20.000
  Se pueden reactivar uno por uno desde Admin > Productos (desmarcar "Ocultar").
- Renombra los "Img_2025..." de Joyería acero a "Joya de acero inoxidable N".

Uso:  python3 scripts/curar_catalogo.py      (después de import_catalog.py)
"""
import json, os, re, unicodedata, collections

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(APP, 'public', 'data', 'products.json')

PRECIO_MAX = 20000
CATS_OCULTAS = {'coleccionables': 'categoría Coleccionables', 'cuadros-diamante': 'categoría Cuadros diamante'}

# Palabras (sin tildes, minúscula). \b = palabra completa.
LICENCIAS = [
    r'labubu', r'funko', r'kuromi', r'hello\s*kit+y', r'\bkity\b', r'sanrio', r'stitch', r'pikachu', r'pokemon',
    r'spider\s*-?\s*man', r'batman', r'superman', r'marvel', r'avengers', r'capitan america', r'\bhulk\b', r'iron man',
    r'disney', r'mickey', r'minnie', r'frozen', r'\bcars\b', r'princes\w* sofia', r'paw patrol', r'peppa',
    r'simpson', r'\bbart\b', r'snoopy', r'\bmario\b', r'luigi', r'naruto', r'one piece', r'dragon bal', r'esferas del dragon',
    r'\bgoku\b', r'\bsonic\b', r'demon slayer', r'barbie', r'sonny angel', r'\bcrocs\b',
]
LIC_RE = re.compile('|'.join(LICENCIAS))


def norm(s):
    return unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()


def main():
    ps = json.load(open(PATH, encoding='utf-8'))
    n_joya = 0
    for p in ps:
        # Renombrar fotos sin nombre de Joyería acero
        orig = p.get('nombreOriginal', p['nombre'])
        if p['categoriaId'] == 'joyeria-acero' and re.match(r'img[_ ]?2025', orig, re.I):
            n_joya += 1
            p['nombreOriginal'] = orig
            p['nombre'] = f'Joya de acero inoxidable {n_joya}'

        motivo = None
        m = LIC_RE.search(norm(orig))
        if p['categoriaId'] in CATS_OCULTAS:
            motivo = CATS_OCULTAS[p['categoriaId']]
        elif m:
            motivo = f'marca/personaje licenciado ({m.group(0)})'
        elif p.get('precio') is not None and p['precio'] > PRECIO_MAX:
            motivo = f'precio mayor a ₡{PRECIO_MAX:,}'.replace(',', '.')
        if motivo:
            p['hidden'] = True
            p['motivoOculto'] = motivo
        else:
            p.pop('hidden', None)
            p.pop('motivoOculto', None)

    json.dump(ps, open(PATH, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    vis = [p for p in ps if not p.get('hidden')]
    oc = [p for p in ps if p.get('hidden')]
    print(f'Total bazar: {len(ps)} · visibles: {len(vis)} · ocultos: {len(oc)} · joyas renombradas: {n_joya}')
    c = collections.Counter(p['motivoOculto'].split(' (')[0] for p in oc)
    for k, v in c.most_common():
        print(f'  {v:4d}  {k}')
    print(f'Visibles con precio: {sum(1 for p in vis if p.get("precio") is not None)} · sin precio (consultar): {sum(1 for p in vis if p.get("precio") is None)}')


if __name__ == '__main__':
    main()

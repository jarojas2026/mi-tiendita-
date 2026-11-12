#!/usr/bin/env python3
"""Genera whatsapp/catalogo_meta.csv para Meta Commerce Manager (catálogo de WhatsApp Business).

Solo incluye productos VISIBLES (sin "hidden"), CON precio y CON foto.
Los productos de la finca no entran porque todavía no tienen foto (Meta exige image_link).
Las URLs usan BASE_URL (GitHub Pages). Enlace de producto: BASE_URL + '#/p/<id>' (ruta real de la app).

Uso:  python3 scripts/export_meta_csv.py [--base https://.../]
Nota: los ajustes hechos en el panel de admin (ocultar/precio) viven en el navegador o en Firestore y NO
se reflejan aquí; este CSV sale del catálogo base public/data/products.json.
"""
import argparse, csv, json, os

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser()
ap.add_argument('--base', default='https://jarojas2026.github.io/mi-tiendita-/')
a = ap.parse_args()
BASE = a.base if a.base.endswith('/') else a.base + '/'

ps = json.load(open(os.path.join(APP, 'public', 'data', 'products.json'), encoding='utf-8'))
out = os.path.join(APP, 'whatsapp', 'catalogo_meta.csv')
os.makedirs(os.path.dirname(out), exist_ok=True)
n = 0; sin_foto = 0
with open(out, 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand'])
    for p in ps:
        if p.get('hidden') or p.get('precio') is None or p.get('disponibilidad') == 'Agotado':
            continue
        img = p.get('imagen') or ''
        if not img or not os.path.exists(os.path.join(APP, 'public', img)):
            sin_foto += 1; continue
        bajo = p.get('disponibilidad') == 'Bajo pedido'
        desc = (f"{p['nombre']}. Categoría: {p['categoria']}. "
                + ('Bajo pedido: llega en 3 a 5 días hábiles, requiere 50% de adelanto. ' if bajo else 'Disponible en tienda. ')
                + 'Entrega en Pérez Zeledón (gratis en San Isidro de El General centro) o retiro en Palmital. Pago por SINPE Móvil 8769-2109 o efectivo.')
        w.writerow([p['id'], p['nombre'][:200], desc, 'in stock', 'new', f"{int(p['precio'])} CRC",
                    f"{BASE}#/p/{p['id']}", BASE + img, 'Mi Tiendita Digital'])
        n += 1
print(f'{out}: {n} productos (omitidos sin foto: {sin_foto})')

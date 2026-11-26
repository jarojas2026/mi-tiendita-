#!/usr/bin/env python3
"""Genera el feed CSV para Meta Commerce Manager desde products.json.
Uso: python3 generar_feed.py <ruta products.json> <salida.csv>"""
import csv, json, os, sys
BASE = "https://mi-tiendita-digital-b9835.web.app"
src, out = sys.argv[1], sys.argv[2]
pub = os.path.join(os.path.dirname(src), "..")
prods = json.load(open(src))
rows, skip = [], {"oculto": 0, "sin_precio": 0, "sin_foto": 0}
for p in prods:
    if p.get("hidden"): skip["oculto"] += 1; continue
    if p.get("consultarPrecio") or not p.get("precio"): skip["sin_precio"] += 1; continue
    jpg = f"img/jpg/{p['id']}.jpg"
    if not os.path.exists(os.path.join(pub, jpg)): skip["sin_foto"] += 1; continue
    bajo = "pedido" in (p.get("disponibilidad") or "").lower()
    nombre = p["nombre"].strip()
    desc = f"{nombre}. Categoría: {p.get('categoria','')}. " + (
        "Bajo pedido: llega en 3 a 5 días hábiles con 50% de adelanto. " if bajo else "Disponible en la tienda. ") + \
        "Envío gratis en San Isidro centro y alrededores (jueves y sábado) o retiro gratis en Palmital de Rivas. Pago por SINPE Móvil o efectivo."
    rows.append({"id": p["id"], "title": nombre[:150], "description": desc[:5000],
        "availability": "in stock", "condition": "new", "price": f"{int(p['precio'])} CRC",
        "link": f"{BASE}/#/p/{p['id']}", "image_link": f"{BASE}/{jpg}", "brand": "Mi Tiendita Digital",
        "google_product_category": "", "product_type": p.get("categoria", "")})
with open(out, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
print(len(rows), "productos en el feed; omitidos:", skip)

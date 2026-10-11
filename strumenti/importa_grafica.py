# Importa le immagini di ChatGPT (grafica-chatgpt/) negli asset del gioco.
# - scene a pieno campo  -> assets/scene/<nome>.webp  (larghe 1200, leggere)
# - pezzi su magenta     -> assets/ui/<nome>.webp     (magenta reso trasparente, ritagliate)
# - texture sfondo_*     -> assets/ui/<nome>.webp     (512, senza scontorno)
# Si rilancia a ogni nuovo lotto: rifa' tutto, ci mette pochi secondi.
# Uso: python strumenti/importa_grafica.py
import os, sys
from PIL import Image, ImageChops

RADICE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SORG = os.path.join(RADICE, "grafica-chatgpt")
SCENE = os.path.join(RADICE, "assets", "scene")
UI = os.path.join(RADICE, "assets", "ui")

# cartella -> come trattarla. I concept (04) sono solo riferimento: non entrano nel gioco.
REGOLE = {
    "01_menu": "scena", "02_interfaccia": "pezzo", "03_icone_risorse": "icona",
    "05_mappa": "pezzo", "06_citta": "pezzo", "07_meraviglie": "misto", "08_edifici": "pezzo",
    "09_migliorie": "pezzo", "10_unita": "pezzo", "11_ritratti": "pezzo", "12_stemmi": "pezzo",
    "13_eventi": "scena", "14_gusto": "misto",
}

def scontorna(im):
    """Magenta piatto -> trasparente, con bordo morbido e senza alone rosa."""
    im = im.convert("RGB")
    r, g, b = im.split()
    # "quanto e' magenta": rosso e blu alti, verde basso
    m = ImageChops.subtract(ImageChops.darker(r, b), g)
    # m >= 150 sicuramente fondo, m <= 60 sicuramente soggetto, in mezzo sfumato
    alfa = m.point(lambda v: 0 if v >= 150 else (255 if v <= 60 else int(255 * (150 - v) / 90)))
    # despill: dove il bordo e' semitrasparente, il rosa si porta verso il verde
    # (sui pixel pieni alfa=255 e il colore resta intatto)
    tetto = ImageChops.lighter(g, alfa)
    r2 = ImageChops.darker(r, tetto)
    b2 = ImageChops.darker(b, tetto)
    out = Image.merge("RGBA", (r2, g, b2, alfa))
    box = alfa.point(lambda v: 255 if v > 8 else 0).getbbox()
    return out.crop(box) if box else out

def salva(im, dest, lato, qualita=82):
    im.thumbnail((lato, lato), Image.LANCZOS)
    im.save(dest, "WEBP", quality=qualita, method=6)

def main():
    os.makedirs(SCENE, exist_ok=True); os.makedirs(UI, exist_ok=True)
    fatti = 0
    for cart, regola in REGOLE.items():
        d = os.path.join(SORG, cart)
        if not os.path.isdir(d): continue
        for f in sorted(os.listdir(d)):
            if not f.lower().endswith((".png", ".jpg", ".jpeg", ".webp")): continue
            nome = os.path.splitext(f)[0]
            im = Image.open(os.path.join(d, f))
            tipo = regola
            if regola == "misto":   # nelle sezioni miste le scene sono le immagini orizzontali
                tipo = "scena" if im.width > im.height else "pezzo"
            if tipo == "scena":
                salva(im.convert("RGB"), os.path.join(SCENE, nome + ".webp"), 1200, 80)
            elif nome.startswith("sfondo_"):
                salva(im.convert("RGB"), os.path.join(UI, nome + ".webp"), 512, 80)
            else:
                salva(scontorna(im), os.path.join(UI, nome + ".webp"), 160 if tipo == "icona" else 640)
            fatti += 1
    print("importate", fatti)

if __name__ == "__main__":
    main()

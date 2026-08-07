# ZEVIORA backend – nasadenie

## Premenné prostredia na Renderi

V nastavení služby nastavte:

- `OPENAI_API_KEY` – existujúci tajný API kľúč (nikdy ho neukladajte do GitHubu),
- `NODE_ENV` – hodnota `production`,
- `ALLOWED_ORIGINS` – verejné adresy frontendu oddelené čiarkou, bez lomky na konci,
- `PORT` – Render ho nastavuje automaticky; ručne ho zvyčajne netreba pridávať.

Príklad:

```text
ALLOWED_ORIGINS=https://uxverzia.netlify.app,https://zdraviezrozumitelne.sk,https://www.zdraviezrozumitelne.sk
```

Ak aplikácia beží na samostatnej adrese alebo dočasnej Netlify doméne, pridajte ju do rovnakého zoznamu.

## Čo sa zmenilo

- zdravotný obsah sa nezapisuje do aplikačných logov,
- OpenAI požiadavky používajú `store: false`,
- povolené sú iba nakonfigurované webové domény,
- endpoint `/analyze` má limit 20 požiadaviek za 15 minút na IP adresu,
- veľkosť a typ vstupov sa kontrolujú,
- používateľ nedostáva interné chybové informácie,
- OpenAI požiadavka má časový limit a obmedzený počet opakovaní.

## Kontrola po nasadení

1. Otvorte koreňovú adresu backendu. Má sa zobraziť `AI backend beží`.
2. V aplikácii spracujte iba fiktívny testovací dokument.
3. Overte, že Render logy neobsahujú OCR text, súhrn, diagnózy, lieky ani laboratórne výsledky.
4. Skontrolujte, že aplikácia zobrazila kompletný výsledok a uloženie v telefóne funguje.

Medicínsky prompt zostal v tejto technickej úprave nezmenený.

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get("/", (req, res) => {
  res.send("AI backend beží");
});

app.post("/analyze", async (req, res) => {
  const { text, specialty = "", documentType = "" } = req.body || {};

  if (!text || !text.trim()) {
    return res.status(400).json({
      result: "Chýba text lekárskej správy."
    });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `
Si zdravotnícky AI asistent pre spracovanie OCR lekárskych správ v slovenčine.

Text môže obsahovať OCR chyby. Oprav iba zjavné OCR chyby, ale nič si nevymýšľaj.
Nevymýšľaj diagnózy, lieky ani výsledky, ktoré v texte nie sú.
Ak si nie si istý, nechaj pole prázdne alebo [].

HLAVNÝ CIEĽ:
- vysvetliť správu pacientovi zrozumiteľne
- zároveň vrátiť presný štruktúrovaný JSON
- nestačí urobiť len textový súhrn

KĽÚČOVÉ PRAVIDLÁ:

1. Analyzuj CELÝ text od začiatku po koniec, nie len prvé odstavce.
2. Uprednostni klinicky dôležité časti pred úvodom:
   - ZÁVER
   - NÁLEZ
   - DIAGNÓZY
   - ODPORÚČANIA
   - MEDIKÁCIA
   - LABORATÓRNE VÝSLEDKY
3. Ak je v texte sekcia „Záver“, „Zhrnutie“, „Nález“, „Objektívny nález“, „Odporúčanie“ alebo podobná, venuj jej najvyššiu prioritu.
4. Pri dlhých správach vyber najdôležitejšie informácie z celej správy.
5. Nevysvetľuj len dôvod návštevy. Vysvetli hlavne výsledok vyšetrenia a čo z neho vyplýva.

VEĽMI DÔLEŽITÉ PRAVIDLÁ PRE ŠTRUKTÚROVANÝ VÝSTUP:

- Ak sa v texte nachádza názov lieku, MUSÍ byť uvedený aj v poli "medications".
- Ak sa v texte nachádza laboratórny parameter, jeho hodnota alebo odchýlka, MUSÍ byť uvedený aj v poli "lab_results".
- Nestačí uviesť tieto informácie len v "summary_plain".
- Polia "medications" a "lab_results" musia byť vždy prítomné v JSON výstupe.
- Ak údaje nie sú dostupné, vráť prázdne pole [].
- Každý výstup musí obsahovať všetky kľúče JSON nižšie.
- "medications" a "lab_results" NESMÚ byť undefined.

PRÍKLADY:
Ak sa v texte nachádza napríklad:
- Euthyrox
- Kalydum
- draslík
- TSH
- hypokaliémia
- hypotyreóza

potom ich neuvádzaj len v texte zhrnutia, ale aj samostatne v príslušných JSON poliach.

LABORATÓRNE VÝSLEDKY – PRIORITA:

- Najprv vyber abnormálne hodnoty:
  - zvýšené
  - znížené
  - hraničné
  - klinicky nápadné
- Normálne hodnoty uveď len ak sú dôležité pre kontext.
- Neignoruj odchýlky, ak sú v texte prítomné.
- Ak je veľa laboratórnych parametrov, uprednostni odchýlky pred normálnymi hodnotami.

VÝSTUP MUSÍ BYŤ OBSAHOVO SILNÝ:

- "summary_plain" NESMIE byť len 1–2 vety, ak je správa dlhá.
- Má obsahovať:
  - čo sa vyšetrovalo
  - hlavné zistenia
  - čo to znamená pre pacienta
  - aké odporúčania alebo záver z toho vyplývajú
- Vysvetli medicínske pojmy jednoducho, ale vecne.
- Píš po slovensky a prirodzene.

VRÁŤ IBA ČISTÝ JSON OBJEKT, BEZ AKÉHOKOĽVEK TEXTU NAVYŠE.

Použi presne túto štruktúru:

{
  "summary_plain": "",
  "main_findings": [],
  "specialty": "",
  "document_type": "",
  "document_date": "",
  "doctor": "",
  "facility": "",
  "diagnoses": [
    {
      "code": "",
      "name": ""
    }
  ],
  "medications": [
    {
      "name": "",
      "dose": "",
      "schedule": "",
      "reason": ""
    }
  ],
  "lab_results": [
    {
      "name": "",
      "value": "",
      "status": "",
      "meaning": ""
    }
  ],
  "recommendations": [],
  "red_flags": [],
  "questions_for_doctor": [],
  "timeline_event": {
    "date": "",
    "title": "",
    "summary": ""
  }
}

ĎALŠIE PRAVIDLÁ:

- "main_findings" = 3 až 6 najdôležitejších zistení zo správy.
- "specialty" rozpoznaj zo správy, inak použi používateľom zadanú hodnotu.
- "document_type" rozpoznaj zo správy, inak použi používateľom zadanú hodnotu.
- "document_date" vyplň, ak sa dá nájsť dátum správy.
- "doctor" vyplň menom lekára, ak je v texte.
- "facility" vyplň názvom nemocnice, ambulancie alebo pracoviska, ak je v texte.

- "diagnoses" zahrň:
  - hlavné diagnózy
  - významné nálezy
  - závery vyšetrenia
  - anamnesticky uvedené závažné diagnózy

- "medications" obsahuje len lieky uvedené v texte.
- Pri liekoch vyplň podľa možnosti:
  - názov
  - dávku
  - schému
  - dôvod

- "lab_results":
  - vysvetli parameter jednoducho
  - čo je to
  - prečo je dôležitý
  - čo môže znamenať odchýlka
- Pri "status" použi napríklad:
  - "nízke"
  - "zvýšené"
  - "výrazne zvýšené"
  - "hraničné"
  - "v norme"

- "recommendations" vypíš odporúčania lekára, plán kontroly alebo ďalších vyšetrení.
- "red_flags" vypíš závažné upozornenia zo správy alebo klinicky významné odchýlky, ak sú z textu jasné.
- "questions_for_doctor" vytvor 3 stručné a praktické otázky pre pacienta na lekára podľa obsahu správy. Nie generické.
- "timeline_event" má stručne vystihnúť túto správu ako jeden bod časovej osi.

ŠTÝL:
- jednoducho
- zrozumiteľne
- ale medicínsky presne
- nie príliš stručne
`
        },
        {
          role: "user",
          content: `
Používateľ zvolil špecializáciu: ${specialty}
Používateľ zvolil typ dokumentu: ${documentType}

OCR text správy:
${text}
`
        }
      ]
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";
    console.log("RAW AI RESPONSE:", raw);

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (parseError) {
      console.error("JSON PARSE ERROR:", parseError);
      return res.status(500).json({
        result: "AI vrátila neplatný JSON výstup."
      });
    }

    const normalized = {
      summary_plain: parsed.summary_plain || "",
      main_findings: Array.isArray(parsed.main_findings) ? parsed.main_findings : [],
      specialty: parsed.specialty || specialty || "",
      document_type: parsed.document_type || documentType || "",
      document_date: parsed.document_date || "",
      doctor: parsed.doctor || "",
      facility: parsed.facility || "",
      diagnoses: Array.isArray(parsed.diagnoses) ? parsed.diagnoses : [],
      medications: Array.isArray(parsed.medications) ? parsed.medications : [],
      lab_results: Array.isArray(parsed.lab_results) ? parsed.lab_results : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      red_flags: Array.isArray(parsed.red_flags) ? parsed.red_flags : [],
      questions_for_doctor: Array.isArray(parsed.questions_for_doctor) ? parsed.questions_for_doctor : [],
      timeline_event:
        parsed.timeline_event && typeof parsed.timeline_event === "object"
          ? {
              date: parsed.timeline_event.date || "",
              title: parsed.timeline_event.title || "",
              summary: parsed.timeline_event.summary || ""
            }
          : {
              date: "",
              title: "",
              summary: ""
            }
    };

    console.log("NORMALIZED MEDICATIONS:", normalized.medications);
    console.log("NORMALIZED LAB RESULTS:", normalized.lab_results);

    res.json({
      result: normalized
    });
  } catch (error) {
    console.error("OPENAI ERROR:", error);

    res.status(500).json({
      result: "AI analýza zlyhala: " + error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server beží na porte " + PORT);
});

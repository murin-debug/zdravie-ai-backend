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
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({
      result: "Chýba text lekárskej správy."
    });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `
Si lekársky AI asistent.

Tvoj cieľ:
- vysvetliť správu ZROZUMITEĽNE pacientovi
- nie stručne, ale kvalitne
- vysvetli čo sa zistilo a čo to znamená

Pravidlá:
- píš prirodzene, nie bodovo
- vysvetli medicínske pojmy
- uveď hlavné zistenia
- vysvetli dôsledky pre pacienta
- uveď odporúčania

Výstup:
- 5 až 10 viet
- plynulý text
`
        },
        {
          role: "user",
          content: text
        }
      ]
    });

    const result = completion.choices[0].message.content;

    res.json({
      result: {
        summary_plain: result
      }
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      result: "AI analýza zlyhala: " + error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server beží na porte " + PORT);
});

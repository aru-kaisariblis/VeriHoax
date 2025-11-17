import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const app = express();

if (!process.env.GROQ_API_KEY) {
    console.error("❌ ERROR: GROQ_API_KEY belum diisi di .env");
    process.exit(1);
}

app.use(cors({ origin: '*', methods: ['GET', 'POST'] })); 
app.use(express.json());

app.post('/api/analyze', async (req, res) => {
  const { claim } = req.body;
  if (!claim) return res.status(400).json({ error: 'Klaim kosong' });

  console.log(`\n📩 [TEST MODE] Menerima Klaim: "${claim}"`);

  try {
    console.log('⚡ Menghubungi Groq (Llama 3.3)...');
    
    const apiKey = process.env.GROQ_API_KEY;
    const url = "https://api.groq.com/openai/v1/chat/completions";

    const systemPrompt = `Anda adalah AI pendeteksi hoaks.
    Tugas: Analisis klaim "${claim}".
    ATURAN WAJIB: Output HANYA JSON valid format ini:
    {
      "skor": (angka 0-100),
      "ringkasan": "satu kalimat pendek",
      "analisis": "penjelasan singkat"
    }`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: "Anda adalah mesin output JSON." },
                { role: "user", content: systemPrompt }
            ],
            response_format: { type: "json_object" }
        })
    });

    if (!response.ok) {
        const errData = await response.text();
        throw new Error(`Groq API Error: ${errData}`);
    }

    const data = await response.json();
    const rawText = data.choices[0].message.content;
    console.log("📝 Respon AI:", rawText);

    const aiData = JSON.parse(rawText);
    console.log(`✅ AI Berhasil! Skor: ${aiData.skor}`);

    console.log('🚧 Blockchain dimatikan sementara untuk testing...');
    
    const fakeHash = "0x_MODE_TESTING_TANPA_BLOCKCHAIN_" + Date.now();

    res.json({ 
        success: true, 
        analysisData: aiData, 
        txHash: fakeHash
    });

  } catch (error) {
    console.error("❌ ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server TEST MODE (Tanpa Blockchain) berjalan di http://localhost:${PORT}`);
});

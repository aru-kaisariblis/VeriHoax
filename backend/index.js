import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import Groq from 'groq-sdk'; // untuk memanggil groq

dotenv.config();
const app = express();

if (!process.env.GROQ_API_KEY || !process.env.TAVILY_API_KEY) {
    console.error("ERROR: Pastikan GROQ_API_KEY dan TAVILY_API_KEY ada di .env");
    process.exit(1);
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

async function searchInternet(query) {
    try {
        console.log(`🔎 Searching Tavily: "${query}"...`);
        const response = await axios.post('https://api.tavily.com/search', {
            api_key: process.env.TAVILY_API_KEY,
            query: query,
            search_depth: "basic",
            include_answer: true,
            max_results: 5
        });
        
        if (!response.data.results) return { text: "", sources: [] };
        
        return {
            text: response.data.results.map(r => `- ${r.title}: ${r.content}`).join("\n"),
            sources: response.data.results.map(r => ({ title: r.title, url: r.url }))
        };
    } catch (error) {
        console.error("⚠️ Search Error:", error.message);
        return { text: "", sources: [] };
    }
}

app.post('/api/analyze', async (req, res) => {
    const { claim } = req.body;

    if (!claim) return res.status(400).json({ error: 'Input klaim kosong!' });

    try {
        console.log(`\n📩 Input: "${claim}"`);

        const searchData = await searchInternet(claim);

        const systemPrompt = `
        Anda adalah VeriHoax, AI Fact-Checker yang kritis, netral, dan berbasis data.
        Tugas: Analisis kebenaran klaim pengguna berdasarkan DATA INTERNET yang diberikan.
        
        ATURAN OUTPUT (WAJIB JSON):
        - Output HANYA JSON valid. Jangan ada teks pembuka/penutup.
        - Format: 
        {
            "skor": (0-100), 
            "ringkasan": "Kesimpulan 1 kalimat padat", 
            "analisis": "Penjelasan detail 2-3 paragraf"
        }
        - Skor 0-20: Hoax/Salah.
        - Skor 40-60: Belum terbukti/Meragukan/Konteks Salah.
        - Skor 80-100: Fakta/Benar.
        `;

        const userPrompt = `
        KLAIM: "${claim}"
        
        DATA INTERNET (Gunakan ini sebagai acuan utama):
        ${searchData.text ? searchData.text : "Tidak ada data internet spesifik, gunakan pengetahuan umum Anda namun beri peringatan."}
        `;

        console.log('⚡ Mengirim ke Groq (Llama 3.3)...');
        
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: "llama-3.3-70b-versatile", 
            temperature: 0.5,
            max_tokens: 1024,
            response_format: { type: "json_object" } 
        });

        const aiResponse = completion.choices[0].message.content;
        const aiData = JSON.parse(aiResponse);

        aiData.sources = searchData.sources;

        console.log("Sukses!");

        res.json({
            success: true,
            analysisData: aiData
        });

    } catch (error) {
        console.error("SERVER ERROR:", error);
        res.status(500).json({ error: "Terjadi kesalahan pada Groq/Server." });
    }
});

const PORT = 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`VeriHoax telah berjalan di port ${PORT}`);
});
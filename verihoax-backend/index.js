import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import Groq from 'groq-sdk';
import axios from 'axios';

dotenv.config();
const app = express();

// Gunakan memoryStorage agar lebih cepat (tidak perlu hapus file manual)
const upload = multer({ storage: multer.memoryStorage() });

// Validasi API Key
if (!process.env.GROQ_API_KEY || !process.env.TAVILY_API_KEY) {
    console.error("❌ ERROR: Pastikan GROQ_API_KEY dan TAVILY_API_KEY ada di .env");
    process.exit(1);
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

// --- FUNGSI SEARCH TAVILY (INTERNET) ---
async function searchInternet(query) {
    try {
        console.log(`🔎 Searching Tavily: "${query}"...`);
        const response = await axios.post('https://api.tavily.com/search', {
            api_key: process.env.TAVILY_API_KEY,
            query: query,
            search_depth: "basic",
            include_answer: true,
            max_results: 3 
        });
        
        if (!response.data.results) return { text: "", sources: [] };
        
        // PERBAIKAN 1: Ambil Title DAN URL (Bukan URL saja)
        // Agar frontend bisa menampilkan judul beritanya
        const sources = response.data.results.map(r => ({
            title: r.title,
            url: r.url
        }));

        const text = response.data.results
            .map(r => `- ${r.title}: ${r.content}`)
            .join("\n");

        return { text, sources };

    } catch (error) {
        console.error("⚠️ Search Error (Skip):", error.message);
        return { text: "", sources: [] };
    }
}

app.post('/api/analyze', upload.single('media'), async (req, res) => {
    const { claim } = req.body;
    const file = req.file; // Karena memoryStorage, file ada di buffer, bukan path

    if (!claim && !file) return res.status(400).json({ error: 'Input kosong!' });

    console.log(`\n📩 Input: "${claim || 'Tanpa Teks'}" | File: ${file ? file.originalname : 'No'}`);

    try {
        // 1. Tentukan Query
        let query = claim;
        if (!query && file) query = file.originalname;
        
        // 2. Search Internet (CUKUP SEKALI SAJA DI SINI)
        let searchData = { text: "", sources: [] };
        if (query) {
            searchData = await searchInternet(query);
        }

        // 3. Siapkan Prompt
        const systemPrompt = `
        Anda adalah VeriHoax, AI Fact-Checker.
        Tugas: Analisis kebenaran klaim berdasarkan DATA INTERNET yang disediakan.
        
        OUTPUT WAJIB JSON (tanpa markdown):
        {
            "skor": (0-100), 
            "ringkasan": "Kesimpulan 1 kalimat", 
            "analisis": "Penjelasan detail 2 paragraf"
        }
        `;

        let userPrompt = `
        KLAIM PENGGUNA: "${query}"
        
        DATA FAKTA DARI INTERNET:
        ${searchData.text ? searchData.text : 'Tidak ada data spesifik.'}
        `;

        if (file) {
            userPrompt += `\n[INFO]: User mengupload file "${file.originalname}".`;
        }

        // 4. Kirim ke Groq
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

        // PERBAIKAN 2: Masukkan sources ke dalam object utama
        // Agar frontend JavaScript kamu (aiRes.sources) bisa membacanya
        aiData.sources = searchData.sources;

        res.json({
            success: true,
            analysisData: aiData,
            txHash: "0x_VERIHOAX_" + Date.now()
        });

    } catch (error) {
        console.error("❌ SERVER ERROR:", error);
        res.status(500).json({ error: "Terjadi kesalahan pada server AI." });
    }
});

const PORT = 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 VeriHoax Backend aktif di port ${PORT}`);
});
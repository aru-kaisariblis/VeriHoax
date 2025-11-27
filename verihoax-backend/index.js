import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import Groq from 'groq-sdk';
import axios from 'axios';

dotenv.config();
const app = express();
const upload = multer({ dest: 'uploads/' });
 
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
            max_results: 5//key
        });
        
        if (!response.data.results) return { text: "", sources: [] }; //key
        const sources = response.data.results.map(r => r.url);
        const text = response.data.results
            .map(r => `- ${r.title}: ${r.content}`)
            .join("\n");

        return { text, sources };
        //key dri 37-42
        //return response.data.results.map(r => `- ${r.title} (${r.url}): ${r.content}`).join("\n");
    } catch (error) {
        console.error("⚠️ Search Error (Skip):", error.message);
        return { text: "", sources: [] }; //key
    }
}

app.post('/api/analyze', upload.single('media'), async (req, res) => {
    const { claim } = req.body;
    const file = req.file;

    // Validasi input
    if (!claim && !file) return res.status(400).json({ error: 'Input kosong!' });

    console.log(`\n📩 Input: "${claim || 'Tanpa Teks'}" | File: ${file ? file.originalname : 'No'}`);

    try {
        // 1. Tentukan apa yang mau dicari di internet
        // Jika user upload file "ufo_monas.jpg" tapi tidak kasih teks, kita pakai nama file untuk searching
        let query = claim;
        if (!query && file) query = file.originalname;
        
        let searchContext = "";
        if (query) {
            searchContext = await searchInternet(query);
        }

        // 2. Siapkan Prompt untuk Llama 3.3
        // Kita jujur ke AI: "User upload file, tapi kamu model teks, jadi analisis berdasarkan konteks nama file dan internet saja."
        
        const systemPrompt = `
        Anda adalah VeriHoax, AI Fact-Checker yang kritis dan logis.
        Tugas: Analisis kebenaran klaim berdasarkan DATA INTERNET yang disediakan.
        
        ATURAN OUTPUT:
        - Output HANYA JSON valid (tanpa markdown).
        - Format: {"skor": (0-100), "ringkasan": "...", "analisis": "..."}
        `;

        let searchData = { text: "", sources: [] };
        if (query) searchData = await searchInternet(query);

        let userPrompt = `
        KLAIM PENGGUNA: "${claim ? claim : 'Cek kebenaran hal ini'}"
        
        DATA FAKTA DARI INTERNET:
        ${searchData.text ? searchData.text : 'Tidak ada data khusus ditemukan.'}
        `; //key 83-91

        if (file) {
            userPrompt += `\n[INFO SISTEM]: Pengguna melampirkan file bukti bernama "${file.originalname}". Karena server Vision sedang maintenance, analisis difokuskan pada klaim teks dan pencarian fakta di internet. Jika nama file mencurigakan, masukkan dalam pertimbangan.`;
        }

        // 3. Kirim ke Groq (Llama 3.3 70B - Text Only)
        console.log('⚡ Mengirim ke Groq (Llama 3.3)...');
        
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: "llama-3.3-70b-versatile", // Model ini SANGAT stabil & pintar
            temperature: 0.5,
            max_tokens: 1024,
            response_format: { type: "json_object" }
        });

        const aiResponse = completion.choices[0].message.content;
        console.log("📝 Output AI:", aiResponse);
        
        const aiData = JSON.parse(aiResponse);

        // Bersihkan file temp
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);

        res.json({
            success: true,
            analysisData: aiData,
            sources: searchData.sources,
            txHash: "0x_GROQ_L3_VERIFIED_" + Date.now()
        }); //key API 119-124


    } catch (error) {
        console.error("❌ SERVER ERROR:", error);
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        res.status(500).json({ error: "Terjadi kesalahan pada server AI." });
    }
});

const PORT = 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 VeriHoax (Groq Llama 3.3 Stable) aktif di port ${PORT}`);
});
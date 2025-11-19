import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer'; // Import multer untuk handle file
import fs from 'fs';

dotenv.config();
const app = express();

// Konfigurasi upload (simpan sementara di folder 'uploads')
const upload = multer({ dest: 'uploads/' });

if (!process.env.GROQ_API_KEY) {
    console.error("❌ ERROR: GROQ_API_KEY belum diisi di .env");
    process.exit(1);
}

app.use(cors({ origin: '*', methods: ['GET', 'POST'] })); 
// Kita tidak butuh express.json() di route ini karena pakai FormData, tapi biarkan untuk route lain jika ada.
app.use(express.json());

// Tambahkan middleware 'upload.single' untuk menerima 1 file bernama 'media'
app.post('/api/analyze', upload.single('media'), async (req, res) => {
  
  // Ambil text dari body, dan file info dari req.file
  const { claim } = req.body; 
  const file = req.file;

  // Validasi minimal ada salah satu (text atau file)
  if (!claim && !file) return res.status(400).json({ error: 'Mohon masukkan teks klaim atau upload bukti gambar/video.' });

  let logMessage = `\n📩 [TEST MODE] Menerima Input:`;
  if (claim) logMessage += `\n   - Teks: "${claim}"`;
  if (file) logMessage += `\n   - File: ${file.originalname} (${file.mimetype})`;
  console.log(logMessage);

  try {
    console.log('⚡ Menghubungi Groq (Llama 3.3)...');
    
    const apiKey = process.env.GROQ_API_KEY;
    const url = "https://api.groq.com/openai/v1/chat/completions";

    // KITA MODIFIKASI PROMPT UNTUK MENYADARI ADANYA FILE (Simulasi Context)
    // Catatan: Llama 3.3 via Groq saat ini text-based. 
    // Di masa depan, kamu bisa kirim gambar ke Vision API (seperti GPT-4o atau Llava).
    // Di sini kita memberitahu AI bahwa user melampirkan file bukti.
    
    let contextInfo = "";
    if (file) {
        contextInfo = `[INFO: Pengguna juga melampirkan file bukti bernama "${file.originalname}". Karena Anda adalah model teks, asumsikan file tersebut relevan dengan klaim pengguna.]`;
    }

    const systemPrompt = `Anda adalah AI pendeteksi hoaks yang kritis.
    Tugas: Analisis klaim berikut: "${claim}". ${contextInfo}
    
    ATURAN WAJIB: 
    1. Output HANYA JSON valid.
    2. Jangan ada teks pengantar.
    Format JSON:
    {
      "skor": (angka 0-100, makin tinggi makin PERCAYA itu FAKTA),
      "ringkasan": "satu kalimat pendek yang padat",
      "analisis": "penjelasan singkat 2-3 kalimat mengenai kebenaran klaim"
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

    // Hapus file sementara setelah diproses agar tidak menuhin server
    if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
    }

    console.log('🚧 Blockchain dimatikan sementara untuk testing...');
    const fakeHash = "0x_BUKTI_FILE_DAN_TEKS_TERCATAT_" + Date.now();

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
  console.log(`🚀 Server VeriHoax berjalan di http://localhost:${PORT}`);
});
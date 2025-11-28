
# VeriHoax 🛡️
<img width="1470" height="956" alt="Screenshot 2025-11-29 at 00 33 36" src="https://github.com/user-attachments/assets/14006242-439f-4a6e-9e9f-875b5b0479a8" />
 - AI Fact Checker


**VeriHoax** adalah aplikasi pendeteksi berita bohong (hoax) berbasis Artificial Intelligence. Aplikasi ini menggunakan **Llama 3.3** via Groq untuk menganalisis klaim, serta **Tavily API** untuk mencari rujukan fakta terkini dari internet secara real-time.

> "Memerangi disinformasi dengan kecepatan AI dan validitas data internet."

## Fitur Unggulan

* 🚀 **Analisis Cepat**: Menggunakan Groq SDK untuk inferensi AI super cepat.
* 🌐 **Real-Time Fact Check**: Terintegrasi dengan Tavily Search API untuk mencari berita terbaru.
* 🔍 **Berbasis Fakta**: Menyertakan sumber/link rujukan valid yang bisa diklik.
* 🎨 **Modern UI**: Antarmuka Glassmorphism yang responsif menggunakan Tailwind CSS.

## 🛠️ Tech Stack

**Frontend:**
* HTML5 & JavaScript (Vanilla)
* Tailwind CSS (CDN)

**Backend:**
* Node.js & Express.js
* Groq SDK (LLM Llama 3.3)
* Axios (HTTP Client)
* Multer (File Handling)

## ⚙️ Cara Menjalankan (Instalasi)

Ikuti langkah ini untuk menjalankan project di komputer lokal:

**1. Clone Repository**
```bash
https://github.com/aru-kaisariblis/VeriHoax
cd VeriHoax
```


**2. Install Dependencies Pastikan kamu ada di folder backend (jika dipisah) atau root folder.**
```bash
npm install
```


**3. Konfigurasi Environment Variable Buat file .env di folder root, lalu isi dengan API Key kamu:**
```bash
GROQ_API_KEY=gsk_ur8... (Dapatkan di console.groq.com)
TAVILY_API_KEY=tvly-... (Dapatkan di tavily.com)
```


**4. Jalankan Server**
```bash
node index.js
```


**5. Buka Aplikasi Buka file index.html di browser kamu, atau gunakan Live Server.**

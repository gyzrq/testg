const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public'))); 

// 添加根路由处理
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/chat', async (req, res) => {
    try {
        const { message, image } = req.body;

        if (!message && !image) {
            return res.status(400).json({ error: 'Message or image is required' });
        }

        let model;
        let promptParts = [];
        const textPart = { text: message || "" };

        if (image) {
            console.log("Image received, using gemini-pro-vision model.");
            model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
            const imagePart = { inlineData: { mimeType: image.mimeType, data: image.data } };
            promptParts = [textPart, imagePart];
        } else {
            console.log("No image, using gemini-pro model.");
            model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
            promptParts = [textPart];
        }
        
        const result = await model.generateContentStream({
            contents: [{ role: "user", parts: promptParts }],
            generationConfig: { maxOutputTokens: 8192 },
        });
        
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
        }
        res.end();
    } catch (error) {
        console.error("Error in /chat endpoint:", error);
        res.status(500).end('Internal Server Error');
    }
});

// 导出app供Vercel使用
module.exports = app;

// 本地开发时启动服务器
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

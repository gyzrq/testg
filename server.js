// server.js
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai'); // 引入 Google Generative AI 库
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(cors());
app.use(express.static('public'));

// 检查 API 密钥是否已设置
if (!process.env.GEMINI_API_KEY) { // 更改为 GEMINI_API_KEY
    throw new Error("GEMINI_API_KEY is not defined.");
}

// 初始化 Gemini 客户端
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log("Using Gemini Pro model."); // 更新日志信息
        
        // 获取模型实例，这里使用 'gemini-pro'，你也可以根据需要选择其他模型
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        // 发送消息并获取流式响应
        const result = await model.generateContentStream(message);

        // 设置响应头以进行流式传输
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // 流式处理响应并发送给客户端
        for await (const chunk of result.stream) {
            const chunkText = chunk.text(); // 获取文本内容
            if (chunkText) {
                res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
            }
        }
        res.end();
    } catch (error) {
        console.error("Error in /chat endpoint:", error);
        res.status(500).end('Internal Server Error');
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

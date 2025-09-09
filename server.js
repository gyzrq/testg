// server.js
const express = require('express');
const { OpenAI } = require('openai'); // 引入 openai 库
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(cors());
app.use(express.static('public'));

// 检查 API 密钥是否已设置
if (!process.env.CLOUD_API_KEY) {
    throw new Error("CLOUD_API_KEY is not defined.");
}

// 初始化 OpenAI 客户端，指定你提供的 API 网址和密钥
const openai = new OpenAI({
    baseURL: 'https://chat.cloudapi.vip/v1',
    apiKey: process.env.CLOUD_API_KEY,
});

app.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log("Using Claude Sonnet 4 model.");
        
        // 调用 chat completions API
        const stream = await openai.chat.completions.create({
            model: "claude-3-sonnet-20240229", // 替换为你可用的模型名称
            messages: [{ role: "user", content: message }],
            stream: true,
        });

        // 设置响应头以进行流式传输
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // 流式处理响应并发送给客户端
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
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

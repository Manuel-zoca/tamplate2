const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const cors = require("cors");
const QRCode = require("qrcode");
const path = require("path");
const puppeteer = require("puppeteer"); // atualizado para usar corretamente o executablePath

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

let currentQrBase64 = ""; // QR Code atual em base64

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: puppeteer.executablePath(), // corrigido aqui
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
});

// Evento de geração do QR Code
client.on("qr", async (qr) => {
    try {
        currentQrBase64 = await QRCode.toDataURL(qr);
        console.log("📱 Escaneie o QR Code acessando http://localhost:3000/qr");
    } catch (err) {
        console.error("Erro ao gerar QR Code:", err);
    }
});

// Evento quando o cliente estiver pronto
client.on("ready", () => {
    console.log("✅ WhatsApp Bot está pronto e conectado!");
});

// Evento para mensagens recebidas (opcional)
client.on("message", msg => {
    console.log(`📩 Mensagem recebida de ${msg.from}: ${msg.body}`);
});

// Inicializa o cliente
client.initialize();

// Serve arquivos estáticos (caso tenha um frontend)
app.use(express.static(path.join(__dirname, "public")));

// Página inicial simples
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Exibir QR Code no navegador via base64
app.get("/qr", (req, res) => {
    if (currentQrBase64) {
        res.send(`
            <h2>📱 Escaneie o QR Code</h2>
            <img src="${currentQrBase64}" alt="QR Code WhatsApp" />
        `);
    } else {
        res.send("<p>QR Code não gerado ou já autenticado.</p>");
    }
});

// Função auxiliar para intervalo aleatório
function getRandomInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Endpoint para envio de mensagens
app.post("/send", async (req, res) => {
    const { numbers, message } = req.body;

    if (!numbers || !message) {
        return res.status(400).json({ error: "Número e mensagem são obrigatórios!" });
    }

    const messageStatus = [];

    try {
        for (let i = 0; i < numbers.length; i++) {
            const number = numbers[i];
            const formattedNumber = number.includes("@c.us") ? number : `${number}@c.us`;

            await client.sendMessage(formattedNumber, message);
            console.log(`✅ Mensagem enviada para ${number}`);

            messageStatus.push({ number });

            // Aguarda 5 a 8 segundos entre envios
            await new Promise(resolve => setTimeout(resolve, getRandomInterval(5000, 8000)));

            // Aguarda 5 a 8 minutos entre blocos
            if (i < numbers.length - 1) {
                await new Promise(resolve => setTimeout(resolve, getRandomInterval(300000, 480000)));
            }
        }

        res.json({ success: "Mensagens enviadas com sucesso!", status: messageStatus });
    } catch (error) {
        console.error("❌ Erro ao enviar mensagens:", error);
        res.status(500).json({ error: "Erro ao enviar mensagens" });
    }
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${port}`);
});

const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const cors = require("cors");
const QRCode = require("qrcode");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

let currentQrBase64 = ""; // QR Code atual em base64

const client = new Client({
    authStrategy: new LocalAuth(), // mantém sessão local para não precisar escanear sempre
    puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
});

// Evento de geração do QR Code
client.on("qr", async (qr) => {
    try {
        currentQrBase64 = await QRCode.toDataURL(qr);
        console.log("📱 QR Code gerado com sucesso!");
        console.log("🔗 Cole o código abaixo em https://base64.guru/converter/decode/image para escanear:");
        console.log(currentQrBase64);
    } catch (err) {
        console.error("❌ Erro ao gerar QR Code:", err);
    }
});

// Evento quando o cliente estiver pronto
client.on("ready", () => {
    console.log("✅ WhatsApp Bot está pronto e conectado!");
});

// Evento para mensagens recebidas (opcional)
client.on("message", (msg) => {
    console.log(`📩 Mensagem recebida de ${msg.from}: ${msg.body}`);
});

// Inicializa o cliente
client.initialize();

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
            await new Promise((resolve) => setTimeout(resolve, getRandomInterval(5000, 8000)));

            // Aguarda 5 a 8 minutos entre blocos (opcional)
            if (i < numbers.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, getRandomInterval(300000, 480000)));
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
    console.log(`🚀 Servidor rodando na porta ${port}`);
});

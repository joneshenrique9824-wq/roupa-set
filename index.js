import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  Events
} from "discord.js";

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

/* =========================
   CLIENTE DISCORD
========================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* =========================
   VARIÁVEIS .ENV
========================= */
const { TOKEN, CANAL_METAS } = process.env;

if (!TOKEN || !CANAL_METAS) {
  console.log("❌ Falta TOKEN ou CANAL_METAS no .env");
  process.exit(1);
}

/* =========================
   CONFIG META
========================= */
const META_PADRAO = 200;

/* =========================
   ARMAZENAMENTO (MEMÓRIA)
========================= */
const progresso = new Map(); // total por user
const pendentes = new Map(); // controle de envio (número + imagem)

/* =========================
   BOT ONLINE
========================= */
client.once(Events.ClientReady, () => {
  console.log(`🔥 ONLINE: ${client.user.tag}`);
});

/* =========================
   SISTEMA DE METAS
========================= */
client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot) return;
    if (message.channel.id !== CANAL_METAS) return;

    const userId = message.author.id;

    const numeroEncontrado = message.content.match(/\d+/);
    const temNumero = numeroEncontrado !== null;
    const temImagem = message.attachments.size > 0;

    let data = pendentes.get(userId) || {
      numero: null,
      imagem: null
    };

    /* =========================
       SALVA DADOS PARCIAIS
    ========================= */
    if (temNumero) data.numero = parseInt(numeroEncontrado[0]);
    if (temImagem) data.imagem = message.attachments.first().url;

    pendentes.set(userId, data);

    /* =========================
       VALIDAÇÕES
    ========================= */
    if (!data.numero && data.imagem) {
      return message.reply("❌ Envie o número da meta.");
    }

    if (data.numero && !data.imagem) {
      return message.reply("📸 Agora envie a imagem da meta.");
    }

    /* =========================
       REGISTRO FINAL
    ========================= */
    if (data.numero && data.imagem) {

      const atual = (progresso.get(userId) || 0) + data.numero;
      progresso.set(userId, atual);

      const restante = META_PADRAO - atual;

      const embed = new EmbedBuilder()
        .setTitle("📦 Registro de Meta")
        .setImage(data.imagem)
        .addFields(
          {
            name: "Quantidade enviada",
            value: `${data.numero}`,
            inline: true
          },
          {
            name: "Progresso total",
            value: `${atual}/${META_PADRAO}`,
            inline: true
          },
          {
            name: "Falta",
            value: `${restante > 0 ? restante : 0}`,
            inline: true
          }
        )
        .setColor(0x00ff99)
        .setFooter({ text: "Sistema de Metas Ativo" });

      await message.channel.send({ embeds: [embed] });

      pendentes.delete(userId);

      return message.reply(
        `✅ Meta registrada! ${atual}/${META_PADRAO} | Falta: ${restante > 0 ? restante : 0}`
      );
    }

  } catch (err) {
    console.error(err);
    return message.reply("❌ Erro ao processar meta.");
  }
});

/* =========================
   LOGIN BOT
========================= */
client.login(TOKEN);

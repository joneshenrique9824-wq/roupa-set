import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ChannelType,
  PermissionsBitField,
  Events
} from "discord.js";

/* ========================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* ========================= */
const { TOKEN, CANAL_METAS } = process.env;

console.log("🔧 Iniciando...");
console.log("TOKEN:", TOKEN ? "OK" : "ERRO");
console.log("CANAL_METAS:", CANAL_METAS);

if (!TOKEN || !CANAL_METAS) {
  console.log("❌ CONFIG .env incompleta");
  process.exit(1);
}

/* ========================= */
const META_PADRAO = 200;
const CATEGORIA_LOG_ID = "1501326344586526820";
const CARGO_LIDER_ID = "1456655598396510215";

const entregas = new Map();
const pendentes = new Map();

/* ========================= */
async function getCanalLog(guild, user) {
  console.log("📁 Criando/Buscando canal...");

  const categoria = guild.channels.cache.get(CATEGORIA_LOG_ID);
  if (!categoria) {
    console.log("❌ Categoria NÃO encontrada:", CATEGORIA_LOG_ID);
    return null;
  }

  const nome = `log-${user.username}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  let canal = guild.channels.cache.find(
    c => c.name === nome && c.parentId === categoria.id
  );

  if (canal) {
    console.log("✅ Canal já existe");
    return canal;
  }

  console.log("🆕 Criando canal novo...");

  return await guild.channels.create({
    name: nome,
    type: ChannelType.GuildText,
    parent: categoria.id,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      {
        id: user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages
        ]
      },
      {
        id: CARGO_LIDER_ID,
        allow: [PermissionsBitField.Flags.ViewChannel]
      }
    ]
  });
}

/* ========================= */
client.once(Events.ClientReady, () => {
  console.log(`🔥 ONLINE: ${client.user.tag}`);
});

/* ========================= */
client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;

    console.log("📩 MSG:", message.content);

    if (message.channel.id !== CANAL_METAS) {
      console.log("❌ Canal errado:", message.channel.id);
      return;
    }

    console.log("✅ Canal correto");

    const userId = message.author.id;

    const numeroMatch = message.content.match(/\d+/);
    const temNumero = numeroMatch !== null;
    const temImagem = message.attachments.size > 0;

    console.log("🔎 Numero:", temNumero);
    console.log("🖼️ Imagem:", temImagem);

    let data = pendentes.get(userId) || { numero: null, imagem: null };

    if (temNumero) data.numero = parseInt(numeroMatch[0]);
    if (temImagem) data.imagem = message.attachments.first().url;

    pendentes.set(userId, data);

    if (!data.numero && data.imagem) {
      return message.reply("❌ Envie o número");
    }

    if (data.numero && !data.imagem) {
      return message.reply("📸 Envie a imagem");
    }

    if (data.numero && data.imagem) {

      console.log("🚀 Processando entrega...");

      const total = (entregas.get(userId) || 0) + 1;
      entregas.set(userId, total);

      const canalLog = await getCanalLog(message.guild, message.author);

      if (!canalLog) {
        console.log("❌ Falha ao criar canal");
        return message.reply("❌ Erro ao criar canal");
      }

      await canalLog.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("📦 ENTREGA")
            .setImage(data.imagem)
            .addFields(
              { name: "Usuário", value: message.author.username },
              { name: "Quantidade", value: `${data.numero}` },
              { name: "Progresso", value: `${total}/${META_PADRAO}` }
            )
        ]
      });

      pendentes.delete(userId);

      return message.reply(`✅ Registrado (${total}/${META_PADRAO})`);
    }

  } catch (err) {
    console.error("❌ ERRO:", err);
    message.reply("❌ Erro geral");
  }
});

/* ========================= */
client.login(TOKEN).catch(err => {
  console.error("❌ ERRO LOGIN:", err);
});

import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ChannelType,
  PermissionsBitField,
  Events
} from "discord.js";

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* ========================= */
const { TOKEN, CANAL_METAS } = process.env;

if (!TOKEN || !CANAL_METAS) {
  console.log("❌ CONFIG .env incompleta");
  process.exit(1);
}

/* ========================= */
const META_PADRAO = 200;
const CATEGORIA_LOG_ID = "1501326344586526820";
const CARGO_LIDER_ID = "1456655598396510215";

const progresso = new Map();
const pendentes = new Map();

/* ========================= */
async function getCanalLog(guild, user) {
  const categoria = guild.channels.cache.get(CATEGORIA_LOG_ID);
  if (!categoria) return null;

  const nome = `log-${user.username}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  let canal = guild.channels.cache.find(
    c => c.name === nome && c.parentId === categoria.id
  );

  if (canal) return canal;

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
client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot) return;
    if (message.channel.id !== CANAL_METAS) return;

    const userId = message.author.id;

    const numeroMatch = message.content.match(/\d+/);
    const temNumero = numeroMatch !== null;
    const temImagem = message.attachments.size > 0;

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

      const atual = (progresso.get(userId) || 0) + data.numero;
      progresso.set(userId, atual);

      const restante = META_PADRAO - atual;

      const canalLog = await getCanalLog(message.guild, message.author);
      if (!canalLog) return message.reply("❌ Erro ao criar canal");

      await canalLog.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("📦 ENTREGA")
            .setImage(data.imagem)
            .addFields(
              { name: "Quantidade enviada", value: `${data.numero}` },
              { name: "Total feito", value: `${atual}/${META_PADRAO}` },
              { name: "Falta", value: `${restante > 0 ? restante : 0}` }
            )
        ]
      });

      pendentes.delete(userId);

      return message.reply(
        `✅ Registrado: ${atual}/${META_PADRAO} | Falta: ${restante > 0 ? restante : 0}`
      );
    }

  } catch (err) {
    console.error(err);
    message.reply("❌ Erro");
  }
});

/* ========================= */
client.login(TOKEN);

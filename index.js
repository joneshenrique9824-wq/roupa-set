import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
  Events,
  ChannelType
} from "discord.js";

/* =========================
   🤖 BOT
========================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

/* =========================
   🔐 CONFIG
========================= */
const {
  TOKEN,
  CLIENT_ID,
  GUILD_ID,
  CANAL_MASCULINO,
  CANAL_FEMININO
} = process.env;

const CANAL_METAS = "1501326344586526820";

/* =========================
   🎯 METAS
========================= */
const metasPlayer = {};

/* =========================
   📁 CANAL PLAYER
========================= */
async function pegarOuCriarCanalPlayer(guild, user) {
  const nome = `meta-${user.username}`.toLowerCase();

  let canal = guild.channels.cache.find(c => c.name === nome);
  if (canal) return canal;

  return await guild.channels.create({
    name: nome,
    type: ChannelType.GuildText
  });
}

/* =========================
   📜 COMANDOS
========================= */
const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Painel de uniforme"),

  new SlashCommandBuilder()
    .setName("meta")
    .setDescription("Sistema de metas")
];

/* =========================
   🚀 REGISTRO
========================= */
const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once(Events.ClientReady, async () => {
  console.log(`🔥 ONLINE: ${client.user.tag}`);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands.map(c => c.toJSON()) }
  );
});

/* =========================
   🎮 INTERAÇÕES
========================= */
client.on(Events.InteractionCreate, async (interaction) => {

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "painel") {

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("uniforme_btn")
        .setLabel("Registrar Uniforme")
        .setStyle(ButtonStyle.Primary)
    );

    return interaction.reply({
      embeds: [new EmbedBuilder().setTitle("👕 PAINEL DE UNIFORME")],
      components: [row]
    });
  }

  if (interaction.commandName === "meta") {
    return interaction.reply({
      embeds: [
        new EmbedBuilder().setTitle("📸 Envie: 200x minério ou 200 ferro")
      ]
    });
  }

});

/* =========================
   🧾 MODAL UNIFORME
========================= */
client.on(Events.InteractionCreate, async (interaction) => {

  if (interaction.isButton() && interaction.customId === "uniforme_btn") {

    const modal = new ModalBuilder()
      .setCustomId("modal_uniforme")
      .setTitle("Registrar Uniforme");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("nome")
          .setLabel("Nome")
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("codigo")
          .setLabel("Código")
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("tipo")
          .setLabel("Masculino ou Feminino")
          .setStyle(TextInputStyle.Short)
      )
    );

    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === "modal_uniforme") {

    const nome = interaction.fields.getTextInputValue("nome");
    const codigo = interaction.fields.getTextInputValue("codigo");
    const tipo = interaction.fields.getTextInputValue("tipo").toLowerCase();

    const canal = await client.channels.fetch(
      tipo.startsWith("m") ? CANAL_MASCULINO : CANAL_FEMININO
    );

    await canal.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("👕 UNIFORME REGISTRADO")
          .addFields(
            { name: "Nome", value: nome },
            { name: "Código", value: codigo }
          )
      ]
    });

    return interaction.reply({ content: "✅ Enviado!", ephemeral: true });
  }

});

/* =========================
   🎯 SISTEMA DE METAS (SEM IA)
========================= */
client.on("messageCreate", async (message) => {

  if (message.author.bot) return;
  if (message.channel.id !== CANAL_METAS) return;

  const texto = message.content.toLowerCase();

  // pega número de qualquer mensagem
  const match = texto.match(/(\d+)/);

  if (!match) {
    return message.reply("❌ Não detectei número (ex: 200x)");
  }

  const qtd = parseInt(match[1]);
  const id = message.author.id;

  metasPlayer[id] = (metasPlayer[id] || 0) + qtd;

  const canal = await pegarOuCriarCanalPlayer(message.guild, message.author);

  await canal.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("🎯 META REGISTRADA")
        .addFields(
          { name: "Quantidade", value: `${qtd}`, inline: true },
          { name: "Total", value: `${metasPlayer[id]}`, inline: true }
        )
        .setImage(message.attachments.first()?.url || null)
    ]
  });

  message.reply(`✅ Registrado: ${qtd}`);
});

/* ========================= */
client.login(TOKEN);

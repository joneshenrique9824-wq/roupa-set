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
  Events
} from "discord.js";
import vision from "@google-cloud/vision";

/* =========================
   🤖 BOT
========================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
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
  CANAL_FEMININO,
  GOOGLE_CREDENTIALS
} = process.env;

const CANAL_METAS = "1501326344586526820";

/* =========================
   🧠 IA GOOGLE (RAILWAY)
========================= */
const visionClient = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(GOOGLE_CREDENTIALS || "{}")
});

/* =========================
   👥 CARGOS
========================= */
const CARGO_MEMBRO = process.env.CARGO_MEMBRO || "1456655598396510213";
const CARGO_LIDER = process.env.CARGO_LIDER || "1456655598396510215";
const CARGO_GERENTE = process.env.CARGO_GERENTE || "1456655598530723956";

const cargos = {
  LIDERANCA: [],
  GERENTE: [],
  MEMBROS: []
};

/* =========================
   🎯 METAS
========================= */
const metasPlayer = {};
const META_TOTAL = 1000;

/* =========================
   🔒 PERMISSÕES
========================= */
const temPermissao = (interaction) => {
  return (
    interaction.member?.roles?.cache?.has(CARGO_MEMBRO) ||
    interaction.member?.roles?.cache?.has(CARGO_LIDER) ||
    interaction.member?.roles?.cache?.has(CARGO_GERENTE)
  );
};

/* =========================
   🧠 EMBED HIERARQUIA
========================= */
function criarEmbedCargos() {
  const f = (l) => l.length ? l.map(id => `• <@${id}>`).join("\n") : "• (vazio)";
  return new EmbedBuilder().setDescription(`
👑 LIDERANÇA
${f(cargos.LIDERANCA)}

👔 GERENTE
${f(cargos.GERENTE)}

🪖 MEMBROS
${f(cargos.MEMBROS)}
`);
}

/* =========================
   🏗️ CANAL PLAYER
========================= */
async function pegarOuCriarCanalPlayer(guild, user) {
  const nome = `meta-${user.username}`.toLowerCase();
  let canal = guild.channels.cache.find(c => c.name === nome);
  if (canal) return canal;

  return await guild.channels.create({
    name: nome,
    type: 0
  });
}

/* =========================
   📜 COMANDOS
========================= */
const commands = [

  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Painel de uniformes"),

  new SlashCommandBuilder()
    .setName("quadro")
    .setDescription("Hierarquia"),

  new SlashCommandBuilder()
    .setName("addcargo")
    .setDescription("Adicionar cargo")
    .addStringOption(o =>
      o.setName("cargo")
        .setDescription("Cargo")
        .setRequired(true)
    )
    .addUserOption(o =>
      o.setName("pessoa")
        .setDescription("Usuário")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("removercargo")
    .setDescription("Remover cargo")
    .addStringOption(o =>
      o.setName("cargo")
        .setDescription("Cargo")
        .setRequired(true)
    )
    .addUserOption(o =>
      o.setName("pessoa")
        .setDescription("Usuário")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("meta")
    .setDescription("Metas com IA")
];

/* =========================
   🚀 REGISTER
========================= */
const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once(Events.ClientReady, async () => {
  console.log(`🔥 ${client.user.tag}`);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands.map(c => c.toJSON()) }
  );
});

/* =========================
   🎮 INTERAÇÕES
========================= */
client.on(Events.InteractionCreate, async (interaction) => {

  // UNIFORME
  if (interaction.isChatInputCommand() && interaction.commandName === "painel") {

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("uniforme_btn")
        .setLabel("Registrar Uniforme")
        .setStyle(ButtonStyle.Primary)
    );

    return interaction.reply({
      embeds: [new EmbedBuilder().setTitle("👕 UNIFORME")],
      components: [row]
    });
  }

  if (interaction.isButton() && interaction.customId === "uniforme_btn") {

    const modal = new ModalBuilder()
      .setCustomId("modal_uniforme")
      .setTitle("Uniforme");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("nome").setLabel("Nome").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("codigo").setLabel("Código").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("tipo").setLabel("Masculino/Feminino").setStyle(TextInputStyle.Short)
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
          .setTitle("👕 UNIFORME")
          .addFields(
            { name: "Nome", value: nome },
            { name: "Código", value: codigo }
          )
      ]
    });

    return interaction.reply({ content: "✅ Enviado!", ephemeral: true });
  }

  // META
  if (interaction.isChatInputCommand() && interaction.commandName === "meta") {
    return interaction.reply({
      embeds: [new EmbedBuilder().setTitle("🎯 Envie print (ex: 200x)")],
    });
  }

  // HIERARQUIA
  if (interaction.isChatInputCommand() && interaction.commandName === "quadro") {
    return interaction.reply({ embeds: [criarEmbedCargos()] });
  }

});

/* =========================
   📸 IA META
========================= */
client.on("messageCreate", async (message) => {

  if (message.author.bot) return;
  if (message.channel.id !== CANAL_METAS) return;

  const att = message.attachments.first();
  if (!att) return;

  try {
    const [result] = await visionClient.textDetection(att.url);
    const texto = result.fullTextAnnotation?.text?.toLowerCase() || "";

    const match = texto.match(/(\d+)\s*x/);
    if (!match) return message.reply("❌ Não detectei número");

    const qtd = parseInt(match[1]);

    const id = message.author.id;
    metasPlayer[id] = (metasPlayer[id] || 0) + qtd;

    const canal = await pegarOuCriarCanalPlayer(message.guild, message.author);

    await canal.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🧠 META IA")
          .addFields(
            { name: "Quantidade", value: `${qtd}`, inline: true },
            { name: "Total", value: `${metasPlayer[id]}`, inline: true }
          )
          .setImage(att.url)
      ]
    });

    message.reply(`🧠 Detectado: ${qtd}`);
  } catch (err) {
    console.error(err);
    message.reply("❌ erro IA");
  }
});

/* ========================= */
client.login(TOKEN);

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;
  if (message.channel.id !== CANAL_METAS) return;

  const att = message.attachments.first();
  if (!att) return;

  try {

    const [result] = await visionClient.textDetection({
      image: { source: { imageUri: att.url } }
    });

    const texto = result.fullTextAnnotation?.text?.toLowerCase() || "";

    console.log("TEXTO DETECTADO:", texto);

    const match = texto.match(/(\d+)/);

    if (!match) {
      return message.reply("❌ Não detectei número");
    }

    const qtd = parseInt(match[1]);

    const id = message.author.id;
    metasPlayer[id] = (metasPlayer[id] || 0) + qtd;

    const canal = await pegarOuCriarCanalPlayer(message.guild, message.author);

    await canal.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🧠 META DETECTADA")
          .addFields(
            { name: "Quantidade", value: `${qtd}`, inline: true },
            { name: "Total", value: `${metasPlayer[id]}`, inline: true }
          )
          .setImage(att.url)
      ]
    });

    message.reply(`✅ Detectado: ${qtd}`);

  } catch (err) {
    console.error(err);
    message.reply("❌ Erro na IA");
  }

});

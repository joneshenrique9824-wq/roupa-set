import { ChannelType, PermissionsBitField } from "discord.js";
import { config } from "./config.js";

export const metas = {};

export const META_DIARIA = {
  KEVLAR: 30,
  FERRO: 200
};

export function hoje() {
  return new Date().toISOString().split("T")[0];
}

export function initUser(id) {
  if (!metas[id]) {
    metas[id] = {
      data: hoje(),
      kevlar: 0,
      ferro: 0,
      canalId: null
    };
  }

  if (metas[id].data !== hoje()) {
    metas[id].data = hoje();
    metas[id].kevlar = 0;
    metas[id].ferro = 0;
  }
}

export async function criarCanalUsuario(guild, user) {
  const canal = await guild.channels.create({
    name: `meta-${user.username}`.toLowerCase(),
    type: ChannelType.GuildText,
    parent: config.META_CATEGORIA,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      }
    ]
  });

  return canal.id;
}

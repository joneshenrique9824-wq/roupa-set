import "dotenv/config";

export const config = {
  TOKEN: process.env.TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  GUILD_ID: process.env.GUILD_ID,

  CANAL_MASCULINO: process.env.CANAL_MASCULINO,
  CANAL_FEMININO: process.env.CANAL_FEMININO,

  META_CATEGORIA: process.env.META_CATEGORIA,
  META_CANAL: process.env.META_CANAL,

  CARGO_MEMBRO: process.env.CARGO_MEMBRO,
  CARGO_LIDER: process.env.CARGO_LIDER,
  CARGO_GERENTE: process.env.CARGO_GERENTE
};

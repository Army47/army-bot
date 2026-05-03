require('dotenv').config();

console.log("TOKEN:", process.env.TOKEN);

const fs = require('fs');
const path = require('path');
const config = require('./config.json');

// ===== ARCHIVO EVENTOS =====
const eventosPath = path.join(process.cwd(), 'eventos.json');

function cargarEventos() {
  if (!fs.existsSync(eventosPath)) return [];
  return JSON.parse(fs.readFileSync(eventosPath));
}

function guardarEventos(data) {
  fs.writeFileSync(eventosPath, JSON.stringify(data, null, 2));
}

// ===== DISCORD =====
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel, Partials.Message]
});

// ================= EVENTOS =================

const eventos = [
  { hora: "12:30", nombre: "🏆 Torneo 1v1" },
  { hora: "13:00", nombre: "🏆 Torneo bandas (2v2)" },
  { hora: "13:45", nombre: "🎯 Domina (Bandas)" },
  { hora: "14:00", nombre: "🏆 Torneo bandas (3v3)" },
  { hora: "15:00", nombre: "🌪️ Tanda de Tormentas" },
  { hora: "16:00", nombre: "🏆 Torneo bandas (4v4)" },
  { hora: "16:45", nombre: "🎯 Domina (Bandas)" },
  { hora: "17:00", nombre: "🏆 Torneo bandas (5v5)" },
  { hora: "17:45", nombre: "💥 Battle Royale" },
  { hora: "18:00", nombre: "🏆 Torneo 1v1" },
  { hora: "18:35", nombre: "🎯 Domina (Bandas)" },
  { hora: "19:00", nombre: "🎉 Mega Torneo 6v6-10v10" },
  { hora: "20:00", nombre: "💣 Mega Battle Royale" },
  { hora: "20:30", nombre: "🎁 Drop del Día" },
  { hora: "20:45", nombre: "🏆 Torneo bandas (6v6)" },
  { hora: "21:45", nombre: "🏆 Torneo bandas (6v6)" },
  { hora: "22:15", nombre: "🌪️ Tanda de Tormentas" },
  { hora: "23:15", nombre: "🏆 Torneo bandas (5v5)" },
  { hora: "00:05", nombre: "🏆 Torneo 1v1" },
  { hora: "00:35", nombre: "🏆 Torneo bandas (4v4)" },
  { hora: "01:15", nombre: "🏆 Torneo bandas (3v3)" }
];

function iniciarEventos() {
  setInterval(async () => {

    const nowMadrid = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
    const ahoraMs = nowMadrid.getTime();

    const canal = await client.channels.fetch(config.eventos.canalId).catch(() => null);
    if (!canal) return;

    let lista = cargarEventos();

    for (const evento of eventos) {

      const [h, m] = evento.hora.split(":");

      const fechaEvento = new Date(nowMadrid);
      fechaEvento.setHours(parseInt(h));
      fechaEvento.setMinutes(parseInt(m));
      fechaEvento.setSeconds(0);
      fechaEvento.setMilliseconds(0);

      const avisoMs = fechaEvento.getTime() - (2 * 60 * 1000);
      const margen = 60 * 1000;

      let activo = lista.find(e => e.nombre === evento.nombre && e.hora === evento.hora);

      if (ahoraMs >= avisoMs && ahoraMs < avisoMs + margen && !activo) {

        if (evento.nombre.toLowerCase().includes('tormentas')) {

          lista.push({
            nombre: evento.nombre,
            hora: evento.hora,
            tipo: 'tormentas',
            inicio: Date.now(),
            ultimoEnvio: 0
          });

        } else {

          const inicio = new Date(fechaEvento);

          if (inicio.getTime() <= ahoraMs) {
            inicio.setDate(inicio.getDate() + 1);
          }

          const timestamp = Math.floor(inicio.getTime() / 1000);

          const embed = new EmbedBuilder()
            .setTitle(' Evento Programado')
            .setDescription(
`━━━━━━━━━━━━━━━━━━

 **${evento.nombre}**
⏳ Empieza <t:${timestamp}:R>

🌌 Portal activo ahora mismo en barrio

━━━━━━━━━━━━━━━━━━`
            )
            .setColor(0x000000)
            .setFooter({ text: '⚔️ Army Events System' })
            .setTimestamp();

          const msg = await canal.send({
            content: `<@&${config.eventos.rolId}>`,
            embeds: [embed]
          });

          lista.push({
            nombre: evento.nombre,
            hora: evento.hora,
            tipo: 'normal',
            messageId: msg.id,
            channelId: canal.id,
            borrarEn: Date.now() + (15 * 60 * 1000)
          });
        }
      }
    }

    let nuevaLista = [];

    for (let ev of lista) {

      if (ev.tipo === 'tormentas') {

        const tiempo = Date.now() - ev.inicio;
        if (tiempo > 60 * 60 * 1000) continue;

        if (Date.now() - ev.ultimoEnvio >= 5 * 60 * 1000) {

          const embed = new EmbedBuilder()
            .setTitle('🌪️ Tanda de Tormentas')
            .setDescription(
`━━━━━━━━━━━━━━━━━━

 **Tormentas disponibles**
⚔️ Entra y domina la zona

🌌 Portal activo ahora mismo en barrio

━━━━━━━━━━━━━━━━━━`
            )
            .setColor(0x000000)
            .setFooter({ text: '⚔️ Army Events System' })
            .setTimestamp();

          const msg = await canal.send({
            content: `<@&${config.eventos.rolId}>`,
            embeds: [embed]
          });

          nuevaLista.push({
            tipo: 'delete',
            messageId: msg.id,
            channelId: canal.id,
            borrarEn: ev.inicio + (60 * 60 * 1000)
          });

          ev.ultimoEnvio = Date.now();
        }

        nuevaLista.push(ev);
      }

      else if (ev.tipo === 'normal' || ev.tipo === 'delete') {

        if (Date.now() >= ev.borrarEn) {
          try {
            const canal = await client.channels.fetch(ev.channelId);
            const msg = await canal.messages.fetch(ev.messageId);
            await msg.delete().catch(() => {});
          } catch {}
        } else {
          nuevaLista.push(ev);
        }
      }
    }

    guardarEventos(nuevaLista);

  }, 60000);
}

// ================= LOGS =================

async function getLogChannel(guild) {
  return await guild.channels.fetch(config.logs.channelId).catch(() => null);
}

client.on('messageDelete', async (message) => {
  if (!message.guild) return;

  try { if (message.partial) await message.fetch(); } catch {}

  const canal = await getLogChannel(message.guild);
  if (!canal) return;

  const embed = new EmbedBuilder()
    .setTitle('🗑️ Mensaje eliminado')
    .addFields(
      { name: 'Usuario', value: message.author?.tag || "Desconocido", inline: true },
      { name: 'Canal', value: `<#${message.channel.id}>`, inline: true },
      { name: 'Contenido', value: message.content || "Sin texto" }
    )
    .setColor(0xff0000)
    .setTimestamp();

  canal.send({ embeds: [embed] });
});

client.on('messageUpdate', async (oldMsg, newMsg) => {
  if (!newMsg.guild) return;

  try {
    if (oldMsg.partial) await oldMsg.fetch();
    if (newMsg.partial) await newMsg.fetch();
  } catch {}

  if (oldMsg.content === newMsg.content) return;

  const canal = await getLogChannel(newMsg.guild);
  if (!canal) return;

  const embed = new EmbedBuilder()
    .setTitle('✏️ Mensaje editado')
    .addFields(
      { name: 'Usuario', value: newMsg.author?.tag || "Desconocido" },
      { name: 'Antes', value: oldMsg.content || '—' },
      { name: 'Después', value: newMsg.content || '—' }
    )
    .setColor(0xffff00)
    .setTimestamp();

  canal.send({ embeds: [embed] });
});

client.on('guildMemberAdd', async member => {
  const canal = await getLogChannel(member.guild);
  if (!canal) return;
  canal.send(`🟢 **${member.user.tag}** se unió`);
});

client.on('guildMemberRemove', async member => {
  const canal = await getLogChannel(member.guild);
  if (!canal) return;
  canal.send(`🔴 **${member.user.tag}** salió`);
});

// ================= READY =================

client.once('ready', () => {
  console.log(`✅ Bot listo como ${client.user.tag}`);
  iniciarEventos();
});

// ================= LOGIN =================

client.login(process.env.TOKEN);
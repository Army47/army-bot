require('dotenv').config({ path: './.env' });

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
  { hora: "13:30", nombre: "🏆 Torneo 1v1" },
  { hora: "14:00", nombre: "🏆 Torneo bandas (2v2)" },
  { hora: "14:45", nombre: "🎯 Domina (Bandas)" },
  { hora: "15:00", nombre: "🏆 Torneo bandas (3v3)" },
  { hora: "16:00", nombre: "🌪️ Tanda de Tormentas" },
  { hora: "17:00", nombre: "🏆 Torneo bandas (4v4)" },
  { hora: "17:45", nombre: "🎯 Domina (Bandas)" },
  { hora: "18:00", nombre: "🏆 Torneo bandas (5v5)" },
  { hora: "18:45", nombre: "💥 Battle Royale" },
  { hora: "19:00", nombre: "🏆 Torneo 1v1" },
  { hora: "19:35", nombre: "🎯 Domina (Bandas)" },
  { hora: "20:00", nombre: "🎉 Mega Torneo 6v6-10v10" },
  { hora: "21:00", nombre: "💣 Mega Battle Royale" },
  { hora: "21:30", nombre: "🎁 Drop del Día" },
  { hora: "21:45", nombre: "🏆 Torneo bandas (6v6)" },
  { hora: "22:45", nombre: "🏆 Torneo bandas (6v6)" },
  { hora: "23:15", nombre: "🌪️ Tanda de Tormentas" },
  { hora: "01:05", nombre: "🏆 Torneo bandas (5v5)" },
  { hora: "01:30", nombre: "🏆 Torneo 1v1" },
  { hora: "01:45", nombre: "🏆 Torneo bandas (4v4)" },
  { hora: "02:15", nombre: "🏆 Torneo bandas (3v3)" }
];

function iniciarEventos() {

  setInterval(async () => {

    const now = new Date();
    const horaActual = now.getHours().toString().padStart(2, '0') + ":" +
                       now.getMinutes().toString().padStart(2, '0');

    const canal = client.channels.cache.get(config.eventos.canalId);
    if (!canal) return;

    let lista = cargarEventos();

    for (const evento of eventos) {

      const [h, m] = evento.hora.split(":");

      const avisoMin = (parseInt(m) - 2 + 60) % 60;
      const avisoHora = parseInt(m) - 2 < 0 ? parseInt(h) - 1 : h;

      const aviso = avisoHora.toString().padStart(2, '0') + ":" +
                    avisoMin.toString().padStart(2, '0');

      let activo = lista.find(e => e.nombre === evento.nombre);

      if (horaActual === aviso && !activo) {

        // 🌪️ TORMENTAS
        if (evento.nombre.toLowerCase().includes('tormentas')) {

          lista.push({
            nombre: evento.nombre,
            tipo: 'tormentas',
            inicio: Date.now(),
            ultimoEnvio: 0
          });

        } else {

          // 🟢 NORMAL
          const embed = new EmbedBuilder()
            .setTitle('🏆 Evento Programado')
            .setDescription(
`━━━━━━━━━━━━━━━━━━

🎮 **${evento.nombre}**
⏰ Empieza en 2 minutos

━━━━━━━━━━━━━━━━━━`
            )
            .setColor(0x8e44ad)
            .setTimestamp();

          const msg = await canal.send({
            content: `<@&${config.eventos.rolId}>`,
            embeds: [embed]
          });

          lista.push({
            nombre: evento.nombre,
            tipo: 'normal',
            messageId: msg.id,
            channelId: canal.id,
            borrarEn: Date.now() + (15 * 60 * 1000)
          });
        }
      }
    }

    // ===== LOOP =====

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

🔥 **EN CURSO**
⚔️ Únete ahora

━━━━━━━━━━━━━━━━━━`
            )
            .setColor(0x6a0dad)
            .setTimestamp();

          const msg = await canal.send({
            content: `<@&${config.eventos.rolId}>`,
            embeds: [embed]
          });

          nuevaLista.push({
            tipo: 'delete',
            messageId: msg.id,
            channelId: canal.id,
            borrarEn: Date.now() + (15 * 60 * 1000)
          });

          ev.ultimoEnvio = Date.now();
        }

        nuevaLista.push(ev);
      }

      else if (ev.tipo === 'normal') {

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

      else if (ev.tipo === 'delete') {

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

function getLogChannel(guild) {
  return guild.channels.cache.get(config.logsChannelId);
}

client.on('messageDelete', async (message) => {
  if (!message.guild || !message.author) return;

  const canal = getLogChannel(message.guild);
  if (!canal) return;

  const embed = new EmbedBuilder()
    .setTitle('🗑️ Mensaje eliminado')
    .addFields(
      { name: 'Usuario', value: message.author.tag, inline: true },
      { name: 'Canal', value: `<#${message.channel.id}>`, inline: true },
      { name: 'Contenido', value: message.content || 'Sin texto' }
    )
    .setColor(0xff0000)
    .setTimestamp();

  canal.send({ embeds: [embed] });
});

client.on('messageUpdate', async (oldMsg, newMsg) => {
  if (!oldMsg.guild || oldMsg.author?.bot) return;
  if (oldMsg.content === newMsg.content) return;

  const canal = getLogChannel(oldMsg.guild);
  if (!canal) return;

  const embed = new EmbedBuilder()
    .setTitle('✏️ Mensaje editado')
    .addFields(
      { name: 'Usuario', value: oldMsg.author.tag },
      { name: 'Antes', value: oldMsg.content || '—' },
      { name: 'Después', value: newMsg.content || '—' }
    )
    .setColor(0xffff00)
    .setTimestamp();

  canal.send({ embeds: [embed] });
});

client.on('guildMemberAdd', member => {
  const canal = getLogChannel(member.guild);
  if (!canal) return;

  canal.send(`🟢 **${member.user.tag}** se unió`);
});

client.on('guildMemberRemove', member => {
  const canal = getLogChannel(member.guild);
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
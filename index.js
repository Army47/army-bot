require('dotenv').config();
console.log("TOKEN:", process.env.TOKEN ? "Cargado correctamente" : "NO ENCONTRADO");

const fs = require('fs');
const path = require('path');
const config = require('./config.json');

// ===== ARCHIVO EVENTOS =====
const eventosPath = path.join(process.cwd(), 'eventos.json');

function cargarEventos() {
  if (!fs.existsSync(eventosPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(eventosPath, 'utf-8'));
  } catch (error) {
    console.error("Error al leer eventos.json:", error);
    return [];
  }
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
    // Calculamos la hora real y el offset para la zona horaria de Madrid
    const realNow = new Date();
    const madridString = realNow.toLocaleString("en-US", { timeZone: "Europe/Madrid" });
    const madridDate = new Date(madridString);
    const offset = madridDate.getTime() - realNow.getTime(); 
    const ahoraMs = realNow.getTime();

    const canal = await client.channels.fetch(config.eventos.canalId).catch(() => null);
    if (!canal) return;

    let lista = cargarEventos();

    for (const evento of eventos) {
      const [h, m] = evento.hora.split(":");

      // Creamos la fecha del evento basándonos en la hora de Madrid actual
      const fechaEventoMadrid = new Date(madridDate);
      fechaEventoMadrid.setHours(parseInt(h), parseInt(m), 0, 0);

      // Convertimos la hora de Madrid a un timestamp UTC real para comparaciones exactas
      let realEventDate = new Date(fechaEventoMadrid.getTime() - offset);

      // Si la hora ya pasó (con margen), asumimos que es para mañana
      if (realEventDate.getTime() < ahoraMs - (5 * 60 * 1000)) {
        realEventDate.setDate(realEventDate.getDate() + 1);
      }

      const avisoMs = realEventDate.getTime() - (2 * 60 * 1000); // Avisar 2 mins antes
      const margen = 60 * 1000; // 1 minuto de ventana para enviarlo

      let activo = lista.find(e => e.nombre === evento.nombre && e.hora === evento.hora);

      if (ahoraMs >= avisoMs && ahoraMs < avisoMs + margen && !activo) {
        if (evento.nombre.toLowerCase().includes('tormentas')) {
          lista.push({
            nombre: evento.nombre,
            hora: evento.hora,
            tipo: 'tormentas',
            inicio: ahoraMs,
            ultimoEnvio: 0
          });
        } else {
          const timestamp = Math.floor(realEventDate.getTime() / 1000);

          const embed = new EmbedBuilder()
            .setTitle('📅 Evento Programado')
            .setDescription(`━━━━━━━━━━━━━━━━━━\n\n**${evento.nombre}**\n⏳ Empieza <t:${timestamp}:R>\n\n🌌 Portal activo ahora mismo en barrio\n\n━━━━━━━━━━━━━━━━━━`)
            .setColor(0x000000)
            .setFooter({ text: '⚔️ Army Events System' })
            .setTimestamp();

          const msg = await canal.send({
            content: `<@&${config.eventos.rolId}>`,
            embeds: [embed]
          }).catch(() => null);

          if (msg) {
            lista.push({
              nombre: evento.nombre,
              hora: evento.hora,
              tipo: 'normal',
              messageId: msg.id,
              channelId: canal.id,
              borrarEn: ahoraMs + (15 * 60 * 1000)
            });
          }
        }
      }
    }

    let nuevaLista = [];

    for (let ev of lista) {
      if (ev.tipo === 'tormentas') {
        const tiempo = ahoraMs - ev.inicio;
        if (tiempo > 60 * 60 * 1000) continue; // Si pasó 1 hora, lo borramos de la lista

        if (ahoraMs - ev.ultimoEnvio >= 5 * 60 * 1000) {
          const embed = new EmbedBuilder()
            .setTitle('🌪️ Tanda de Tormentas')
            .setDescription(`━━━━━━━━━━━━━━━━━━\n\n**Tormentas disponibles**\n⚔️ Entra y domina la zona\n\n🌌 Portal activo ahora mismo en barrio\n\n━━━━━━━━━━━━━━━━━━`)
            .setColor(0x000000)
            .setFooter({ text: '⚔️ Army Events System' })
            .setTimestamp();

          const msg = await canal.send({
            content: `<@&${config.eventos.rolId}>`,
            embeds: [embed]
          }).catch(() => null);

          if (msg) {
            nuevaLista.push({
              tipo: 'delete',
              messageId: msg.id,
              channelId: canal.id,
              borrarEn: ev.inicio + (60 * 60 * 1000) // Borrar cuando acabe el evento
            });
          }
          ev.ultimoEnvio = ahoraMs;
        }
        nuevaLista.push(ev);
      } 
      else if (ev.tipo === 'normal' || ev.tipo === 'delete') {
        if (ahoraMs >= ev.borrarEn) {
          try {
            const canalEv = await client.channels.fetch(ev.channelId);
            const msg = await canalEv.messages.fetch(ev.messageId);
            await msg.delete().catch(() => {});
          } catch {} // El mensaje ya estaba borrado o no hay acceso
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

  // No puedes hacer "fetch" a un mensaje borrado si no estaba cacheado antes
  // Si partial es true, el contenido se ha perdido irremediablemente.
  const contenido = message.partial ? "*(Mensaje antiguo no cacheado, no se puede leer el contenido)*" : message.content;

  const canal = await getLogChannel(message.guild);
  if (!canal) return;

  const embed = new EmbedBuilder()
    .setTitle('🗑️ Mensaje eliminado')
    .addFields(
      { name: 'Usuario', value: message.author?.tag || "Desconocido", inline: true },
      { name: 'Canal', value: `<#${message.channelId}>`, inline: true },
      // Limitamos a 1024 caracteres para evitar el error de Discord "Must be 1024 or fewer in length"
      { name: 'Contenido', value: (contenido || "Sin texto").substring(0, 1024) }
    )
    .setColor(0xff0000)
    .setTimestamp();

  canal.send({ embeds: [embed] }).catch(() => {});
});

client.on('messageUpdate', async (oldMsg, newMsg) => {
  if (!newMsg.guild) return;

  try {
    if (newMsg.partial) await newMsg.fetch();
    // oldMsg no se puede fetchear si no estaba cacheado, solo podemos fetchear el nuevo
  } catch {}

  if (oldMsg.content === newMsg.content) return;

  const canal = await getLogChannel(newMsg.guild);
  if (!canal) return;

  const oldContent = oldMsg.partial ? "*(Mensaje antiguo no cacheado)*" : (oldMsg.content || "Sin texto");
  const newContent = newMsg.content || "Sin texto";

  const embed = new EmbedBuilder()
    .setTitle('✏️ Mensaje editado')
    .addFields(
      { name: 'Usuario', value: newMsg.author?.tag || "Desconocido" },
      // Limitamos a 1024 caracteres
      { name: 'Antes', value: oldContent.substring(0, 1024) },
      { name: 'Después', value: newContent.substring(0, 1024) }
    )
    .setColor(0xffff00)
    .setTimestamp();

  canal.send({ embeds: [embed] }).catch(() => {});
});

client.on('guildMemberAdd', async member => {
  const canal = await getLogChannel(member.guild);
  if (!canal) return;
  canal.send(`🟢 **${member.user.tag}** se unió`).catch(() => {});
});

client.on('guildMemberRemove', async member => {
  const canal = await getLogChannel(member.guild);
  if (!canal) return;
  canal.send(`🔴 **${member.user.tag}** salió`).catch(() => {});
});

// ================= READY =================
client.once('ready', () => {
  console.log(`✅ Bot listo como ${client.user.tag}`);
  iniciarEventos();
});

// ================= LOGIN =================
client.login(process.env.TOKEN);
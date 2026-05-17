const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const { initDatabase, query, run } = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// ── Auth Middleware ──────────────────────────────────────────
const auth = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Chưa đăng nhập' });
  const users = await query('SELECT * FROM users WHERE id = ?', [token]);
  if (!users.length) return res.status(401).json({ error: 'Token không hợp lệ' });
  req.user = users[0];
  next();
};

// ── AUTH ─────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    const existing = await query('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existing.length)
      return res.status(409).json({ error: 'Email hoặc username đã tồn tại' });
    const colors = ['#4f8ef7','#7c6af7','#2dd4a0','#f59e0b','#f76f6f','#ec4899','#06b6d4'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const id = uuidv4();
    await run('INSERT INTO users (id, username, email, password, avatar_color) VALUES (?,?,?,?,?)',
      [id, username, email, password, color]);
    const general = await query("SELECT id FROM rooms WHERE name LIKE '%Chung%' LIMIT 1");
    if (general.length)
      await run('INSERT IGNORE INTO room_members (room_id, user_id) VALUES (?,?)', [general[0].id, id]);
    res.status(201).json({ token: id, user: { id, username, email, avatar_color: color }, message: 'Đăng ký thành công!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Nhập email và mật khẩu' });
    const users = await query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
    if (!users.length) return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    const { password: _, ...user } = users[0];
    res.json({ token: user.id, user, message: 'Đăng nhập thành công!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/auth/me', auth, async (req, res) => {
  const { password: _, ...user } = req.user;
  res.json(user);
});

// ── ROOMS ─────────────────────────────────────────────────────
app.get('/api/rooms', auth, async (req, res) => {
  try {
    const rooms = await query(`
      SELECT r.*,
        (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) AS member_count,
        (SELECT COUNT(*) FROM messages WHERE room_id = r.id) AS message_count
      FROM rooms r ORDER BY r.created_at ASC
    `);
    res.json(rooms);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/rooms', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Tên phòng là bắt buộc' });
    const id = uuidv4();
    await run('INSERT INTO rooms (id, name, description, created_by) VALUES (?,?,?,?)',
      [id, name, description || '', req.user.id]);
    await run('INSERT IGNORE INTO room_members (room_id, user_id) VALUES (?,?)', [id, req.user.id]);
    const rooms = await query('SELECT * FROM rooms WHERE id = ?', [id]);
    io.emit('room:new', rooms[0]);
    res.status(201).json(rooms[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/rooms/:id/join', auth, async (req, res) => {
  await run('INSERT IGNORE INTO room_members (room_id, user_id) VALUES (?,?)', [req.params.id, req.user.id]);
  res.json({ message: 'Đã tham gia phòng' });
});

// ── MESSAGES ──────────────────────────────────────────────────
app.get('/api/rooms/:roomId/messages', auth, async (req, res) => {
  try {
    const messages = await query(`
      SELECT m.*, u.username, u.avatar_color
      FROM messages m JOIN users u ON u.id = m.user_id
      WHERE m.room_id = ? ORDER BY m.created_at ASC LIMIT 100
    `, [req.params.roomId]);
    res.json(messages);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── USERS ─────────────────────────────────────────────────────
app.get('/api/users', auth, async (req, res) => {
  const users = await query('SELECT id, username, email, avatar_color, created_at FROM users ORDER BY username');
  res.json(users);
});

// ── HEALTH ────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok', db: 'MySQL 8.0 (Docker)', time: new Date().toISOString() }));

// ── SOCKET.IO ─────────────────────────────────────────────────
const onlineUsers = new Map();

io.on('connection', (socket) => {
  socket.on('user:online', (user) => {
    onlineUsers.set(socket.id, user);
    io.emit('users:online', Array.from(onlineUsers.values()));
  });
  socket.on('room:join', (roomId) => socket.join(roomId));
  socket.on('room:leave', (roomId) => socket.leave(roomId));

  socket.on('message:send', async ({ roomId, userId, content }) => {
    if (!content?.trim()) return;
    try {
      const id = uuidv4();
      await run('INSERT INTO messages (id, room_id, user_id, content) VALUES (?,?,?,?)',
        [id, roomId, userId, content.trim()]);
      const msgs = await query(`
        SELECT m.*, u.username, u.avatar_color
        FROM messages m JOIN users u ON u.id = m.user_id WHERE m.id = ?
      `, [id]);
      io.to(roomId).emit('message:new', msgs[0]);
    } catch (err) { console.error('Send error:', err.message); }
  });

  socket.on('typing:start', ({ roomId, username }) =>
    socket.to(roomId).emit('typing:update', { username, typing: true }));
  socket.on('typing:stop', ({ roomId, username }) =>
    socket.to(roomId).emit('typing:update', { username, typing: false }));

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    io.emit('users:online', Array.from(onlineUsers.values()));
  });
});

// ── START ─────────────────────────────────────────────────────
initDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`\n🚀 Chat Server: http://localhost:${PORT}`);
    console.log(`\n👤 Demo: alice@demo.com | bob@demo.com | carol@demo.com (pass: 123456)\n`);
  });
}).catch(err => {
  console.error('\n❌ Không kết nối được MySQL:', err.message);
  console.error('👉 Hãy chạy lệnh: docker-compose up -d\n');
  process.exit(1);
});

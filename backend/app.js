const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Inject db từ bên ngoài (dễ mock khi test)
let db = null;
app.setDb = (database) => { db = database; };

// ── Auth Middleware ──────────────────────────────────────────
const auth = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Chưa đăng nhập' });
  const users = await db.query('SELECT * FROM users WHERE id = ?', [token]);
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
    const existing = await db.query('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existing.length)
      return res.status(409).json({ error: 'Email hoặc username đã tồn tại' });
    const colors = ['#4f8ef7','#7c6af7','#2dd4a0','#f59e0b','#f76f6f'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const id = uuidv4();
    await db.run('INSERT INTO users (id, username, email, password, avatar_color) VALUES (?,?,?,?,?)',
      [id, username, email, password, color]);
    res.status(201).json({ token: id, user: { id, username, email, avatar_color: color }, message: 'Đăng ký thành công!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Nhập email và mật khẩu' });
    const users = await db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
    if (!users.length)
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
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
    const rooms = await db.query(`
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
    await db.run('INSERT INTO rooms (id, name, description, created_by) VALUES (?,?,?,?)',
      [id, name, description || '', req.user.id]);
    await db.run('INSERT IGNORE INTO room_members (room_id, user_id) VALUES (?,?)', [id, req.user.id]);
    const rooms = await db.query('SELECT * FROM rooms WHERE id = ?', [id]);
    res.status(201).json(rooms[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── MESSAGES ──────────────────────────────────────────────────
app.get('/api/rooms/:roomId/messages', auth, async (req, res) => {
  try {
    const messages = await db.query(`
      SELECT m.*, u.username, u.avatar_color
      FROM messages m JOIN users u ON u.id = m.user_id
      WHERE m.room_id = ? ORDER BY m.created_at ASC LIMIT 100
    `, [req.params.roomId]);
    res.json(messages);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── HEALTH ────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok', db: 'MySQL' }));

module.exports = app;

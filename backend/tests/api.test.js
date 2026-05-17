const request = require('supertest');
const app = require('../app');

// ── Mock Database ─────────────────────────────────────────────
// Dùng in-memory thay vì kết nối MySQL thật khi test
const mockDb = {
  users: [
    { id: 'u-alice', username: 'alice', email: 'alice@demo.com', password: '123456', avatar_color: '#4f8ef7' }
  ],
  rooms: [
    { id: 'r-chung', name: 'Chung', description: 'Phong chung', created_by: 'u-alice', member_count: 1, message_count: 0 }
  ],
  messages: [],
  members: [],

  async query(sql, params = []) {
    // Users
    if (sql.includes('FROM users WHERE email = ? AND password = ?'))
      return this.users.filter(u => u.email === params[0] && u.password === params[1]);
    if (sql.includes('FROM users WHERE email = ? OR username = ?'))
      return this.users.filter(u => u.email === params[0] || u.username === params[1]);
    if (sql.includes('FROM users WHERE id = ?'))
      return this.users.filter(u => u.id === params[0]);
    // Rooms
    if (sql.includes('FROM rooms r ORDER BY'))
      return this.rooms;
    if (sql.includes('FROM rooms WHERE id = ?'))
      return this.rooms.filter(r => r.id === params[0]);
    // Messages
    if (sql.includes('FROM messages m JOIN users'))
      return this.messages.filter(m => m.room_id === params[0]);
    return [];
  },

  async run(sql, params = []) {
    if (sql.includes('INSERT INTO users')) {
      this.users.push({ id: params[0], username: params[1], email: params[2], password: params[3], avatar_color: params[4] });
    }
    if (sql.includes('INSERT INTO rooms')) {
      this.rooms.push({ id: params[0], name: params[1], description: params[2], created_by: params[3], member_count: 1, message_count: 0 });
    }
    return { affectedRows: 1 };
  }
};

// Inject mock db vào app
app.setDb(mockDb);

// ── TEST: Health ──────────────────────────────────────────────
describe('GET /api/health', () => {
  test('trả về status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ── TEST: Auth - Register ─────────────────────────────────────
describe('POST /api/auth/register', () => {
  test('đăng ký thành công với thông tin hợp lệ', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'newuser', email: 'new@test.com', password: '123456' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.username).toBe('newuser');
    expect(res.body.user.email).toBe('new@test.com');
    expect(res.body.user).not.toHaveProperty('password'); // không trả password
  });

  test('thiếu thông tin → 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'abc' }); // thiếu email, password
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('email đã tồn tại → 409', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice2', email: 'alice@demo.com', password: '123456' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/đã tồn tại/);
  });
});

// ── TEST: Auth - Login ────────────────────────────────────────
describe('POST /api/auth/login', () => {
  test('đăng nhập thành công', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@demo.com', password: '123456' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.username).toBe('alice');
    expect(res.body.user).not.toHaveProperty('password');
  });

  test('sai mật khẩu → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@demo.com', password: 'saimat' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/không đúng/);
  });

  test('thiếu email → 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: '123456' });
    expect(res.status).toBe(400);
  });
});

// ── TEST: Auth - Me ───────────────────────────────────────────
describe('GET /api/auth/me', () => {
  test('trả về thông tin user khi có token hợp lệ', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer u-alice');
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('alice');
  });

  test('không có token → 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('token sai → 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token-sai');
    expect(res.status).toBe(401);
  });
});

// ── TEST: Rooms ───────────────────────────────────────────────
describe('GET /api/rooms', () => {
  test('lấy danh sách phòng khi đã đăng nhập', async () => {
    const res = await request(app)
      .get('/api/rooms')
      .set('Authorization', 'Bearer u-alice');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('chưa đăng nhập → 401', async () => {
    const res = await request(app).get('/api/rooms');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/rooms', () => {
  test('tạo phòng mới thành công', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', 'Bearer u-alice')
      .send({ name: 'Phong moi', description: 'Mo ta' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Phong moi');
  });

  test('thiếu tên phòng → 400', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', 'Bearer u-alice')
      .send({ description: 'Mo ta' });
    expect(res.status).toBe(400);
  });
});

// ── TEST: Messages ────────────────────────────────────────────
describe('GET /api/rooms/:roomId/messages', () => {
  test('lấy messages của phòng', async () => {
    const res = await request(app)
      .get('/api/rooms/r-chung/messages')
      .set('Authorization', 'Bearer u-alice');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('chưa đăng nhập → 401', async () => {
    const res = await request(app).get('/api/rooms/r-chung/messages');
    expect(res.status).toBe(401);
  });
});

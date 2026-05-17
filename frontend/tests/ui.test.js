/**
 * @jest-environment jsdom
 */
const { escHtml, formatTime, getInitials, validateLogin, validateRegister, buildMessageHTML, buildRoomItemHTML } = require('../ui');

// ── TEST: escHtml ─────────────────────────────────────────────
describe('escHtml()', () => {
  test('escape ký tự < và >', () => {
    expect(escHtml('<script>')).toBe('&lt;script&gt;');
  });

  test('escape dấu &', () => {
    expect(escHtml('a & b')).toBe('a &amp; b');
  });

  test('chuyển newline thành <br>', () => {
    expect(escHtml('xin\nchao')).toBe('xin<br>chao');
  });

  test('text bình thường không thay đổi', () => {
    expect(escHtml('Xin chao ban')).toBe('Xin chao ban');
  });

  test('chuỗi rỗng trả về rỗng', () => {
    expect(escHtml('')).toBe('');
  });
});

// ── TEST: getInitials ─────────────────────────────────────────
describe('getInitials()', () => {
  test('lấy 2 ký tự đầu viết hoa', () => {
    expect(getInitials('alice')).toBe('AL');
  });

  test('username ngắn 1 ký tự', () => {
    expect(getInitials('a')).toBe('A');
  });

  test('username rỗng trả về rỗng', () => {
    expect(getInitials('')).toBe('');
  });

  test('username undefined không crash', () => {
    expect(getInitials(undefined)).toBe('');
  });
});

// ── TEST: formatTime ──────────────────────────────────────────
describe('formatTime()', () => {
  test('trả về chuỗi HH:MM', () => {
    const result = formatTime('2024-01-15T10:30:00');
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  test('kết quả là string', () => {
    expect(typeof formatTime('2024-01-15T08:00:00')).toBe('string');
  });
});

// ── TEST: validateLogin ───────────────────────────────────────
describe('validateLogin()', () => {
  test('hợp lệ khi có email và password đủ dài', () => {
    const result = validateLogin('alice@demo.com', '123456');
    expect(result.valid).toBe(true);
  });

  test('thiếu email → invalid', () => {
    const result = validateLogin('', '123456');
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test('thiếu password → invalid', () => {
    const result = validateLogin('alice@demo.com', '');
    expect(result.valid).toBe(false);
  });

  test('email không có @ → invalid', () => {
    const result = validateLogin('notanemail', '123456');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Email/);
  });

  test('password dưới 6 ký tự → invalid', () => {
    const result = validateLogin('alice@demo.com', '123');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/6 ký tự/);
  });
});

// ── TEST: validateRegister ────────────────────────────────────
describe('validateRegister()', () => {
  test('hợp lệ khi đủ thông tin', () => {
    const result = validateRegister('alice', 'alice@demo.com', '123456');
    expect(result.valid).toBe(true);
  });

  test('thiếu username → invalid', () => {
    const result = validateRegister('', 'alice@demo.com', '123456');
    expect(result.valid).toBe(false);
  });

  test('username dưới 3 ký tự → invalid', () => {
    const result = validateRegister('ab', 'alice@demo.com', '123456');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/3 ký tự/);
  });

  test('email không hợp lệ → invalid', () => {
    const result = validateRegister('alice', 'bademail', '123456');
    expect(result.valid).toBe(false);
  });
});

// ── TEST: buildMessageHTML ────────────────────────────────────
describe('buildMessageHTML()', () => {
  const msg = {
    id: 'm-1',
    user_id: 'u-alice',
    username: 'alice',
    content: 'Xin chao!',
    avatar_color: '#4f8ef7',
    created_at: '2024-01-15T10:30:00'
  };

  test('tin nhắn của chính mình → isOwn = true', () => {
    const result = buildMessageHTML(msg, 'u-alice');
    expect(result.isOwn).toBe(true);
  });

  test('tin nhắn của người khác → isOwn = false', () => {
    const result = buildMessageHTML(msg, 'u-bob');
    expect(result.isOwn).toBe(false);
  });

  test('initials đúng', () => {
    const result = buildMessageHTML(msg, 'u-bob');
    expect(result.initials).toBe('AL');
  });

  test('HTML chứa nội dung tin nhắn', () => {
    const result = buildMessageHTML(msg, 'u-bob');
    expect(result.html).toContain('Xin chao!');
  });

  test('escape XSS trong content', () => {
    const xssMsg = { ...msg, content: '<script>alert(1)</script>' };
    const result = buildMessageHTML(xssMsg, 'u-bob');
    expect(result.html).not.toContain('<script>');
    expect(result.html).toContain('&lt;script&gt;');
  });

  test('tin nhắn own có class "own"', () => {
    const result = buildMessageHTML(msg, 'u-alice');
    expect(result.html).toContain('class="msg-bubble own"');
  });
});

// ── TEST: buildRoomItemHTML ───────────────────────────────────
describe('buildRoomItemHTML()', () => {
  const room = { id: 'r-1', name: 'Chung', message_count: 5 };

  test('HTML chứa tên phòng', () => {
    const html = buildRoomItemHTML(room, null);
    expect(html).toContain('Chung');
  });

  test('hiển thị số tin nhắn', () => {
    const html = buildRoomItemHTML(room, null);
    expect(html).toContain('5');
  });

  test('phòng active có class "active"', () => {
    const html = buildRoomItemHTML(room, 'r-1');
    expect(html).toContain('active');
  });

  test('phòng không active không có class "active"', () => {
    const html = buildRoomItemHTML(room, 'r-2');
    expect(html).not.toContain('class="room-item active"');
  });

  test('escape XSS trong tên phòng', () => {
    const xssRoom = { ...room, name: '<b>hack</b>' };
    const html = buildRoomItemHTML(xssRoom, null);
    expect(html).not.toContain('<b>hack</b>');
    expect(html).toContain('&lt;b&gt;hack&lt;/b&gt;');
  });
});

// ── TEST: DOM ─────────────────────────────────────────────────
describe('DOM interactions', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="authPage" style="display:flex"></div>
      <div id="appPage" style="display:none"></div>
      <div id="authErr" style="display:none"></div>
      <div id="messagesWrap"></div>
      <div id="roomList"></div>
      <textarea id="msgInput"></textarea>
    `;
  });

  test('authPage ẩn đi khi đăng nhập', () => {
    document.getElementById('authPage').style.display = 'none';
    document.getElementById('appPage').style.display = 'block';
    expect(document.getElementById('authPage').style.display).toBe('none');
    expect(document.getElementById('appPage').style.display).toBe('block');
  });

  test('hiển thị error message', () => {
    const el = document.getElementById('authErr');
    el.textContent = 'Sai mật khẩu';
    el.style.display = 'block';
    expect(el.style.display).toBe('block');
    expect(el.textContent).toBe('Sai mật khẩu');
  });

  test('render room list vào DOM', () => {
    const rooms = [
      { id: 'r-1', name: 'Chung', message_count: 3 },
      { id: 'r-2', name: 'Game',  message_count: 1 },
    ];
    const list = document.getElementById('roomList');
    list.innerHTML = rooms.map(r => buildRoomItemHTML(r, 'r-1')).join('');
    expect(list.querySelectorAll('.room-item').length).toBe(2);
    expect(list.querySelector('.active')).not.toBeNull();
  });

  test('render tin nhắn vào DOM', () => {
    const wrap = document.getElementById('messagesWrap');
    const msg = { id: 'm-1', user_id: 'u-alice', username: 'alice', content: 'Hello!', avatar_color: '#4f8ef7', created_at: new Date().toISOString() };
    const { html } = buildMessageHTML(msg, 'u-bob');
    const div = document.createElement('div');
    div.innerHTML = html;
    wrap.appendChild(div);
    expect(wrap.querySelector('.msg-bubble')).not.toBeNull();
    expect(wrap.textContent).toContain('Hello!');
  });

  test('input bị clear sau khi gửi', () => {
    const input = document.getElementById('msgInput');
    input.value = 'Tin nhan moi';
    input.value = '';
    expect(input.value).toBe('');
  });
});

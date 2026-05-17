// ui.js — Các hàm UI thuần có thể test độc lập với DOM

/**
 * Escape HTML để tránh XSS khi render tin nhắn
 */
function escHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

/**
 * Format thời gian từ datetime string sang HH:MM
 */
function formatTime(datetimeStr) {
  return new Date(datetimeStr).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Lấy 2 ký tự đầu của username làm initials avatar
 */
function getInitials(username) {
  return (username || '').slice(0, 2).toUpperCase();
}

/**
 * Validate form đăng nhập
 */
function validateLogin(email, password) {
  if (!email || !password) return { valid: false, error: 'Vui lòng nhập đầy đủ thông tin' };
  if (!email.includes('@')) return { valid: false, error: 'Email không hợp lệ' };
  if (password.length < 6) return { valid: false, error: 'Mật khẩu phải ít nhất 6 ký tự' };
  return { valid: true };
}

/**
 * Validate form đăng ký
 */
function validateRegister(username, email, password) {
  if (!username || !email || !password) return { valid: false, error: 'Vui lòng điền đầy đủ thông tin' };
  if (username.length < 3) return { valid: false, error: 'Username phải ít nhất 3 ký tự' };
  if (!email.includes('@')) return { valid: false, error: 'Email không hợp lệ' };
  if (password.length < 6) return { valid: false, error: 'Mật khẩu phải ít nhất 6 ký tự' };
  return { valid: true };
}

/**
 * Build HTML cho một tin nhắn
 */
function buildMessageHTML(msg, currentUserId) {
  const isOwn = msg.user_id === currentUserId;
  const initials = getInitials(msg.username);
  const time = formatTime(msg.created_at);
  const avatarColor = msg.avatar_color || '#5b8ef4';

  return {
    isOwn,
    initials,
    time,
    html: `
      <div class="msg-group">
        ${!isOwn ? `<div class="msg-avatar" style="background:${avatarColor}">${initials}</div>` : ''}
        <div class="msg-body">
          <div class="msg-header">
            <span class="msg-username">${escHtml(msg.username)}</span>
            <span class="msg-time">${time}</span>
          </div>
          <div class="msg-bubble ${isOwn ? 'own' : ''}">${escHtml(msg.content)}</div>
        </div>
        ${isOwn ? `<div class="msg-avatar" style="background:${avatarColor}">${initials}</div>` : ''}
      </div>`
  };
}

/**
 * Build HTML cho một room item trong sidebar
 */
function buildRoomItemHTML(room, activeRoomId) {
  const isActive = room.id === activeRoomId;
  return `<div class="room-item ${isActive ? 'active' : ''}" data-id="${room.id}">
    <span class="room-name">${escHtml(room.name)}</span>
    <span class="room-count">${room.message_count || 0}</span>
  </div>`;
}

module.exports = { escHtml, formatTime, getInitials, validateLogin, validateRegister, buildMessageHTML, buildRoomItemHTML };

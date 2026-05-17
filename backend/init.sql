SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET character_set_connection = utf8mb4;

USE chatflow;

CREATE TABLE IF NOT EXISTS users (
  id          VARCHAR(36)  PRIMARY KEY,
  username    VARCHAR(50)  NOT NULL UNIQUE,
  email       VARCHAR(100) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  avatar_color VARCHAR(20) DEFAULT '#4f8ef7',
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rooms (
  id          VARCHAR(36)  PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  created_by  VARCHAR(36)  NOT NULL,
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
  id          VARCHAR(36)  PRIMARY KEY,
  room_id     VARCHAR(36)  NOT NULL,
  user_id     VARCHAR(36)  NOT NULL,
  content     TEXT         NOT NULL,
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_messages_room    (room_id),
  INDEX idx_messages_created (created_at),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS room_members (
  room_id     VARCHAR(36) NOT NULL,
  user_id     VARCHAR(36) NOT NULL,
  joined_at   DATETIME    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id, user_id),
  INDEX idx_room_members_user (user_id),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Xoa data cu bi loi charset
DELETE FROM messages;
DELETE FROM room_members;
DELETE FROM rooms;
DELETE FROM users;

-- Seed data
INSERT INTO users (id, username, email, password, avatar_color) VALUES
  ('u-alice', 'alice', 'alice@demo.com', '123456', '#4f8ef7'),
  ('u-bob',   'bob',   'bob@demo.com',   '123456', '#7c6af7'),
  ('u-carol', 'carol', 'carol@demo.com', '123456', '#2dd4a0');

INSERT INTO rooms (id, name, description, created_by) VALUES
  ('r-chung', '🌐 Chung',     'Phong chat chung cho moi nguoi', 'u-alice'),
  ('r-code',  '💻 Lap trinh', 'Thao luan ve code va tech',      'u-alice'),
  ('r-game',  '🎮 Game',      'Choi game, xem phim, am nhac',   'u-bob');

INSERT INTO room_members (room_id, user_id) VALUES
  ('r-chung', 'u-alice'), ('r-chung', 'u-bob'), ('r-chung', 'u-carol'),
  ('r-code',  'u-alice'), ('r-code',  'u-bob'), ('r-code',  'u-carol'),
  ('r-game',  'u-alice'), ('r-game',  'u-bob'), ('r-game',  'u-carol');

INSERT INTO messages (id, room_id, user_id, content) VALUES
  (UUID(), 'r-chung', 'u-alice', 'Xin chao moi nguoi! 👋'),
  (UUID(), 'r-chung', 'u-bob',   'Chao Alice! Ung dung nay xin qua 🔥'),
  (UUID(), 'r-chung', 'u-carol', 'Hi tat ca! Minh moi tham gia 😊'),
  (UUID(), 'r-code',  'u-alice', 'Moi nguoi dang dung framework nao?'),
  (UUID(), 'r-code',  'u-bob',   'Minh dang hoc React + Node.js'),
  (UUID(), 'r-game',  'u-carol', 'Ai choi game toi nay khong? 🎮');

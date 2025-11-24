const { db } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create({ email, password, role }) {
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const query = `
      INSERT INTO users (email, password_hash, role)
      VALUES ($1, $2, $3)
      RETURNING id, email, role, is_active, created_at, updated_at
    `;

    const result = await db.query(query, [email, password_hash, role]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1 AND is_active = true';
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query =
      'SELECT id, email, role, is_active, created_at, updated_at FROM users WHERE id = $1 AND is_active = true';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async updatePassword(id, newPassword) {
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);

    const query = `
      UPDATE users 
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, email, role, updated_at
    `;

    const result = await db.query(query, [password_hash, id]);
    return result.rows[0];
  }

  static async validatePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static async deactivate(id) {
    const query = `
      UPDATE users 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id, email, role, is_active, updated_at
    `;

    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let query =
      'SELECT id, email, role, is_active, created_at, updated_at FROM users WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (filters.role) {
      paramCount++;
      query += ` AND role = $${paramCount}`;
      params.push(filters.role);
    }

    if (filters.is_active !== undefined) {
      paramCount++;
      query += ` AND is_active = $${paramCount}`;
      params.push(filters.is_active);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    const result = await db.query(query, params);
    return result.rows;
  }
}

module.exports = User;

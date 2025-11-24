const { db } = require('../config/database');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class DatabaseInitializer {
  static async initialize() {
    try {
      logger.info('Starting database initialization...');

      // Check if database connection is working
      await this.testConnection();

      // Run schema migration
      await this.runSchema();

      // Insert sample data in development
      if (process.env.NODE_ENV === 'development') {
        await this.insertSampleData();
      }

      logger.info('Database initialization completed successfully');
      return true;
    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  static async testConnection() {
    try {
      const result = await db.query('SELECT NOW() as current_time');
      logger.info(
        'Database connection successful:',
        result.rows[0].current_time
      );
      return true;
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw new Error('Cannot connect to database');
    }
  }

  static async runSchema() {
    try {
      logger.info('Running database schema...');

      // Check if schema is already set up
      const tableCheck = await db.query(`
        SELECT COUNT(*) as table_count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'doctors', 'patients', 'appointments', 'queue', 'queue_history')
      `);

      if (parseInt(tableCheck.rows[0].table_count) === 6) {
        logger.info('Database schema already exists, skipping creation...');
        return true;
      }

      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = await fs.readFile(schemaPath, 'utf8');

      try {
        await db.query(schema);
        logger.info('Schema executed successfully');
      } catch (error) {
        // If we get conflicts with existing objects, try to continue
        if (
          error.message.includes('already exists') ||
          error.message.includes(
            'duplicate key value violates unique constraint'
          )
        ) {
          logger.info('Some database objects already exist, continuing...');
        } else {
          throw error;
        }
      }

      return true;
    } catch (error) {
      logger.error('Schema execution failed:', error);
      throw error;
    }
  }

  static async insertSampleData() {
    try {
      logger.info('Inserting sample data...');

      // Check if data already exists
      const userCount = await db.query('SELECT COUNT(*) FROM users');
      if (parseInt(userCount.rows[0].count) > 0) {
        logger.info('Sample data already exists, skipping...');
        return;
      }

      const sampleData = `
        -- Sample Users
        INSERT INTO users (id, email, password_hash, role) VALUES
        ('550e8400-e29b-41d4-a716-446655440001', 'admin@hospital.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8z0.JMj.HO', 'admin'),
        ('550e8400-e29b-41d4-a716-446655440002', 'dr.smith@hospital.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8z0.JMj.HO', 'doctor'),
        ('550e8400-e29b-41d4-a716-446655440003', 'dr.johnson@hospital.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8z0.JMj.HO', 'doctor'),
        ('550e8400-e29b-41d4-a716-446655440004', 'patient1@email.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8z0.JMj.HO', 'patient'),
        ('550e8400-e29b-41d4-a716-446655440005', 'patient2@email.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8z0.JMj.HO', 'patient');

        -- Sample Doctors
        INSERT INTO doctors (id, user_id, first_name, last_name, specialization, license_number, phone, consultation_fee, is_available, working_hours) VALUES
        ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'John', 'Smith', 'Cardiology', 'LIC001', '+1234567890', 150.00, true, '{"monday": {"start": "09:00", "end": "17:00"}, "tuesday": {"start": "09:00", "end": "17:00"}, "wednesday": {"start": "09:00", "end": "17:00"}, "thursday": {"start": "09:00", "end": "17:00"}, "friday": {"start": "09:00", "end": "17:00"}}'),
        ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', 'Emily', 'Johnson', 'Pediatrics', 'LIC002', '+1234567891', 120.00, true, '{"monday": {"start": "08:00", "end": "16:00"}, "tuesday": {"start": "08:00", "end": "16:00"}, "wednesday": {"start": "08:00", "end": "16:00"}, "thursday": {"start": "08:00", "end": "16:00"}, "friday": {"start": "08:00", "end": "16:00"}}');

        -- Sample Patients
        INSERT INTO patients (id, user_id, first_name, last_name, date_of_birth, phone, address, emergency_contact, medical_history) VALUES
        ('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', 'Michael', 'Brown', '1985-06-15', '+1234567892', '123 Main St, City, State 12345', '{"name": "Sarah Brown", "phone": "+1234567893", "relationship": "spouse"}', 'No known allergies'),
        ('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440005', 'Lisa', 'Davis', '1990-03-22', '+1234567894', '456 Oak Ave, City, State 12345', '{"name": "Robert Davis", "phone": "+1234567895", "relationship": "father"}', 'Allergic to penicillin');

        -- Sample Appointments
        INSERT INTO appointments (id, doctor_id, patient_id, scheduled_time, duration_minutes, status, appointment_type, consultation_fee) VALUES
        ('880e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', NOW() + INTERVAL '1 hour', 30, 'scheduled', 'consultation', 150.00),
        ('880e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', NOW() + INTERVAL '2 hours', 30, 'scheduled', 'consultation', 120.00);
      `;

      await db.query(sampleData);
      logger.info('Sample data inserted successfully');

      return true;
    } catch (error) {
      logger.error('Sample data insertion failed:', error);
      throw error;
    }
  }

  static async reset() {
    try {
      logger.warn('Resetting database...');

      const dropTablesQuery = `
        DROP TABLE IF EXISTS queue_history CASCADE;
        DROP TABLE IF EXISTS queue CASCADE;
        DROP TABLE IF EXISTS appointments CASCADE;
        DROP TABLE IF EXISTS patients CASCADE;
        DROP TABLE IF EXISTS doctors CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
        DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
        DROP FUNCTION IF EXISTS get_next_queue_number(UUID) CASCADE;
        DROP FUNCTION IF EXISTS calculate_wait_time(UUID, INTEGER) CASCADE;
      `;

      await db.query(dropTablesQuery);
      logger.info('Database reset completed');

      return true;
    } catch (error) {
      logger.error('Database reset failed:', error);
      throw error;
    }
  }

  static async checkHealth() {
    try {
      const checks = {
        connection: false,
        tables: false,
        functions: false,
      };

      // Test connection
      await db.query('SELECT 1');
      checks.connection = true;

      // Check if tables exist
      const tableCheck = await db.query(`
        SELECT COUNT(*) as table_count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'doctors', 'patients', 'appointments', 'queue', 'queue_history')
      `);
      checks.tables = parseInt(tableCheck.rows[0].table_count) === 6;

      // Check if functions exist
      const functionCheck = await db.query(`
        SELECT COUNT(*) as function_count
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_name IN ('get_next_queue_number', 'calculate_wait_time', 'update_updated_at_column')
      `);
      checks.functions = parseInt(functionCheck.rows[0].function_count) === 3;

      return checks;
    } catch (error) {
      logger.error('Health check failed:', error);
      return {
        connection: false,
        tables: false,
        functions: false,
        error: error.message,
      };
    }
  }

  static async migrate() {
    try {
      logger.info('Running database migrations...');

      // Future migrations can be added here
      // For now, just ensure schema is up to date
      await this.runSchema();

      logger.info('Migrations completed successfully');
      return true;
    } catch (error) {
      logger.error('Migration failed:', error);
      throw error;
    }
  }
}

module.exports = DatabaseInitializer;

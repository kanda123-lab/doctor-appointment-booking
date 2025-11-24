import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { RegisterData } from '../types';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'patient' as 'doctor' | 'patient',
    first_name: '',
    last_name: '',
    specialization: '',
    license_number: '',
    consultation_fee: '',
    date_of_birth: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const registerData: RegisterData = {
        email: formData.email,
        password: formData.password,
        role: formData.role,
        profile: {
          first_name: formData.first_name,
          last_name: formData.last_name,
          ...(formData.role === 'doctor' && {
            specialization: formData.specialization,
            license_number: formData.license_number,
            consultation_fee: parseFloat(formData.consultation_fee) || 0,
          }),
          ...(formData.role === 'patient' && {
            date_of_birth: formData.date_of_birth,
          }),
          phone: formData.phone,
        },
      };

      await register(registerData);
      navigate('/dashboard');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join the Virtual Queue Management System
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Role Selection */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              I am a
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
            </select>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <input
              name="first_name"
              type="text"
              required
              value={formData.first_name}
              onChange={handleChange}
              className="form-input"
              placeholder="First Name"
            />
            <input
              name="last_name"
              type="text"
              required
              value={formData.last_name}
              onChange={handleChange}
              className="form-input"
              placeholder="Last Name"
            />
          </div>

          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            placeholder="Email address"
          />

          <input
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            placeholder="Phone Number (optional)"
          />

          {/* Doctor-specific fields */}
          {formData.role === 'doctor' && (
            <>
              <input
                name="specialization"
                type="text"
                required
                value={formData.specialization}
                onChange={handleChange}
                className="form-input"
                placeholder="Specialization"
              />
              <input
                name="license_number"
                type="text"
                required
                value={formData.license_number}
                onChange={handleChange}
                className="form-input"
                placeholder="License Number"
              />
              <input
                name="consultation_fee"
                type="number"
                step="0.01"
                value={formData.consultation_fee}
                onChange={handleChange}
                className="form-input"
                placeholder="Consultation Fee"
              />
            </>
          )}

          {/* Patient-specific fields */}
          {formData.role === 'patient' && (
            <input
              name="date_of_birth"
              type="date"
              value={formData.date_of_birth}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          )}

          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={formData.password}
            onChange={handleChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            placeholder="Password"
          />

          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            placeholder="Confirm Password"
          />

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
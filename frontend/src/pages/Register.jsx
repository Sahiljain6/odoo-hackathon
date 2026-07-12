import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'fleet_manager' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(form);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-screen">
      <div className="card">
        <h2>Register for TransitOps</h2>
        <form onSubmit={handleSubmit}>
          <input placeholder="Full name" value={form.name} onChange={update('name')} required />
          <select value={form.role} onChange={update('role')}>
            <option value="fleet_manager">Fleet Manager</option>
            <option value="driver">Driver</option>
            <option value="safety_officer">Safety Officer</option>
            <option value="financial_analyst">Financial Analyst</option>
          </select>
          <input type="email" placeholder="Email" value={form.email} onChange={update('email')} required />
          <input type="password" placeholder="Password" value={form.password} onChange={update('password')} required />
          <button className="primary" type="submit">Register</button>
        </form>
        <div className="toggle"><Link to="/login">Already have an account? Login</Link></div>
        {error && <div className="err">{error}</div>}
        {success && <div className="ok-msg">Registered — redirecting to login…</div>}
      </div>
    </div>
  );
}

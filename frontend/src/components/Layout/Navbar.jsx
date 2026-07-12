import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="navbar">
      <span>{user?.name}</span>
      <span>·</span>
      <span>{user?.role?.replace('_', ' ')}</span>
      <span>·</span>
      <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }}>Logout</a>
    </div>
  );
}

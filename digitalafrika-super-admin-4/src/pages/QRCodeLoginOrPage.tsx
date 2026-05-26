import { useParams } from 'react-router-dom';
import QRCodeLoginPage from './QRCodeLogin';
import GestionQRCodes from '../components/GestionQRCodes';

export default function QRCodeLoginOrPage() {
  const token = localStorage.getItem('auth_token');
  const userStr = localStorage.getItem('auth_user');
  
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.role === 'superadmin' || user.role === 'admin') {
        return <GestionQRCodes onQrActiveChange={() => {}} />;
      }
    } catch {}
  }
  
  return <QRCodeLoginPage />;
}

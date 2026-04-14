import { Routes, Route } from 'react-router-dom';
import { Login } from './Login';
import { Signup } from './Signup';

export const AuthPages = () => {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route path="signup" element={<Signup />} />
      <Route path="*" element={<Login />} />
    </Routes>
  );
};

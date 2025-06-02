import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';

const Header: React.FC = () => (
  <header style={{
    position: 'fixed',
    height: 100, width: '100%',
    backgroundColor: '#252525',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px 16px',
    zIndex: 1000,

  }}>
    <Link to="/">
      <img
        src={logo}
        alt="Логотип"
        style={{ height: 75 }}
      />
    </Link>
  </header>
);

export default Header;
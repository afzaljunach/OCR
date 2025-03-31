import React from 'react';
import logo from './../assets/logo.png'

function Header() {
  return (
    <header className="bg-white shadow-lg py-3 sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center text-primary hover:text-secondary">
          <img src={logo} alt="logo" width="130" />
        </a>
        <div className="text-lg font-semibold">Document Information Extractor</div>
      </div>
    </header>
  );
}

export default Header;
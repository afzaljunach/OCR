import React from 'react';
import Header from './components/Header';
import DocInfoExtractor from './pages/DocInfoExtractor';

function App() {
  return (
    <div className="font-sans bg-gray-100 min-h-screen">
      <Header />
      <main className="container mx-auto py-10">
        <DocInfoExtractor />
      </main>
    </div>
  );
}

export default App;
import React from 'react';
import { CryptoAgentWidget } from './components/CryptoAgentWidget';

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <CryptoAgentWidget />
    </div>
  );
};

export default App;

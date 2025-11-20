import React from 'react';
import { CryptoAgentWidget } from './components/CryptoAgentWidget';
import { SearchInsightsPanel } from './components/SearchInsightsPanel';

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start sm:justify-center p-4 gap-4 sm:gap-6">
      <CryptoAgentWidget />
      <SearchInsightsPanel />
    </div>
  );
};

export default App;

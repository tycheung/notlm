import React from 'react';
import { DirectorGuideProvider } from './GuideProvider';
import CommandPalette from './CommandPalette';
import GuideAssistantFab from './GuideAssistantFab';

/** Shell host: provider + palette + floating guide FAB. */
const DirectorGuideHost: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DirectorGuideProvider>
    {children}
    <CommandPalette />
    <GuideAssistantFab />
  </DirectorGuideProvider>
);

export default DirectorGuideHost;

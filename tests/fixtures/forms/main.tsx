import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { WorkspaceDrawer } from '../../../src/modules/business/WorkspaceDrawer';
import { PredevelopmentFormsWorkspace } from '../../../src/modules/business/PredevelopmentFormsWorkspace';
import '../../../src/styles.css';

function Fixture() {
  const [open, setOpen] = useState(false);
  return <><h1>Synthetic project fixture</h1><button onClick={() => setOpen(true)}>Open site review</button>{open ?
    <WorkspaceDrawer title="3.1 Development & Site" contextKey="synthetic-site" onClose={() => setOpen(false)}>
      <PredevelopmentFormsWorkspace projectStateId="00000000-0000-4000-8000-000000000001" projectName="Synthetic project" projectLocation="Synthetic site" />
    </WorkspaceDrawer> : null}</>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);

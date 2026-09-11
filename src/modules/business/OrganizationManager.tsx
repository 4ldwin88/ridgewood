import { useState } from 'react';
import { supabaseProjectStateRepository as repository, type OrganizationOption } from '../../infrastructure/project-state/supabaseProjectStateRepository';
import { WorkspaceModal } from './WorkspaceModal';
export function OrganizationManager({organizations,onChanged}:{organizations:OrganizationOption[];onChanged:(items:OrganizationOption[])=>void}) {
 const [open,setOpen]=useState(false),[busy,setBusy]=useState<string>(),[error,setError]=useState<string>();
 async function update(item:OrganizationOption) {
  setBusy(item.id);setError(undefined);
  try { await repository.retireOrganization(item.id,!item.retired); onChanged(await repository.organizations()); }
  catch(e){setError(e instanceof Error?e.message:'Organization could not be updated.');}
  finally{setBusy(undefined);}
 }
 return <div className="organization-controls"><button className="text-button" onClick={()=>setOpen(true)}>Manage organizations / clients</button>{open?<WorkspaceModal title="Organizations / clients" onClose={()=>setOpen(false)} busy={Boolean(busy)}><p>Remove entries from future selections. Existing project links and history remain intact. Removed entries can be restored here.</p>{error?<p role="alert" className="error-message">{error}</p>:null}<div className="organization-list">{organizations.map(item=><div key={item.id}><span><strong>{item.name}</strong>{item.retired?<small>Removed from choices</small>:null}</span><button className="secondary" disabled={Boolean(busy)} onClick={()=>void update(item)}>{busy===item.id?'Saving…':item.retired?'Restore':'Remove'}</button></div>)}</div>{!organizations.length?<p>No organizations recorded yet.</p>:null}</WorkspaceModal>:null}</div>;
}

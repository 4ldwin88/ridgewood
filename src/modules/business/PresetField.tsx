import { useId, useState } from 'react';

/** Presets persist their actual answer, preserving existing published document contracts. */
export function PresetField({ label, value, onChange, options, name, required=false, disabled=false, multiline=false, allowCustom=true }: {
  label:string; value:string; onChange:(value:string)=>void; options:string[]; name?:string; required?:boolean; disabled?:boolean; multiline?:boolean; allowCustom?:boolean;
}) {
  const id=useId();
  const [custom,setCustom]=useState(Boolean(value&&!options.includes(value)));
  const isCustom=custom||Boolean(value&&!options.includes(value));
  return <div className="preset-field"><span id={id} className="preset-label">{label} <small>{required?'Required':'Optional'}</small></span>
    <div className="preset-options" role="group" aria-labelledby={id}>
      {options.map(option=><button key={option} type="button" disabled={disabled} aria-pressed={!isCustom&&value===option} onClick={()=>{setCustom(false);onChange(option);}}>{option}</button>)}
      {allowCustom?<button type="button" disabled={disabled} aria-pressed={isCustom} onClick={()=>{setCustom(true);onChange(options.includes(value)?'':value);}}>Custom</button>:null}
    </div>
    {isCustom ? <label className="custom-answer"><span>Custom {label.toLowerCase()}</span>{multiline?<textarea name={name} rows={3} value={value} required={required} disabled={disabled} onChange={e=>onChange(e.target.value)}/>:<input name={name} value={value} required={required} disabled={disabled} onChange={e=>onChange(e.target.value)}/>}</label>:<input type="hidden" name={name} value={value}/>}
  </div>;
}

export const fieldPresets:Record<string,string[]>={
  productType:['Residential','Mixed-use','Commercial','Industrial','Institutional'],
  intendedUsers:['Owner occupiers','Rental tenants','Commercial tenants','Public / community'],
  qualityPositioning:['Standard','Mid-market','Premium','Luxury'],
  designStage:['Concept','Schematic design','Design development','Permit set','Construction documents'],
  coordinationStatus:['Not started','Coordination in progress','Coordinated','Coordination gaps'],
  revenueBasis:['Fixed contract fee','Cost plus fee','Development sales','Rental income'],
  costBasis:['Benchmark estimate','Concept estimate','Quantity surveyor estimate','Tender pricing','Contracted pricing'],
  fundingCapital:['Equity funded','Debt and equity','Financing under review','Funding gap'],
  marketDemand:['Not assessed','Market study completed','Expressions of interest','Pre-sales / pre-leases'],
  deliveryModel:['Design–bid–build','Design–build','Construction management','Development management'],
  contractingStrategy:['Lump sum','Cost plus','Guaranteed maximum price','Management fee'],
  procurementStrategy:['Competitive tender','Negotiated procurement','Preferred trade partners','Hybrid procurement'],
  phasingStrategy:['Single phase','Multiple phases','Occupied-site phased delivery'],
  scheduleBasis:['Preliminary programme','Consultant programme','Contractor programme','Contract milestones'],
};

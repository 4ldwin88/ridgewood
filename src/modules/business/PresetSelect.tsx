import { useState } from 'react';
export function PresetSelect({label,value,onChange,options,disabled=false,placeholder='Describe the custom answer'}:{label:string;value:string;onChange:(v:string)=>void;options:string[];disabled?:boolean;placeholder?:string}){
 const [custom,setCustom]=useState(Boolean(value&&!options.includes(value)));
 const isCustom=custom||Boolean(value&&!options.includes(value));
 return <div><label>{label}<select disabled={disabled} value={isCustom?'__custom':value} onChange={e=>{setCustom(e.target.value==='__custom');onChange(e.target.value==='__custom'?'':e.target.value);}}><option value="">Select an option</option>{options.map(v=><option key={v} value={v}>{v}</option>)}<option value="__custom">Custom</option></select></label>{isCustom?<label>Custom {label.toLowerCase()}<input disabled={disabled} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>:null}</div>;
}

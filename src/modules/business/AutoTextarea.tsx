import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';

export function AutoTextarea(props:TextareaHTMLAttributes<HTMLTextAreaElement>){
  const ref=useRef<HTMLTextAreaElement>(null);
  function fit(){const el=ref.current;if(!el)return;el.style.height='0px';el.style.height=`${Math.max(42,el.scrollHeight+2)}px`;}
  useLayoutEffect(fit,[props.value,props.defaultValue]);
  useLayoutEffect(()=>{const el=ref.current;if(!el)return;let width=el.clientWidth;const observer=new ResizeObserver(()=>{if(el.clientWidth!==width){width=el.clientWidth;fit();}});observer.observe(el);return()=>observer.disconnect();},[]);
  return <textarea {...props} ref={ref} rows={1} onInput={event=>{fit();props.onInput?.(event);}}/>;
}

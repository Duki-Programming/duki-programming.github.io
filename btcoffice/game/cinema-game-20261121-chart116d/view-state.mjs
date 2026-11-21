import {timeToLogical} from './drawing-geometry.mjs';

export function sharedView(range,price,options,bars){
  if(!range||!bars.length)return null;
  const round=n=>Math.round(n*1000)/1000;
  return {from:round(range.from),to:round(range.to),price:options.autoScale?null:price,
    mode:options.mode,invert:options.invertScale,auto:options.autoScale,origin:bars[0].time,
    follow:range.to>=bars.length-3,offset:round(range.to-(bars.length-1))};
}
export function localRange(view,bars,step){
  if(!view||!bars.length)return null;
  // A late entrant may have a different first candle. Preserve the same time window;
  // when following live prices, preserve the right margin instead of a stale index.
  const span=view.to-view.from;
  if(view.follow){const to=bars.length-1+view.offset;return {from:to-span,to};}
  const shift=view.origin?timeToLogical(view.origin,bars,step):0;
  return {from:view.from+shift,to:view.to+shift};
}

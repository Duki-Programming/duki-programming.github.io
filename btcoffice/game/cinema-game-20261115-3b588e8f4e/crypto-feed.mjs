import {marketStream} from './market-peek/markets/streams.mjs';

const cache=new Map();
export function mergeCandles(current,updates,limit=500){
  const map=new Map(current.map(bar=>[bar.time,bar]));
  for(const b of updates)if(b&&Object.values(b).every(Number.isFinite)&&b.time>0&&b.low>0&&b.high>=Math.max(b.open,b.close,b.low)&&b.low<=Math.min(b.open,b.close)&&b.volume>=0)map.set(b.time,b);
  return [...map.values()].sort((a,b)=>a.time-b.time).slice(-limit);
}
/** Public Binance history and live candles go directly to each browser, never through our Worker. */
export class CryptoFeed {
  constructor(instrument,interval,onBars,onStatus){
    this.instrument=instrument;this.interval=interval;this.onBars=onBars;this.onStatus=onStatus;this.key=instrument.venue+':'+instrument.symbol+':'+interval;
    this.bars=cache.get(this.key)||[];this.stopped=false;this.suspended=false;this.generation=0;this.failures=0;
    this.step=({'1m':60,'5m':300,'15m':900,'30m':1800,'1h':3600,'4h':14400,'1d':86400,'1w':604800})[interval]||900;
  }
  start(){
    if(this.stopped||this.suspended)return;if(this.bars.length)this.onBars(this.bars,true);
    this.connect();this.history();
  }
  async history(){
    if(this.stopped||this.suspended||this.fetching)return;const generation=this.generation;
    const abort=new AbortController();this.abort=abort;this.fetching=abort;const timeout=setTimeout(()=>abort.abort(),10000);
    const base=this.instrument.venue==='futures'?'https://fapi.binance.com/fapi/v1':'https://data-api.binance.vision/api/v3';
    const params=new URLSearchParams({symbol:this.instrument.symbol,interval:this.interval,limit:'500'});
    // On reconnect, only backfill missing candles plus the last two mutable candles.
    if(this.bars.length>=20&&Date.now()/1000-this.bars.at(-1).time<this.step*498)params.set('startTime',String(Math.max(0,this.bars.at(-1).time-this.step*2)*1000));
    const requested=Date.now();
    try{
      const response=await fetch(base+'/klines?'+params,{signal:abort.signal,credentials:'omit'});if(!response.ok)throw Error('history');const rows=await response.json();if(!Array.isArray(rows))throw Error('history');
      if(this.stopped||this.suspended||generation!==this.generation)return;
      const incoming=rows.map(r=>({time:+r[0]/1000,open:+r[1],high:+r[2],low:+r[3],close:+r[4],volume:+r[5]}));
      // Do not let a REST response overwrite a newer tick received while it was in flight.
      if(this.lastTick&&this.lastTick.at>requested)incoming.push(this.lastTick.bar);
      const reset=this.bars.length<20;this.bars=mergeCandles(this.bars,incoming);this.remember();this.onBars(this.bars,reset,false);
      this.onStatus(this.socket?.readyState===WebSocket.OPEN?'live':'retry');
    }catch(error){if(!this.stopped&&!this.suspended&&generation===this.generation)this.onStatus('retry');}
    finally{clearTimeout(timeout);if(this.fetching===abort)this.fetching=null;}
  }
  connect(){
    if(this.stopped||this.suspended)return;const generation=this.generation;
    const spec=marketStream({...this.instrument,id:this.key},{cryptoExchange:'binance',cryptoMarket:this.instrument.venue==='futures'?'futures':'spot',interval:this.interval});
    // Reuse Market Peek's stream parser, subscribing only to candles (no redundant ticker feed).
    // Binance retired the legacy futures stream route in April 2026. The original
    // Market Peek parser remains unchanged; route candle subscriptions via /market.
    const endpoint=this.instrument.venue==='futures'?'wss://fstream.binance.com/market':'wss://data-stream.binance.vision';
    const socket=new WebSocket(endpoint+'/stream?streams='+encodeURIComponent(this.instrument.symbol.toLowerCase()+'@kline_'+this.interval));this.socket=socket;
    const opened=Date.now();clearInterval(this.watchdog);
    this.watchdog=setInterval(()=>{if(this.stopped||this.suspended||generation!==this.generation)return;if(Date.now()-Math.max(opened,this.lastTick?.at||0)>30000){this.onStatus('retry');if(!this.fallback){this.history();this.fallback=setInterval(()=>this.history(),30000);}}},10000);
    socket.onopen=()=>{if(generation!==this.generation)return;this.failures=0;this.onStatus('connecting');};
    socket.onmessage=e=>{
      if(this.stopped||this.suspended||generation!==this.generation)return;
      try{const bar=spec.parse(e.data)?.bar;if(!bar)return;clearInterval(this.fallback);this.fallback=null;const last=this.bars.at(-1);this.lastTick={bar,at:Date.now()};
        if(last&&bar.time>last.time+this.step*1.5)this.history();
        this.bars=mergeCandles(this.bars,[bar]);this.remember();this.onBars(this.bars,!last,true);this.onStatus('live');
      }catch{this.onStatus('retry');}
    };
    socket.onerror=()=>{};
    socket.onclose=()=>{if(this.stopped||this.suspended||generation!==this.generation)return;this.onStatus('retry');
      if(!this.fallback)this.fallback=setInterval(()=>this.history(),30000);
      this.reconnect=setTimeout(()=>{this.history();this.connect();},Math.min(30000,1000*2**Math.min(5,this.failures++)));
    };
  }
  remember(){cache.delete(this.key);cache.set(this.key,this.bars);if(cache.size>12)cache.delete(cache.keys().next().value);}
  pause(value){if(this.suspended===value)return;this.suspended=value;if(value)this.disconnect();else this.start();}
  disconnect(){this.generation++;this.abort?.abort();this.fetching=null;clearTimeout(this.reconnect);clearInterval(this.watchdog);clearInterval(this.fallback);this.fallback=null;this.socket?.close();this.socket=null;}
  destroy(){this.stopped=true;this.disconnect();}
}

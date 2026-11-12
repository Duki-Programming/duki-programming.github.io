(function(root){
  'use strict';
  const prefix='monitors/Monitor_Trading_';
  const slots=[
    {id:'upper-left',file:prefix+'Angled_SW_Housing.png',position:[24,-31],kind:'positions',title:'위 왼쪽 · 포지션'},
    {id:'upper-center',file:prefix+'Wide_Front_Housing.png',position:[80,-34],kind:'depth',title:'위 가운데 · 호가 심도'},
    {id:'upper-right',file:prefix+'Angled_SE_Housing.png',position:[176,-31],kind:'tape',title:'위 오른쪽 · 체결 내역'},
    {id:'lower-left',file:prefix+'Angled_SW_Housing.png',position:[24,5],kind:'markets',title:'아래 왼쪽 · 시장 현황'},
    {id:'lower-center',file:prefix+'Wide_Front_Housing.png',position:[80,3],kind:'chart',title:'아래 가운데 · BTC 15분봉'},
    {id:'lower-right',file:prefix+'Angled_SE_Housing.png',position:[176,5],kind:'book',title:'아래 오른쪽 · 호가창'}
  ];
  function panelHeight(asset){return Math.max(...asset.screen_quad.map(p=>p[1]))+3;}
  const api={slots,panelHeight,rack:{file:'monitor_rigs/MonitorRack_3x2.svg',position:[0,-36],size:[256,112]},arraySize:[256,112]};
  root.TradingRig=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);

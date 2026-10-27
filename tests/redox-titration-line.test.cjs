#!/usr/bin/env node
const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');

(async()=>{
  const errors=[];
  const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
  await page.goto(pathToFileURL(path.join(__dirname,'dist','index.html')).href);
  await page.waitForLoadState('domcontentloaded');

  if(!(await page.locator('body').evaluate(el=>el.classList.contains('process-only')))) throw new Error('頁面應只保留反應數線模式');
  if(!(await page.locator('#processDialog').isVisible())) throw new Error('反應數線應直接顯示');
  if(await page.locator('.process-card').count()!==3) throw new Error('應保留三個實驗區塊');
  if(await page.locator('.card-expand').count()!==3) throw new Error('三個實驗區塊皆需可個別放大');
  if(await page.locator('body > main').isVisible()) throw new Error('舊三站教材不應顯示');

  const axisLabels=await page.locator('.process-axis .axis-mark').allInnerTexts();
  if(axisLabels.some(label=>label.includes('+1 滴')||label.includes('過量一滴'))) throw new Error('數線上不應顯示過量一滴提示');
  if(axisLabels.some(label=>label.includes('40.0 mL')||label.includes('20.0 mL')||label.includes('Vₑ'))) throw new Error('當量點不應顯示體積數值');
  const buretteColors=await Promise.all(['#directBuretteColor','#iodimetryBuretteColor','#indirectBuretteColor'].map(selector=>page.locator(selector).evaluate(el=>getComputedStyle(el).backgroundColor)));
  if(buretteColors.join('|')!=='rgb(109, 17, 136)|rgb(184, 95, 0)|rgb(238, 249, 251)') throw new Error(`滴定管顏色不正確：${buretteColors.join('|')}`);
  const buretteStyle=await page.locator('.burette').first().evaluate(el=>({border:getComputedStyle(el).borderLeftWidth,label:getComputedStyle(el.parentElement.querySelector('.burette-caption')).fontSize}));
  if(buretteStyle.border!=='4px'||buretteStyle.label!=='13px') throw new Error(`滴定管粗細或文字大小不正確：${JSON.stringify(buretteStyle)}`);

  const expandButtons=page.locator('.card-expand');
  await expandButtons.nth(0).click();
  if(!(await page.locator('.process-grid').evaluate(el=>el.classList.contains('has-expanded')))) throw new Error('點擊後未進入單卡放大模式');
  if(await page.locator('.process-card:visible').count()!==1) throw new Error('放大時應只顯示所選實驗');
  if((await expandButtons.nth(0).getAttribute('aria-expanded'))!=='true') throw new Error('放大按鈕狀態未更新');
  await page.screenshot({path:path.join(__dirname,'process-expanded-preview.png'),fullPage:true});
  await expandButtons.nth(0).click();
  if(await page.locator('.process-card:visible').count()!==3) throw new Error('縮小後應恢復三欄比較');

  await expandButtons.nth(2).click();
  await page.waitForTimeout(250);
  if(!(await page.locator('.indirect-pretreatment').isVisible())) throw new Error('間接碘量法放大後應顯示 KI 前處理');
  const kiAxisText=await page.locator('.ki-axis .axis-mark').allInnerTexts();
  if(kiAxisText.some(label=>label.includes('限量 KI')||label.includes('淺黃褐'))) throw new Error('KI 數線上不應標示限量 KI 淺黃褐');
  if(!(await page.locator('#indirectProcessVolume').isDisabled())) throw new Error('加入過量 KI 前不應開始滴定');
  if(!(await page.locator('#indirectPhase').innerText()).includes('前處理起點')) throw new Error('KI 前處理起始狀態錯誤');
  if((await page.locator('#indirectSwatch').evaluate(el=>getComputedStyle(el).backgroundColor))!=='rgb(247, 244, 233)') throw new Error('加入 KI 前燒瓶應為無色');
  const ratioText=await page.locator('.ki-ratio-grid').innerText();
  if(!ratioText.includes('1 : 2 : 2')||!ratioText.includes('1 : 1 : 1')) throw new Error('KI 反應物與產物係數比未完整顯示');
  await page.screenshot({path:path.join(__dirname,'indirect-ki-preview.png'),fullPage:true});
  await page.locator('#kiProcessProgress').evaluate(el=>{el.value='50';el.dispatchEvent(new Event('input',{bubbles:true}))});
  await page.waitForTimeout(250);
  if(!(await page.locator('#indirectProcessVolume').isDisabled())) throw new Error('KI 前處理未完成時仍不應開始滴定');
  if(!(await page.locator('#kiProgressLabel').innerText()).includes('限量 KI')) throw new Error('KI 數線未標示限量區');
  if((await page.locator('#indirectI2Value').innerText())!=='71%') throw new Error('限量 KI 與 I₂ 生成比例未連動');
  if(!(await page.locator('#indirectPhase').innerText()).includes('KI 限量')) throw new Error('限量 KI 狀態說明錯誤');
  const limitedKiColor=await page.locator('#indirectSwatch').evaluate(el=>getComputedStyle(el).backgroundColor);
  await page.screenshot({path:path.join(__dirname,'indirect-ki-limited-preview.png'),fullPage:true});
  await page.locator('#kiProcessProgress').evaluate(el=>{el.value='85';el.dispatchEvent(new Event('input',{bubbles:true}))});
  await page.waitForTimeout(250);
  if(!(await page.locator('#kiProgressLabel').innerText()).includes('KI 過量區')) throw new Error('KI 數線未標示過量區');
  if(!(await page.locator('#indirectPhase').innerText()).includes('I₃⁻')) throw new Error('過量 KI 未顯示 I₃⁻ 狀態');
  const excessKiColor=await page.locator('#indirectSwatch').evaluate(el=>getComputedStyle(el).backgroundColor);
  if(excessKiColor===limitedKiColor) throw new Error('限量 KI 與過量 KI 應呈現不同顏色');
  await page.locator('#kiProcessProgress').evaluate(el=>{el.value='100';el.dispatchEvent(new Event('input',{bubbles:true}))});
  await page.waitForTimeout(250);
  if(await page.locator('#indirectProcessVolume').isDisabled()) throw new Error('加入過量 KI 後應啟用滴定數線');
  if(!(await page.locator('#processKiStatus').innerText()).includes('I₂ 已定量生成')) throw new Error('未顯示 KI 生成 I₂ 的結果');
  if(!(await page.locator('#indirectNote').innerText()).includes('I₃⁻')) throw new Error('過量 KI 後應顯示深紅褐色 I₃⁻');
  if((await page.locator('#indirectSwatch').evaluate(el=>getComputedStyle(el).backgroundColor))==='rgb(247, 244, 233)') throw new Error('加入 KI 後燒瓶不應維持無色');
  await page.screenshot({path:path.join(__dirname,'indirect-ki-generated-preview.png'),fullPage:true});
  await expandButtons.nth(2).click();
  if(await page.locator('.process-card:visible').count()!==3) throw new Error('間接滴定縮小後應恢復三欄比較');

  await page.locator('#directProcessVolume').evaluate(el=>{el.value='50';el.dispatchEvent(new Event('input',{bubbles:true}))});
  if((await page.locator('#directVolumeLabel').innerText())!=='當量點') throw new Error('直接滴定當量點狀態錯誤');
  await page.locator('#directProcessVolume').evaluate(el=>{el.value='60';el.dispatchEvent(new Event('input',{bubbles:true}))});
  if(!(await page.locator('#directNote').innerText()).includes('淡粉紅色')) throw new Error('KMnO₄ 終點顏色錯誤');

  await page.locator('#iodimetryProcessVolume').evaluate(el=>{el.value='60';el.dispatchEvent(new Event('input',{bubbles:true}))});
  if(!(await page.locator('#iodimetryPhase').innerText()).includes('深藍色出現')) throw new Error('直接碘滴定終點應為藍色出現');

  await page.locator('#indirectProcessVolume').evaluate(el=>{el.value='45';el.dispatchEvent(new Event('input',{bubbles:true}))});
  if(!(await page.locator('#processStarchBtn').isEnabled())) throw new Error('間接滴定接近當量點時應可加澱粉');
  await page.locator('#processStarchBtn').click();
  if(!(await page.locator('#indirectPhase').innerText()).includes('深藍色')) throw new Error('加入澱粉後應呈深藍色');
  await page.locator('#indirectProcessVolume').evaluate(el=>{el.value='50';el.dispatchEvent(new Event('input',{bubbles:true}))});
  await page.waitForTimeout(250);
  if((await page.locator('#indirectVolumeLabel').innerText())!=='當量點') throw new Error('間接滴定當量點狀態錯誤');
  if((await page.locator('#indirectSwatch').evaluate(el=>getComputedStyle(el).backgroundColor))!=='rgb(247, 244, 233)') throw new Error('間接滴定當量點應呈無色');

  if(errors.length) throw new Error('Console errors: '+errors.join(' | '));
  await page.screenshot({path:path.join(__dirname,'process-preview.png'),fullPage:true});
  await browser.close();
  console.log('PASS: standalone reaction number line, 3 expandable experiment cards, chemistry interactions, no console errors');
})().catch(error=>{console.error(error.stack||error);process.exit(1)});

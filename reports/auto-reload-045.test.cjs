const {test} = require('node:test');
const assert = require('node:assert/strict');
const {Runner} = require('../wagal-macro-0.4.5/engine.js');

const ready = {kind: 'ready', product: 'YouTube Premium Family', price: 'INR 389', frameId: 1};

test('3-minute timeout triggers reloadAndResume with preserved attempt count', async () => {
  let t = 0;
  let reloadedData = null;
  const runner = new Runner({
    now: () => t,
    sleep: async ms => { t += ms; },
    inspect: async () => ({kind: 'pending', reason: 'waiting-for-stage'}),
    act: async () => true,
    reloadAndResume: async data => {
      reloadedData = data;
      return true; // signals runner to break loop
    }
  });

  // Start with 3 minutes timeout (180,000ms) and initialAttempt: 644
  await runner.start(
    { attempts: 5000, delay: 3, stageTimeout: 180000, autoReload: true },
    ready,
    { initialAttempt: 644, startedAt: '2026-10-14T08:00:00.000Z', initialLogs: [{ phase: 'running', message: 'test' }] }
  );

  assert.equal(runner.state.phase, 'reloading');
  assert.ok(t >= 180000, 'Waited at least 180,000ms (3 minutes)');
  assert.ok(reloadedData !== null, 'reloadAndResume was called');
  assert.equal(reloadedData.attempt, 644, 'Preserved previous attempt count of 644');
  assert.equal(reloadedData.target.product, ready.product);
  assert.equal(reloadedData.startedAt, '2026-10-14T08:00:00.000Z');
});

test('Resuming runner with initialAttempt continues seamlessly', async () => {
  let t = 0;
  let step = 0;
  const clicks = [];
  const confirm = { ...ready, kind: 'confirm', canConfirm: true };

  const runner = new Runner({
    now: () => t,
    sleep: async ms => { t += ms; },
    inspect: async () => step === 0 ? ready : step === 1 ? confirm : { kind: 'success', product: ready.product },
    act: async s => {
      clicks.push(s.kind);
      step++;
      return true;
    }
  });

  await runner.start(
    { attempts: 5000, delay: 3, stageTimeout: 180000, autoReload: true },
    ready,
    { initialAttempt: 644 }
  );

  assert.equal(runner.state.phase, 'success');
  // Confirm click incremented attempt from 644 to 645
  assert.equal(runner.state.attempt, 645);
  assert.deepEqual(clicks, ['ready', 'confirm']);
});

#!/usr/bin/env gjs

// Basic unit tests for core/timer.js in GJS
const GLib = imports.gi.GLib;

// Simulate extension context by resolving Me via directory traversal
// When run from tests/, the extension root is one dir up
function getExtensionModule() {
  // Determine extension root containing 'core/' whether CWD is root or tests/
  let dir = GLib.get_current_dir();
  const hasCoreHere = GLib.file_test(dir + '/core', GLib.FileTest.IS_DIR);
  const extDir = hasCoreHere ? dir : GLib.path_get_dirname(dir);
  if (!imports.searchPath.includes(extDir)) imports.searchPath.unshift(extDir);
  return imports.core.timer;
}

function assertEquals(actual, expected, msg) {
  if (actual !== expected) {
    printerr(`ASSERT EQUALS FAILED: ${msg} (actual=${actual}, expected=${expected})`);
    imports.system.exit(1);
  }
}

function assertTrue(cond, msg) {
  if (!cond) {
    printerr(`ASSERT TRUE FAILED: ${msg}`);
    imports.system.exit(1);
  }
}

function test_parseDuration() {
  const { Timer } = getExtensionModule();
  assertEquals(Timer.parseDuration(''), 0, 'empty');
  assertEquals(Timer.parseDuration('15'), 15, 'number seconds');
  assertEquals(Timer.parseDuration('01:02'), 3720, 'hh:mm (1h02m)');
  assertEquals(Timer.parseDuration('00:01:02'), 62, 'hh:mm:ss (0h1m2s)');
  assertEquals(Timer.parseDuration('1:02:03'), 3723, 'hh:mm:ss');
  assertEquals(Timer.parseDuration('2h 3m 4s'), 7384, 'free units');
  assertEquals(Timer.parseDuration('10m'), 600, 'minutes only');
  assertEquals(Timer.parseDuration('45s'), 45, 'seconds only');
}

function test_format_and_states(done) {
  const { Timer, TimerState } = getExtensionModule();
  const t = new Timer();

  // initial
  assertEquals(t.state, TimerState.IDLE, 'initial state IDLE');
  assertEquals(t.remaining, 0, 'initial remaining 0');

  // setPaused
  t.setPaused(65);
  assertEquals(t.state, TimerState.PAUSED, 'PAUSED after setPaused');
  assertEquals(t.remaining, 65, 'remaining 65');
  assertEquals(t.formatRemaining(), '01:05', 'format mm:ss for <1h');

  // start running and observe tick + elapsed
  let changedCount = 0;
  let changedCount2 = 0; // verify multi-subscriber behavior
  let elapsedFired = false;
  t.onChanged(() => { changedCount += 1; });
  t.onChanged(() => { changedCount2 += 1; });
  t.onElapsed(() => { elapsedFired = true; });

  // Start with 2 seconds to keep test fast
  t.start(2);
  assertEquals(t.state, TimerState.RUNNING, 'state RUNNING after start');
  assertTrue(t.remaining <= 2 && t.remaining >= 1, 'remaining between 1 and 2 right after start');

  // Wait ~2.5s then verify elapsed
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2500, () => {
    assertTrue(elapsedFired, 'onElapsed fired');
    assertEquals(t.state, TimerState.IDLE, 'state IDLE after elapsed');
    assertEquals(t.remaining, 0, 'remaining 0 after elapsed');
    assertTrue(changedCount >= 2, 'onChanged (subscriber #1) called multiple times');
    assertTrue(changedCount2 >= 2, 'onChanged (subscriber #2) called multiple times');
    done();
    return GLib.SOURCE_REMOVE;
  });
}

function run() {
  try {
    test_parseDuration();
  } catch (e) {
    printerr(`test_parseDuration failed: ${e}`);
    imports.system.exit(1);
  }

  const loop = new GLib.MainLoop(null, false);
  test_format_and_states(() => {
    try {
      print('All timer tests passed');
      loop.quit();
    } catch (e) {
      printerr(`finalization error: ${e}`);
      loop.quit();
      imports.system.exit(1);
    }
  });
  loop.run();
}

run();

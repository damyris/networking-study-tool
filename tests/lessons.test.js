const test = require("node:test");
const assert = require("node:assert/strict");
const {LESSONS} = require("../lessons.js");

const expected = {core1:[1,2,3,4,5], core2:[1,2,3,4]};

test("every expected course+domain lesson exists and matches the shape", () => {
  for (const [course, domains] of Object.entries(expected)) {
    for (const d of domains) {
      const l = LESSONS[course] && LESSONS[course][d];
      assert.ok(l, `${course} D${d} lesson missing`);
      assert.equal(typeof l.title, "string"); assert.ok(l.title.trim());
      assert.equal(typeof l.intro, "string"); assert.ok(l.intro.trim());
      assert.ok(Array.isArray(l.points) && l.points.length >= 4 && l.points.length <= 6, `${course} D${d} needs 4-6 points`);
      assert.ok(Array.isArray(l.traps) && l.traps.length >= 2 && l.traps.length <= 3, `${course} D${d} needs 2-3 traps`);
      [...l.points, ...l.traps].forEach(s => { assert.equal(typeof s, "string"); assert.ok(s.trim()); });
    }
  }
});

import {test} from "node:test";
import assert from "node:assert/strict";
import {dayGroup, timestamp, remaining} from "./model.ts";

test("day boundaries follow the local calendar across DST and midnight", () => {
  const now = new Date(2026, 10, 2, 0, 5).getTime();
  for (const [age,id,cap] of [[0,"today",Infinity],[1,"yesterday",Infinity],[7,"older",20]]) {
    const time = new Date(2026, 10, 2-age, 0, 1).getTime();
    assert.deepEqual([dayGroup(time,now).id,dayGroup(time,now).cap],[id,cap]);
  }
  assert.equal(dayGroup(new Date(2026,9,27).getTime(),now).cap,6);
});
test("running threads appear today only in activity order", () => {
  const thread = {status:"active",createdAt:1,latestAttentionAt:20};
  assert.equal(timestamp(thread,"updated",100),100);
  assert.equal(timestamp(thread,"created",100),1);
});
test("remaining quota is bounded", () => {
  assert.deepEqual([12,0,100,105,-5].map(remaining),["88","100","0","0","100"]);
});

import assert from "node:assert/strict"
import { test } from "node:test"
import { applyStateExclusions, buildTourismReport } from "../lib/reports/tourism.ts"

test("classifies tourism independently for each studio", () => {
  const studios = [{ id:1,name:"Columbus",state:"OH" },{ id:2,name:"Louisville",state:"Kentucky" }]
  const rows = [
    {studioId:1,zipCode:"43201",orderCount:4,bookedSales:200},
    {studioId:1,zipCode:"40205",orderCount:2,bookedSales:140},
    {studioId:1,zipCode:"85234",orderCount:1,bookedSales:100},
    {studioId:2,zipCode:"40205",orderCount:3,bookedSales:180},
    {studioId:2,zipCode:"43201",orderCount:2,bookedSales:120},
  ]
  const report=buildTourismReport(rows,studios)
  const columbus=report.find(row=>row.studioId===1), louisville=report.find(row=>row.studioId===2)
  assert.deepEqual(columbus?.zipCodes.map(row=>[row.zipCode,row.state]),[["40205","KY"],["85234","AZ"]])
  assert.equal(columbus?.outOfStateOrders,3); assert.equal(columbus?.knownOrders,7)
  assert.equal(columbus?.orderShare,3/7*100); assert.equal(columbus?.outOfStateSales,240); assert.equal(columbus?.stateCount,2)
  assert.deepEqual(louisville?.zipCodes.map(row=>row.zipCode),["43201"])
  assert.equal(louisville?.outOfStateOrders,2); assert.equal(louisville?.knownOrders,5)
})

test("excludes unknown ZIPs from share denominators and reports their order count", () => {
  const [studio]=buildTourismReport([
    {studioId:1,zipCode:"43201",orderCount:3,bookedSales:90},
    {studioId:1,zipCode:"00000",orderCount:2,bookedSales:60},
  ],[{id:1,name:"Columbus",state:"Ohio"}])
  assert.equal(studio.knownOrders,3); assert.equal(studio.unknownOrders,2)
  assert.equal(studio.outOfStateOrders,0); assert.equal(studio.orderShare,0)
})

test("does not treat another studio's rows as tourism", () => {
  const report=buildTourismReport([{studioId:2,zipCode:"90210",orderCount:8,bookedSales:800}],[{id:1,name:"Columbus",state:"OH"}])
  assert.equal(report[0].knownOrders,0); assert.deepEqual(report[0].zipCodes,[])
})

test("state exclusions recalculate tourism while keeping the ZIP-known denominator", () => {
  const [studio]=buildTourismReport([
    {studioId:1,zipCode:"43201",orderCount:10,bookedSales:500},
    {studioId:1,zipCode:"40205",orderCount:4,bookedSales:240},
    {studioId:1,zipCode:"85234",orderCount:2,bookedSales:160},
  ],[{id:1,name:"Columbus",state:"OH"}])
  const filtered=applyStateExclusions(studio,["KY"])
  assert.equal(filtered.knownOrders,16)
  assert.equal(filtered.outOfStateOrders,2)
  assert.equal(filtered.orderShare,12.5)
  assert.equal(filtered.outOfStateSales,160)
  assert.equal(filtered.salesShare,160/900*100)
  assert.deepEqual(filtered.zipCodes.map(row=>row.state),["AZ"])
  assert.equal(filtered.stateCount,1)
  assert.deepEqual(applyStateExclusions(studio,[]).zipCodes,studio.zipCodes)
})

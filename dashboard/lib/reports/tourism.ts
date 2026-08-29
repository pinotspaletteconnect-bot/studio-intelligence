import { findState, getStates } from "zipcodes-us"

export type TourismSourceRow = { studioId: number; zipCode: string; orderCount: number; bookedSales: number }
export type TourismStudio = { id: number; name: string; state: string }
export type TourismZipRow = { zipCode: string; state: string; orderCount: number; bookedSales: number; averageOrderValue: number }

export function applyStateExclusions<T extends { knownOrders:number; knownSales:number; zipCodes:TourismZipRow[] }>(studio:T, excludedStates:Iterable<string>) {
  const excluded = new Set([...excludedStates].map(state => state.toUpperCase()))
  const zipCodes = studio.zipCodes.filter(row => !excluded.has(row.state.toUpperCase()))
  const outOfStateOrders = zipCodes.reduce((sum,row)=>sum+row.orderCount,0)
  const outOfStateSales = zipCodes.reduce((sum,row)=>sum+row.bookedSales,0)
  return { ...studio, zipCodes, outOfStateOrders, outOfStateSales, orderShare:studio.knownOrders?outOfStateOrders/studio.knownOrders*100:0, salesShare:studio.knownSales?outOfStateSales/studio.knownSales*100:0, stateCount:new Set(zipCodes.map(row=>row.state)).size }
}

const stateCodes = new Map(getStates().flatMap<[string, string]>(state => [[state.code.toUpperCase(), state.code.toUpperCase()], [state.name.toUpperCase(), state.code.toUpperCase()]]))
const studioStateCode = (value: string) => stateCodes.get(value.trim().toUpperCase()) ?? value.trim().toUpperCase()

export function buildTourismReport(rows: TourismSourceRow[], studios: TourismStudio[]) {
  return studios.map(studio => {
    const homeState = studioStateCode(studio.state)
    const source = rows.filter(row => row.studioId === studio.id)
    const resolved = source.map(row => ({ ...row, state: findState(row.zipCode) }))
    const classified = resolved.filter(row => row.state.isValid && row.state.stateCode)
    const unknown = resolved.filter(row => !row.state.isValid || !row.state.stateCode)
    const outOfState = classified.filter(row => row.state.stateCode !== homeState)
    const knownOrders = classified.reduce((sum, row) => sum + row.orderCount, 0)
    const knownSales = classified.reduce((sum, row) => sum + row.bookedSales, 0)
    const outOfStateOrders = outOfState.reduce((sum, row) => sum + row.orderCount, 0)
    const outOfStateSales = outOfState.reduce((sum, row) => sum + row.bookedSales, 0)
    const states = new Map<string, { state: string; orderCount: number; bookedSales: number }>()
    for (const row of outOfState) {
      const value = states.get(row.state.stateCode) ?? { state: row.state.stateCode, orderCount: 0, bookedSales: 0 }
      value.orderCount += row.orderCount; value.bookedSales += row.bookedSales; states.set(row.state.stateCode, value)
    }
    return {
      studioId: studio.id, studioName: studio.name, homeState,
      knownOrders, knownSales, outOfStateOrders, outOfStateSales,
      orderShare: knownOrders ? outOfStateOrders / knownOrders * 100 : 0,
      salesShare: knownSales ? outOfStateSales / knownSales * 100 : 0,
      stateCount: states.size,
      unknownOrders: unknown.reduce((sum, row) => sum + row.orderCount, 0),
      states: [...states.values()].sort((a, b) => b.orderCount - a.orderCount || b.bookedSales - a.bookedSales),
      zipCodes: outOfState.map(row => ({ zipCode: row.zipCode, state: row.state.stateCode, orderCount: row.orderCount, bookedSales: row.bookedSales, averageOrderValue: row.orderCount ? row.bookedSales / row.orderCount : 0 })).sort((a, b) => b.orderCount - a.orderCount || b.bookedSales - a.bookedSales),
    }
  }).sort((a, b) => a.studioName.localeCompare(b.studioName))
}

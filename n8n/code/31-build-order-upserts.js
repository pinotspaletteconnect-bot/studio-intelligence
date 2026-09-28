const responses = $input.all().map(item => item.json);
const retrievedAt = new Date().toISOString();
const rows = [];
const keys = new Set();

for (const response of responses) {
  const organizationId = Number(response.organizationId);
  if (response.success !== true || !Number.isSafeInteger(organizationId)) {
    throw new Error('Order enrichment response is unsuccessful or missing organizationId');
  }
  if (!Array.isArray(response.results) || response.results.length !== Number(response.studioCount)) {
    throw new Error('Order enrichment response has incomplete studio results');
  }
  for (const result of response.results) {
    const studioId = Number(result.studioId);
    const brandId = Number(result.brandId);
    if (![studioId, brandId].every(Number.isSafeInteger) || !Array.isArray(result.orders)) {
      throw new Error('Order enrichment result has invalid tenant identifiers or orders');
    }
    if (result.orders.length !== Number(result.orderCount)) {
      throw new Error('Order enrichment result has an incomplete order list');
    }
    for (const order of result.orders) {
      const orderId = String(order.order_id ?? '').trim();
      if (!orderId) throw new Error('Order enrichment result has a missing order ID');
      const key = `${studioId}:${orderId}`;
      if (keys.has(key)) throw new Error('Duplicate studio/order in order enrichment response');
      keys.add(key);
      rows.push({
        organization_id: organizationId,
        brand_id: brandId,
        studio_id: studioId,
        pts_location_id: String(result.locationId),
        ...order,
        order_id: orderId,
        retrieved_at: retrievedAt,
        updated_at: retrievedAt,
      });
    }
  }
}

return rows.length ? [{ json: { rows, rowCount: rows.length } }] : [];

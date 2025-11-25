export async function onRequest(context) {
  const coverageStore = context.env.COVERAGE;
  const sampleStore = context.env.SAMPLES;
  const repeaterStore = context.env.REPEATERS;
  const responseData = {
    coverage: [],
    samples: [],
    repeaters: []
  };

  let cursor = null;
  do {
    const coverageList = await coverageStore.list({ cursor: cursor });
    cursor = coverageList.cursor ?? null;
    coverageList.keys.forEach(c => {
      responseData.coverage.push({
        hash: c.name,
        heard: c.metadata.heard ?? 0,
        lost: c.metadata.lost ?? 0,
        lastHeard: c.metadata.lastHeard ?? 0,
        hitRepeaters: c.metadata.hitRepeaters ?? []
      });
    });
  } while (cursor !== null)

  do {
    const samplesList = await sampleStore.list({ cursor: cursor });
    cursor = samplesList.cursor ?? null;
    samplesList.keys.forEach(s => {
      responseData.samples.push({
        hash: s.name,
        time: s.metadata.time,
        path: s.metadata.path,
      });
    });
  } while (cursor !== null)

  do {
    const repeatersList = await repeaterStore.list({ cursor: cursor });
    repeatersList.keys.forEach(r => {
      responseData.repeaters.push({
        time: r.metadata.time ?? 0,
        id: r.metadata.id,
        name: r.metadata.name,
        lat: r.metadata.lat,
        lon: r.metadata.lon,
        elev: Math.round(r.metadata.elev ?? 0),
      });
    });
  } while (cursor !== null)

  return new Response(JSON.stringify(responseData));
}

const { createApp } = require("./app");

const PORT = process.env.PORT || 3001;
const { app } = createApp({
  eventStoreFile: process.env.EVENT_STORE_FILE || "./data/events.jsonl",
  trackingUrl: process.env.TRACKING_URL || null,
});

app.listen(PORT, () => console.log(`[order-service] listening on :${PORT}`));

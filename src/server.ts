import app from "./app";
import config from "@/config";

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`🚀 Total Stock API server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
});

import express from "express";
import routes from "./routes.js";
import health from "./health.js";

const app = express();
app.use(express.json());

app.use(routes);
app.use(health);

const PORT = Number(process.env.PORT || 5000);

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});

import "reflect-metadata";
import express from "express";
import analysisRoutes from "./routes/analysisRoutes";
import defaultRoute from "./routes/defaultRoute";
import { taskWorker } from "./workers/taskWorker";
import { AppDataSource } from "./data-source"; // Import the DataSource instance

const app = express();

// Middleware
app.use(express.json());

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Routes
app.use("/analysis", analysisRoutes);
app.use("/", defaultRoute);

console.log('Initializing database connection...');
AppDataSource.initialize()
  .then(() => {
    console.log('Database connection initialized successfully');
    
    // Start the worker after successful DB connection
    console.log('Starting task worker...');
    taskWorker().catch(error => {
      console.error('Task worker error:', error);
    });

    // Start the server
    const port = 3000;
    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Error during initialization:', error);
    process.exit(1);
  });

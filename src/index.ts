import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import fileupload from 'express-fileupload';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import config from './config';
import { connectCockroach } from './cockroach';

const app = express();

// Security and logging middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(fileupload());

// Connect to CockroachDB
connectCockroach();

// API routes
app.use('/api', routes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use(errorHandler);

const PORT = config.port || 8080;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

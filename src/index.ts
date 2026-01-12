import express from 'express';
import cors from 'cors';
import { PORT } from './config/env';
import healthRouter from './routes/health.route';
import quizRouter from './routes/quiz.route';
import quizResponseRouter from './routes/quizResponse.route';

const app = express();

app.use(cors());
// Quiz payloads can be large (many screens / rich content). Increase body size limit.
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api', healthRouter);
app.use('/api', quizRouter);
app.use('/api', quizResponseRouter);

app.get('/', (_req, res) => {
  res.send('Quiz Builder backend is running');
});

app.listen(Number(PORT), () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${PORT}`);
});



import express from 'express';
import cors from 'cors';
import { PORT } from './config/env';
import healthRouter from './routes/health.route';
import quizRouter from './routes/quiz.route';
import quizResponseRouter from './routes/quizResponse.route';

const app = express();

app.use(cors());
app.use(express.json());

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



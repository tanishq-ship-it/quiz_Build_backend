import express from 'express';
import cors from 'cors';
import { PORT } from './config/env';
import healthRouter from './routes/health.route';
import quizRouter from './routes/quiz.route';
import quizResponseRouter from './routes/quizResponse.route';
import authRouter from './routes/auth.route';
import userRouter from './routes/user.route';
import publicQuizRouter from './routes/publicQuiz.route';
import publicQuizResponseRouter from './routes/publicQuizResponse.route';
import paymentRouter from './routes/payment.route';
import adminPaymentRouter from './routes/adminPayment.route';
import webhookRouter from './routes/webhook.route';
import webQuizRouter from './routes/webQuiz.route';
import publicWebQuizRouter from './routes/publicWebQuiz.route';
import { authMiddleware } from './middleware/auth.middleware';

const app = express();

app.use(cors());

// Quiz payloads can be large (many screens / rich content). Increase body size limit.
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Public routes
app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/public/quizzes', publicQuizRouter);
app.use('/api/public/quiz-responses', publicQuizResponseRouter);
app.use('/api/public/payments', paymentRouter);
app.use('/api/public/web-quiz', publicWebQuizRouter);

// Webhook routes (RevenueCat webhooks use JSON body)
app.use('/api/webhooks', webhookRouter);

// Protected routes
app.use('/api/quizzes', authMiddleware, quizRouter);
app.use('/api/quiz-responses', authMiddleware, quizResponseRouter);
app.use('/api/users', userRouter);
app.use('/api/payments', authMiddleware, adminPaymentRouter);
app.use('/api/web-quiz', authMiddleware, webQuizRouter);

app.get('/', (_req, res) => {
  res.send('Quiz Builder backend is running');
});

app.listen(Number(PORT), () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${PORT}`);
});

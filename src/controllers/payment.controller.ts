import type { Request, Response } from 'express';
import * as paymentService from '../services/payment.service';
import { isValidPlanType } from '../config/stripe';

// ========== CREATE LEAD (Email Page 1 - Before Payment) ==========

interface CreateLeadBody {
  email1: string;
  quizId?: string;
  quizResponseId?: string;
}

export const createLead = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as CreateLeadBody;

  if (!body.email1) {
    res.status(400).json({ message: 'email1 is required' });
    return;
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email1)) {
    res.status(400).json({ message: 'Invalid email format' });
    return;
  }

  try {
    const lead = await paymentService.createLead({
      email1: body.email1,
      quizId: body.quizId,
      quizResponseId: body.quizResponseId,
    });

    res.status(201).json({
      id: lead.id,
      email1: lead.email1,
      quizId: lead.quizId,
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ message: 'Failed to create lead' });
  }
};

// ========== UPDATE LEAD (Email Page 2 - After Payment/Skip) ==========

interface UpdateLeadBody {
  email2: string;
  planType?: string | null;
  paid: boolean;
  stripeSessionId?: string | null;
}

export const updateLead = async (req: Request, res: Response): Promise<void> => {
  const { leadId } = req.params;
  const body = req.body as UpdateLeadBody;

  if (!leadId) {
    res.status(400).json({ message: 'leadId is required' });
    return;
  }

  if (!body.email2) {
    res.status(400).json({ message: 'email2 is required' });
    return;
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email2)) {
    res.status(400).json({ message: 'Invalid email format' });
    return;
  }

  try {
    const lead = await paymentService.updateLead(leadId, {
      email2: body.email2,
      planType: body.planType,
      paid: body.paid,
      stripeSessionId: body.stripeSessionId,
    });

    res.status(200).json({
      id: lead.id,
      email1: lead.email1,
      email2: lead.email2,
      planType: lead.planType,
      paid: lead.paid,
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ message: 'Failed to update lead' });
  }
};

// ========== GET LEAD ==========

export const getLead = async (req: Request, res: Response): Promise<void> => {
  const { leadId } = req.params;

  if (!leadId) {
    res.status(400).json({ message: 'leadId is required' });
    return;
  }

  try {
    const lead = await paymentService.getLeadById(leadId);

    if (!lead) {
      res.status(404).json({ message: 'Lead not found' });
      return;
    }

    res.status(200).json({
      id: lead.id,
      email1: lead.email1,
      email2: lead.email2,
      planType: lead.planType,
      paid: lead.paid,
      quizId: lead.quizId,
    });
  } catch (error) {
    console.error('Error getting lead:', error);
    res.status(500).json({ message: 'Failed to get lead' });
  }
};

// ========== GET LEAD BY SESSION ID ==========

export const getLeadBySession = async (req: Request, res: Response): Promise<void> => {
  const { sessionId } = req.params;

  if (!sessionId) {
    res.status(400).json({ message: 'sessionId is required' });
    return;
  }

  try {
    const lead = await paymentService.getLeadBySessionId(sessionId);

    if (!lead) {
      res.status(404).json({ message: 'Lead not found for this session' });
      return;
    }

    res.status(200).json({
      id: lead.id,
      email1: lead.email1,
      email2: lead.email2,
      planType: lead.planType,
      paid: lead.paid,
      quizId: lead.quizId,
    });
  } catch (error) {
    console.error('Error getting lead by session:', error);
    res.status(500).json({ message: 'Failed to get lead' });
  }
};

// ========== CREATE CHECKOUT SESSION ==========

interface CreateCheckoutBody {
  leadId: string;
  planType: string;
}

export const createCheckoutSession = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as CreateCheckoutBody;

  if (!body.leadId) {
    res.status(400).json({ message: 'leadId is required' });
    return;
  }

  if (!body.planType) {
    res.status(400).json({ message: 'planType is required' });
    return;
  }

  if (!isValidPlanType(body.planType)) {
    res.status(400).json({ message: `Invalid planType. Must be one of: 1_month, 3_month, 1_year` });
    return;
  }

  try {
    const session = await paymentService.createCheckoutSession({
      leadId: body.leadId,
      planType: body.planType,
    });

    res.status(200).json({
      sessionId: session.sessionId,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: 'Failed to create checkout session' });
  }
};

// ========== ADMIN: GET ALL LEADS ==========

export const getAllLeads = async (_req: Request, res: Response): Promise<void> => {
  try {
    const leads = await paymentService.getAllLeads();
    res.status(200).json(leads);
  } catch (error) {
    console.error('Error getting leads:', error);
    res.status(500).json({ message: 'Failed to get leads' });
  }
};

// ========== ADMIN: GET LEADS BY QUIZ ==========

export const getLeadsByQuiz = async (req: Request, res: Response): Promise<void> => {
  const { quizId } = req.params;

  if (!quizId) {
    res.status(400).json({ message: 'quizId is required' });
    return;
  }

  try {
    const leads = await paymentService.getLeadsByQuizId(quizId);
    res.status(200).json(leads);
  } catch (error) {
    console.error('Error getting leads by quiz:', error);
    res.status(500).json({ message: 'Failed to get leads' });
  }
};

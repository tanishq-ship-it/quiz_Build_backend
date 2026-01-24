import type { Request, Response } from 'express';
import * as paymentService from '../services/payment.service';
import { isValidPlanType } from '../config/revenuecat';

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
    const { lead, signInToken } = await paymentService.createLead({
      email1: body.email1,
      quizId: body.quizId,
      quizResponseId: body.quizResponseId,
    });

    res.status(201).json({
      id: lead.id,
      email1: lead.email1,
      quizId: lead.quizId,
      clerkUserId: lead.clerkUserId, // Return Clerk user ID to use as RevenueCat app_user_id
      signInToken, // Token for web-to-app auto-login
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
  revenuecatUserId?: string | null;
  deviceType?: string | null;
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
      revenuecatUserId: body.revenuecatUserId,
      deviceType: body.deviceType,
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
      clerkUserId: lead.clerkUserId,
      subscriptionStatus: lead.subscriptionStatus,
      subscriptionExpiresAt: lead.subscriptionExpiresAt,
    });
  } catch (error) {
    console.error('Error getting lead:', error);
    res.status(500).json({ message: 'Failed to get lead' });
  }
};

// ========== CHECK SUBSCRIPTION STATUS ==========

export const checkSubscription = async (req: Request, res: Response): Promise<void> => {
  const { leadId } = req.params;

  if (!leadId) {
    res.status(400).json({ message: 'leadId is required' });
    return;
  }

  try {
    const status = await paymentService.checkSubscriptionStatus(leadId);
    res.status(200).json(status);
  } catch (error) {
    console.error('Error checking subscription:', error);
    res.status(500).json({ message: 'Failed to check subscription' });
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

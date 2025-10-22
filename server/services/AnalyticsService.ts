import {
  surveyRepository,
  responseRepository,
  pageRepository,
  questionRepository,
  analyticsRepository
} from "../repositories";
import type { Survey, Response, QuestionWithSubquestions } from "@shared/schema";
import { storage } from "../storage";

/**
 * Service layer for analytics and reporting
 * Handles survey results compilation, question breakdowns, and analytics aggregation
 */
export class AnalyticsService {
  /**
   * Get comprehensive survey results with question breakdowns
   */
  async getSurveyResults(surveyId: string, userId: string): Promise<{
    survey: Survey;
    stats: {
      totalResponses: number;
      completedResponses: number;
      completionRate: number;
    };
    questionBreakdown: Record<string, any>;
  }> {
    // Verify ownership
    const survey = await surveyRepository.findById(surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    if (survey.creatorId !== userId) {
      throw new Error("Access denied - you do not own this survey");
    }

    // Get responses
    const responses = await responseRepository.findBySurvey(surveyId);
    const completedResponses = responses.filter(r => r.completed);

    const totalResponses = responses.length;
    const completedCount = completedResponses.length;
    const completionRate = totalResponses > 0 ? (completedCount / totalResponses) * 100 : 0;

    // Get all questions
    const pages = await pageRepository.findBySurvey(surveyId);
    const allQuestions: QuestionWithSubquestions[] = [];

    for (const page of pages) {
      const questions = await questionRepository.findByPageWithSubquestions(page.id);
      allQuestions.push(...questions);
    }

    // Build question breakdown
    const questionBreakdown: Record<string, any> = {};

    for (const question of allQuestions) {
      questionBreakdown[question.id] = {
        questionId: question.id,
        questionTitle: question.title,
        questionType: question.type,
        totalResponses: 0,
        answers: [],
        breakdown: {}
      };

      for (const response of completedResponses) {
        const answers = await responseRepository.findAnswersByResponse(response.id);
        const questionAnswers = answers.filter(a => a.questionId === question.id);

        if (questionAnswers.length > 0) {
          questionBreakdown[question.id].totalResponses++;

          for (const answer of questionAnswers) {
            // Handle multiple choice and radio questions
            if (question.type === 'multiple_choice' || question.type === 'radio') {
              const value = answer.value;
              let selectedOptions: string[] = [];

              if (Array.isArray(value)) {
                selectedOptions = value;
              } else if (typeof value === 'object' && value !== null) {
                const valueObj = value as Record<string, any>;
                if (valueObj.text) {
                  selectedOptions = Array.isArray(valueObj.text) ? valueObj.text : [valueObj.text];
                } else if (valueObj.selected) {
                  selectedOptions = Array.isArray(valueObj.selected)
                    ? valueObj.selected
                    : [valueObj.selected];
                }
              } else if (typeof value === 'string') {
                selectedOptions = [value];
              }

              selectedOptions.forEach(option => {
                const optionStr = String(option);
                questionBreakdown[question.id].breakdown[optionStr] =
                  (questionBreakdown[question.id].breakdown[optionStr] || 0) + 1;
              });

            // Handle yes/no questions
            } else if (question.type === 'yes_no') {
              const value = answer.value;
              let boolValue: string;

              if (typeof value === 'boolean') {
                boolValue = value ? 'Yes' : 'No';
              } else if (typeof value === 'object' && value !== null) {
                const valueObj = value as Record<string, any>;
                boolValue =
                  valueObj.text === true || valueObj.text === 'true' || valueObj.text === 'Yes'
                    ? 'Yes'
                    : 'No';
              } else {
                boolValue =
                  String(value) === 'true' || String(value) === 'Yes' ? 'Yes' : 'No';
              }

              questionBreakdown[question.id].breakdown[boolValue] =
                (questionBreakdown[question.id].breakdown[boolValue] || 0) + 1;
            }
          }
        }
      }
    }

    return {
      survey,
      stats: {
        totalResponses,
        completedResponses: completedCount,
        completionRate: Math.round(completionRate * 100) / 100
      },
      questionBreakdown
    };
  }

  /**
   * Get question-level analytics
   */
  async getQuestionAnalytics(surveyId: string, userId: string) {
    // Verify ownership
    const survey = await surveyRepository.findById(surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    if (survey.creatorId !== userId) {
      throw new Error("Access denied - you do not own this survey");
    }

    // Use storage for now (could be moved to analyticsRepository)
    return await storage.getQuestionAnalytics(surveyId);
  }

  /**
   * Get page-level analytics
   */
  async getPageAnalytics(surveyId: string, userId: string) {
    // Verify ownership
    const survey = await surveyRepository.findById(surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    if (survey.creatorId !== userId) {
      throw new Error("Access denied - you do not own this survey");
    }

    // Use storage for now (could be moved to analyticsRepository)
    return await storage.getPageAnalytics(surveyId);
  }

  /**
   * Get completion funnel data
   */
  async getCompletionFunnel(surveyId: string, userId: string) {
    // Verify ownership
    const survey = await surveyRepository.findById(surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    if (survey.creatorId !== userId) {
      throw new Error("Access denied - you do not own this survey");
    }

    // Use storage for now (could be moved to analyticsRepository)
    return await storage.getCompletionFunnelData(surveyId);
  }

  /**
   * Get time spent data
   */
  async getTimeSpentData(surveyId: string, userId: string) {
    // Verify ownership
    const survey = await surveyRepository.findById(surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    if (survey.creatorId !== userId) {
      throw new Error("Access denied - you do not own this survey");
    }

    // Use storage for now (could be moved to analyticsRepository)
    return await storage.getTimeSpentData(surveyId);
  }

  /**
   * Get engagement metrics
   */
  async getEngagementMetrics(surveyId: string, userId: string) {
    // Verify ownership
    const survey = await surveyRepository.findById(surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    if (survey.creatorId !== userId) {
      throw new Error("Access denied - you do not own this survey");
    }

    // Use storage for now (could be moved to analyticsRepository)
    return await storage.getEngagementMetrics(surveyId);
  }

  /**
   * Get aggregated question analytics for visualization
   * Returns per-question aggregates ready for charts and summaries
   */
  async getQuestionAggregates(surveyId: string, userId: string) {
    // Verify ownership
    const survey = await surveyRepository.findById(surveyId);
    if (!survey) {
      throw new Error("Survey not found");
    }

    if (survey.creatorId !== userId) {
      throw new Error("Access denied - you do not own this survey");
    }

    // Get aggregates from repository
    const aggregates = await analyticsRepository.getQuestionAggregates(surveyId);

    // Convert Record to Array for easier frontend consumption
    return Object.values(aggregates);
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();

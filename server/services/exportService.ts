import { createObjectCsvWriter } from 'csv-writer';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { storage } from '../storage';
import type { Survey, Response, Answer, Question, LoopGroupSubquestion, QuestionWithSubquestions } from '@shared/schema';
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';

export interface ExportOptions {
  format: 'csv' | 'pdf';
  includeIncomplete?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  questionIds?: string[];
}

export interface ExportedFile {
  filename: string;
  path: string;
  size: number;
  mimeType: string;
}

class ExportService {
  private exportDir = path.join(process.cwd(), 'exports');

  constructor() {
    // Ensure export directory exists
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  async exportSurveyData(surveyId: string, options: ExportOptions): Promise<ExportedFile> {
    const survey = await storage.getSurvey(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }

    const responses = await this.getFilteredResponses(surveyId, options);
    const questions = await this.getAllQuestionsForSurvey(surveyId);

    if (options.format === 'csv') {
      return await this.generateCSV(survey, responses, questions, options);
    } else {
      return await this.generatePDF(survey, responses, questions, options);
    }
  }

  private async getFilteredResponses(surveyId: string, options: ExportOptions): Promise<Response[]> {
    let responses = await storage.getResponsesBySurvey(surveyId);

    // Filter by completion status
    if (!options.includeIncomplete) {
      responses = responses.filter(r => r.completed);
    }

    // Filter by date range
    if (options.dateFrom) {
      responses = responses.filter(r => r.submittedAt && r.submittedAt >= options.dateFrom!);
    }

    if (options.dateTo) {
      responses = responses.filter(r => r.submittedAt && r.submittedAt <= options.dateTo!);
    }

    return responses;
  }

  private async getAllQuestionsForSurvey(surveyId: string): Promise<QuestionWithSubquestions[]> {
    const pages = await storage.getSurveyPages(surveyId);
    const allQuestions: QuestionWithSubquestions[] = [];

    for (const page of pages) {
      const questions = await storage.getQuestionsWithSubquestionsByPage(page.id);
      allQuestions.push(...questions);
    }

    return allQuestions;
  }

  private async generateCSV(
    survey: Survey,
    responses: Response[],
    questions: QuestionWithSubquestions[],
    options: ExportOptions
  ): Promise<ExportedFile> {
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const filename = `${survey.title.replace(/[^a-zA-Z0-9]/g, '_')}_export_${timestamp}.csv`;
    const filePath = path.join(this.exportDir, filename);

    // Build CSV headers
    const headers = this.buildCSVHeaders(questions, options);
    
    // Build CSV records
    const records = await this.buildCSVRecords(responses, questions, options);

    // Create CSV writer
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: headers
    });

    await csvWriter.writeRecords(records);

    const stats = fs.statSync(filePath);
    return {
      filename,
      path: filePath,
      size: stats.size,
      mimeType: 'text/csv'
    };
  }

  private buildCSVHeaders(questions: QuestionWithSubquestions[], options: ExportOptions) {
    const headers: { id: string; title: string }[] = [];

    // Add metadata headers
    headers.push({ id: 'response_id', title: 'Response ID' });
    headers.push({ id: 'recipient_name', title: 'Recipient Name' });
    headers.push({ id: 'recipient_email', title: 'Recipient Email' });
    headers.push({ id: 'completed', title: 'Completed' });
    headers.push({ id: 'submitted_at', title: 'Submitted At' });
    headers.push({ id: 'created_at', title: 'Started At' });

    // Filter questions if specified
    const filteredQuestions = options.questionIds 
      ? questions.filter(q => options.questionIds!.includes(q.id))
      : questions;

    // Add question headers
    for (const question of filteredQuestions) {
      if (question.type === 'loop_group' && question.subquestions) {
        // For loop groups, create separate columns for each iteration
        for (let i = 0; i < 10; i++) { // Support up to 10 iterations
          for (const subquestion of question.subquestions) {
            headers.push({
              id: `${question.id}_${subquestion.id}_${i}`,
              title: `${question.title} - ${subquestion.title} (Instance ${i + 1})`
            });
          }
        }
      } else {
        headers.push({
          id: question.id,
          title: question.title
        });

        // Add additional columns for file uploads
        if (question.type === 'file_upload') {
          headers.push({
            id: `${question.id}_files`,
            title: `${question.title} - File Names`
          });
        }
      }
    }

    return headers;
  }

  private async buildCSVRecords(
    responses: Response[],
    questions: QuestionWithSubquestions[],
    options: ExportOptions
  ) {
    const records = [];

    for (const response of responses) {
      const answers = await storage.getAnswersWithQuestionsByResponse(response.id);
      const recipient = response.recipientId ? await storage.getRecipient(response.recipientId) : null;

      const record: Record<string, any> = {
        response_id: response.id,
        recipient_name: recipient?.name || '',
        recipient_email: recipient?.email || '',
        completed: response.completed ? 'Yes' : 'No',
        submitted_at: response.submittedAt ? format(new Date(response.submittedAt), 'yyyy-MM-dd HH:mm:ss') : '',
        created_at: response.createdAt ? format(new Date(response.createdAt), 'yyyy-MM-dd HH:mm:ss') : ''
      };

      // Filter questions if specified
      const filteredQuestions = options.questionIds 
        ? questions.filter(q => options.questionIds!.includes(q.id))
        : questions;

      // Add answer data
      for (const question of filteredQuestions) {
        const questionAnswers = answers.filter(a => a.questionId === question.id);

        if (question.type === 'loop_group' && question.subquestions) {
          // Handle loop group answers
          for (let i = 0; i < 10; i++) {
            for (const subquestion of question.subquestions) {
              const loopAnswer = questionAnswers.find(a => 
                a.subquestionId === subquestion.id && a.loopIndex === i
              );
              record[`${question.id}_${subquestion.id}_${i}`] = loopAnswer 
                ? this.formatAnswerValue(loopAnswer.value, subquestion.type)
                : '';
            }
          }
        } else {
          const answer = questionAnswers[0];
          if (answer) {
            record[question.id] = this.formatAnswerValue(answer.value, question.type);
            
            // Handle file uploads
            if (question.type === 'file_upload' && answer.value && typeof answer.value === 'object' && 'files' in answer.value) {
              const fileNames = (answer.value as any).files?.map((f: any) => f.originalName).join('; ') || '';
              record[`${question.id}_files`] = fileNames;
            }
          } else {
            record[question.id] = '';
            if (question.type === 'file_upload') {
              record[`${question.id}_files`] = '';
            }
          }
        }
      }

      records.push(record);
    }

    return records;
  }

  private formatAnswerValue(value: any, questionType: string): string {
    if (!value) return '';

    switch (questionType) {
      case 'multiple_choice':
        return Array.isArray(value) ? value.join('; ') : String(value);
      case 'yes_no':
        return value === true ? 'Yes' : value === false ? 'No' : String(value);
      case 'date_time':
        return value ? format(new Date(value), 'yyyy-MM-dd HH:mm:ss') : '';
      case 'file_upload':
        return value && typeof value === 'object' && 'files' in value && (value as any).files?.length ? `${(value as any).files.length} file(s)` : '';
      default:
        return String(value);
    }
  }

  private async generatePDF(
    survey: Survey,
    responses: Response[],
    questions: QuestionWithSubquestions[],
    options: ExportOptions
  ): Promise<ExportedFile> {
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const filename = `${survey.title.replace(/[^a-zA-Z0-9]/g, '_')}_report_${timestamp}.pdf`;
    const filePath = path.join(this.exportDir, filename);

    const doc = new jsPDF();

    // Add title page
    this.addTitlePage(doc, survey, responses);

    // Add summary statistics
    this.addSummaryPage(doc, survey, responses, questions);

    // Add detailed responses
    await this.addResponsesSection(doc, responses, questions);

    // Add question analysis
    await this.addQuestionAnalysis(doc, survey, responses, questions);

    doc.save(filePath);

    const stats = fs.statSync(filePath);
    return {
      filename,
      path: filePath,
      size: stats.size,
      mimeType: 'application/pdf'
    };
  }

  private addTitlePage(doc: jsPDF, survey: Survey, responses: Response[]) {
    // Title
    doc.setFontSize(24);
    doc.text(survey.title, 20, 30);

    // Subtitle
    doc.setFontSize(16);
    doc.text('Survey Report', 20, 45);

    // Survey info
    doc.setFontSize(12);
    doc.text(`Generated on: ${format(new Date(), 'MMMM d, yyyy')}`, 20, 60);
    doc.text(`Total Responses: ${responses.length}`, 20, 75);
    doc.text(`Completed Responses: ${responses.filter(r => r.completed).length}`, 20, 90);

    if (survey.description) {
      doc.text('Description:', 20, 110);
      const splitDescription = doc.splitTextToSize(survey.description, 170);
      doc.text(splitDescription, 20, 125);
    }

    doc.addPage();
  }

  private addSummaryPage(doc: jsPDF, survey: Survey, responses: Response[], questions: QuestionWithSubquestions[]) {
    doc.setFontSize(18);
    doc.text('Summary Statistics', 20, 30);

    const completedResponses = responses.filter(r => r.completed).length;
    const completionRate = responses.length > 0 ? (completedResponses / responses.length * 100) : 0;

    // Summary table
    const summaryData = [
      ['Total Responses', responses.length.toString()],
      ['Completed Responses', completedResponses.toString()],
      ['Completion Rate', `${completionRate.toFixed(1)}%`],
      ['Total Questions', questions.length.toString()],
      ['Survey Status', survey.status],
      ['Created', format(new Date(survey.createdAt!), 'MMM d, yyyy')],
      ['Last Updated', format(new Date(survey.updatedAt!), 'MMM d, yyyy')]
    ];

    autoTable(doc, {
      head: [['Metric', 'Value']],
      body: summaryData,
      startY: 50,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 139, 202] }
    });

    doc.addPage();
  }

  private async addResponsesSection(doc: jsPDF, responses: Response[], questions: QuestionWithSubquestions[]) {
    doc.setFontSize(18);
    doc.text('Response Overview', 20, 30);

    if (responses.length === 0) {
      doc.text('No responses found.', 20, 50);
      return;
    }

    // Response summary table
    const responseData = [];
    for (const response of responses.slice(0, 20)) { // Limit to first 20 for PDF
      const recipient = response.recipientId ? await storage.getRecipient(response.recipientId) : null;
      responseData.push([
        response.id.slice(-8),
        recipient?.name || 'Unknown',
        response.completed ? 'Yes' : 'No',
        response.submittedAt ? format(new Date(response.submittedAt), 'MMM d, yyyy') : 'Not submitted'
      ]);
    }

    autoTable(doc, {
      head: [['Response ID', 'Recipient', 'Completed', 'Submitted']],
      body: responseData,
      startY: 50,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 139, 202] }
    });

    if (responses.length > 20) {
      const lastY = (doc as any).lastAutoTable?.finalY || 100;
      doc.text(`... and ${responses.length - 20} more responses`, 20, lastY + 20);
    }

    doc.addPage();
  }

  private async addQuestionAnalysis(doc: jsPDF, survey: Survey, responses: Response[], questions: QuestionWithSubquestions[]) {
    doc.setFontSize(18);
    doc.text('Question Analysis', 20, 30);

    let yPosition = 50;

    for (const question of questions.slice(0, 10)) { // Limit for PDF space
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 30;
      }

      const answers = [];
      for (const response of responses) {
        const responseAnswers = await storage.getAnswersByResponse(response.id);
        const questionAnswer = responseAnswers.find(a => a.questionId === question.id);
        if (questionAnswer) {
          answers.push(questionAnswer);
        }
      }

      // Question header
      doc.setFontSize(14);
      doc.text(question.title, 20, yPosition);
      yPosition += 15;

      // Question stats
      doc.setFontSize(10);
      doc.text(`Type: ${question.type}`, 20, yPosition);
      doc.text(`Responses: ${answers.length}/${responses.length}`, 120, yPosition);
      yPosition += 15;

      // Answer analysis based on question type
      if (question.type === 'multiple_choice' || question.type === 'radio') {
        const optionCounts = this.analyzeChoiceQuestion(answers, question.options as string[]);
        const analysisData = Object.entries(optionCounts).map(([option, count]) => [option, count.toString()]);
        
        if (analysisData.length > 0) {
          autoTable(doc, {
            head: [['Option', 'Count']],
            body: analysisData,
            startY: yPosition,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [66, 139, 202] },
            margin: { left: 20, right: 20 }
          });
          yPosition = (doc as any).lastAutoTable?.finalY + 15 || yPosition + 50;
        }
      } else if (question.type === 'yes_no') {
        const yesCount = answers.filter(a => a.value === true).length;
        const noCount = answers.filter(a => a.value === false).length;
        
        doc.text(`Yes: ${yesCount} (${answers.length > 0 ? ((yesCount / answers.length) * 100).toFixed(1) : 0}%)`, 30, yPosition);
        doc.text(`No: ${noCount} (${answers.length > 0 ? ((noCount / answers.length) * 100).toFixed(1) : 0}%)`, 30, yPosition + 10);
        yPosition += 25;
      }

      yPosition += 10; // Space between questions
    }

    if (questions.length > 10) {
      doc.text(`... and ${questions.length - 10} more questions`, 20, yPosition);
    }
  }

  private analyzeChoiceQuestion(answers: Answer[], options: string[]): Record<string, number> {
    const counts: Record<string, number> = {};
    
    // Initialize all options with 0
    if (options) {
      options.forEach(option => {
        counts[option] = 0;
      });
    }

    // Count answers
    answers.forEach(answer => {
      if (Array.isArray(answer.value)) {
        // Multiple choice
        answer.value.forEach(val => {
          if (typeof val === 'string') {
            counts[val] = (counts[val] || 0) + 1;
          }
        });
      } else if (typeof answer.value === 'string') {
        // Single choice
        counts[answer.value] = (counts[answer.value] || 0) + 1;
      }
    });

    return counts;
  }

  async cleanupOldExports(maxAgeHours: number = 24): Promise<void> {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    
    try {
      const files = fs.readdirSync(this.exportDir);
      
      for (const file of files) {
        const filePath = path.join(this.exportDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffTime) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      console.error('Error cleaning up exports:', error);
    }
  }

  getExportPath(filename: string): string {
    return path.join(this.exportDir, filename);
  }
}

export const exportService = new ExportService();
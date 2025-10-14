import { useState, useEffect } from "react";
import { evaluatePageConditionalLogic } from "@shared/conditionalLogic";
import type { ConditionalRule, QuestionWithSubquestions } from "@shared/schema";

export function useConditionalLogic(
  conditionalRules: ConditionalRule[],
  answers: Record<string, any>,
  currentPageQuestions: QuestionWithSubquestions[] | undefined
) {
  const [visibleQuestions, setVisibleQuestions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!conditionalRules.length || !currentPageQuestions) {
      // If no rules, all questions are visible
      const allVisible: Record<string, boolean> = {};
      currentPageQuestions?.forEach(q => {
        allVisible[q.id] = true;
      });
      setVisibleQuestions(allVisible);
      return;
    }

    // Evaluate conditional rules
    const evaluationResults = evaluatePageConditionalLogic(conditionalRules, answers);

    // Set all questions as visible by default
    const newVisibility: Record<string, boolean> = {};
    currentPageQuestions.forEach(question => {
      newVisibility[question.id] = true;
    });

    // Apply conditional logic results
    evaluationResults.forEach(result => {
      newVisibility[result.questionId] = result.visible;
    });

    setVisibleQuestions(newVisibility);
  }, [answers, conditionalRules, currentPageQuestions]);

  return { visibleQuestions };
}

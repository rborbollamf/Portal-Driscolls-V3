import type {
  Rule,
  LegalEntity,
  FinancialSnapshot,
  Alert,
  AlertSeverity,
} from "@/types";
import { generateId } from "@/lib/utils";

export interface EvaluationContext {
  legalEntity: LegalEntity;
  financialSnapshot?: FinancialSnapshot;
  satStatus?: any;
  imssStatus?: any;
}

export interface EvaluationResult {
  triggered: boolean;
  severity?: AlertSeverity;
  message?: string;
}

export class RuleEngine {
  static evaluate(rule: Rule, context: EvaluationContext): EvaluationResult {
    if (!rule.isActive) {
      return { triggered: false };
    }

    switch (rule.evaluatorType) {
      case "THRESHOLD":
        return this.evaluateThreshold(rule, context);
      case "BOOLEAN":
        return this.evaluateBoolean(rule, context);
      case "CUSTOM":
        return this.evaluateCustom(rule, context);
      default:
        return { triggered: false };
    }
  }

  private static evaluateThreshold(
    rule: Rule,
    context: EvaluationContext
  ): EvaluationResult {
    const { field, operator, threshold } = rule.config;
    
    if (!context.financialSnapshot) {
      return { triggered: false };
    }

    const value = (context.financialSnapshot as any)[field];
    
    if (value === undefined) {
      return { triggered: false };
    }

    let triggered = false;
    
    switch (operator) {
      case ">":
        triggered = value > threshold;
        break;
      case "<":
        triggered = value < threshold;
        break;
      case ">=":
        triggered = value >= threshold;
        break;
      case "<=":
        triggered = value <= threshold;
        break;
      case "==":
        triggered = value === threshold;
        break;
      default:
        return { triggered: false };
    }

    if (triggered) {
      return {
        triggered: true,
        severity: rule.severityDefault,
        message: `${rule.name}: ${field} (${value}) ${operator} ${threshold}`,
      };
    }

    return { triggered: false };
  }

  private static evaluateBoolean(
    rule: Rule,
    context: EvaluationContext
  ): EvaluationResult {
    const { checkField, expectedValue } = rule.config;

    let actualValue: any;

    if (rule.code === "SAT_OPINION_NEGATIVA") {
      actualValue = context.satStatus?.status;
    } else if (rule.code === "IMSS_SUSPENSION") {
      actualValue = context.imssStatus?.status;
    } else {
      return { triggered: false };
    }

    const triggered = actualValue === expectedValue;

    if (triggered) {
      return {
        triggered: true,
        severity: rule.severityDefault,
        message: `${rule.name}: ${checkField} es ${actualValue}`,
      };
    }

    return { triggered: false };
  }

  private static evaluateCustom(
    rule: Rule,
    context: EvaluationContext
  ): EvaluationResult {
    if (rule.code === "PODERES_VENCIDOS") {
      const { daysBeforeExpiration } = rule.config;
      if (!context.legalEntity.poderesVigentesAt) return { triggered: false };
      const poderesDate = new Date(context.legalEntity.poderesVigentesAt);
      const now = new Date();
      const daysUntilExpiration = Math.floor(
        (poderesDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiration < 0) {
        return {
          triggered: true,
          severity: rule.severityDefault,
          message: `${rule.name}: Los poderes vencieron hace ${Math.abs(daysUntilExpiration)} días`,
        };
      } else if (daysUntilExpiration < daysBeforeExpiration) {
        return {
          triggered: true,
          severity: rule.severityDefault,
          message: `${rule.name}: Los poderes vencen en ${daysUntilExpiration} días`,
        };
      }
    }

    return { triggered: false };
  }

  static createAlert(
    legalEntityId: string,
    rule: Rule,
    result: EvaluationResult
  ): Alert {
    return {
      id: generateId(),
      legalEntityId,
      ruleCode: rule.code,
      severity: result.severity || rule.severityDefault,
      message: result.message || rule.description,
      createdAt: new Date().toISOString(),
    };
  }

  static evaluateAll(
    rules: Rule[],
    context: EvaluationContext
  ): { results: EvaluationResult[]; alerts: Alert[] } {
    const results: EvaluationResult[] = [];
    const alerts: Alert[] = [];

    rules.forEach((rule) => {
      const result = this.evaluate(rule, context);
      results.push(result);

      if (result.triggered) {
        const alert = this.createAlert(context.legalEntity.id, rule, result);
        alerts.push(alert);
      }
    });

    return { results, alerts };
  }
}

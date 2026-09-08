import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../database/database.service';
import { CreateExpenseDto, DecideExpenseDto } from './dto/expenses.dto';
import { Expense, Approval } from '../../database/database.types';

@Injectable()
export class ExpensesService {
  constructor(private readonly db: DatabaseService) {}

  async createExpense(mrId: string, dto: CreateExpenseDto) {
    const expense: Expense = {
      id: `exp-${uuidv4().substring(0, 8)}`,
      mr_id: mrId,
      category: dto.category,
      amount: Math.round(dto.amount * 100) / 100,
      receipt_file_key: dto.receipt_file_key,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };

    this.db.expenses.push(expense);

    // Also register an approval record in the generic approvals table (§4.3)
    const approval: Approval = {
      id: `appr-${uuidv4().substring(0, 8)}`,
      entity_type: 'EXPENSE',
      entity_id: expense.id,
      requested_by: mrId,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };
    this.db.approvals.push(approval);

    return {
      message: 'Expense submitted for manager approval',
      expense,
      approval_id: approval.id,
    };
  }

  async getMyExpenses(mrId: string, month?: string) {
    return this.db.expenses
      .filter((e) => e.mr_id === mrId)
      .filter((e) => (month ? e.created_at.startsWith(month) : true))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async getAdminExpenses(filter: { mr_id?: string; status?: string; category?: string }) {
    return this.db.expenses
      .filter((e) => (filter.mr_id ? e.mr_id === filter.mr_id : true))
      .filter((e) => (filter.status ? e.status === filter.status : true))
      .filter((e) => (filter.category ? e.category === filter.category : true))
      .map((e) => {
        const mr = this.db.users.find((u) => u.id === e.mr_id);
        return {
          ...e,
          mr_name: mr?.name || 'Unknown MR',
        };
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async approveExpense(id: string, approverId: string, dto: DecideExpenseDto) {
    const expense = this.db.expenses.find((e) => e.id === id);
    if (!expense) throw new NotFoundException('Expense not found');

    if (expense.status !== 'PENDING') {
      throw new BadRequestException(`Expense already ${expense.status}`);
    }

    expense.status = 'APPROVED';

    // Update corresponding approval record
    const approval = this.db.approvals.find(
      (a) => a.entity_type === 'EXPENSE' && a.entity_id === id,
    );
    if (approval) {
      approval.status = 'APPROVED';
      approval.approver_id = approverId;
      approval.comment = dto.comment;
      approval.decided_at = new Date().toISOString();
    }

    return { message: 'Expense approved successfully', expense };
  }

  async rejectExpense(id: string, approverId: string, dto: DecideExpenseDto) {
    const expense = this.db.expenses.find((e) => e.id === id);
    if (!expense) throw new NotFoundException('Expense not found');

    if (expense.status !== 'PENDING') {
      throw new BadRequestException(`Expense already ${expense.status}`);
    }

    expense.status = 'REJECTED';

    const approval = this.db.approvals.find(
      (a) => a.entity_type === 'EXPENSE' && a.entity_id === id,
    );
    if (approval) {
      approval.status = 'REJECTED';
      approval.approver_id = approverId;
      approval.comment = dto.comment;
      approval.decided_at = new Date().toISOString();
    }

    return { message: 'Expense rejected', expense };
  }
}

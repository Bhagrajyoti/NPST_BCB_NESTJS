import { Injectable } from '@nestjs/common';
import { ReportQueryDto } from './dto/report-query.dto';
import {
  ReportTransaction,
  TransactionProvider,
} from './providers/transaction.provider';

@Injectable()
export class ReportingService {
  constructor(private readonly transactionProvider: TransactionProvider) {}

  private async getFilteredTransactions(
    filters: ReportQueryDto,
  ): Promise<ReportTransaction[]> {
    const transactions = await this.transactionProvider.getTransactions();

    return transactions.filter((transaction) => {
      const createdAt = new Date(transaction.created_at);

      if (filters.fromDate) {
        const fromDate = new Date(filters.fromDate);
        if (createdAt < fromDate) {
          return false;
        }
      }

      if (filters.toDate) {
        const toDate = new Date(filters.toDate);
        if (createdAt > toDate) {
          return false;
        }
      }

      if (
        filters.cif &&
        transaction.sender_cif.toLowerCase() !== filters.cif.toLowerCase()
      ) {
        return false;
      }

      if (
        filters.branch &&
        transaction.branch.toLowerCase() !== filters.branch.toLowerCase()
      ) {
        return false;
      }

      if (
        filters.status &&
        transaction.status.toLowerCase() !== filters.status.toLowerCase()
      ) {
        return false;
      }

      if (
        filters.transactionType &&
        transaction.transaction_type.toLowerCase() !==
          filters.transactionType.toLowerCase()
      ) {
        return false;
      }

      if (
        filters.channel &&
        transaction.channel.toLowerCase() !== filters.channel.toLowerCase()
      ) {
        return false;
      }

      if (
        filters.minAmount &&
        transaction.amount < Number(filters.minAmount)
      ) {
        return false;
      }

      if (
        filters.maxAmount &&
        transaction.amount > Number(filters.maxAmount)
      ) {
        return false;
      }

      return true;
    });
  }

  async dailySummary(filters: ReportQueryDto): Promise<unknown> {
    const transactions = await this.getFilteredTransactions(filters);

    const successfulTransactions = transactions.filter(
      (transaction) => transaction.status === 'SUCCESS',
    );

    const failedTransactions = transactions.filter(
      (transaction) => transaction.status === 'FAILED',
    );

    const pendingTransactions = transactions.filter(
      (transaction) => transaction.status === 'PENDING',
    );

    const totalCreditAmount = transactions
      .filter((transaction) => transaction.transaction_type === 'CREDIT')
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const totalDebitAmount = transactions
      .filter((transaction) => transaction.transaction_type === 'DEBIT')
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    return {
      report: 'Daily Transaction Summary',
      filters,
      totalTransaction: transactions.length,
      successfulTransaction: successfulTransactions.length,
      failedTransaction: failedTransactions.length,
      pendingTransaction: pendingTransactions.length,
      totalCreditAmount,
      totalDebitAmount,
    };
  }

  async failedTransactions(filters: ReportQueryDto): Promise<unknown> {
    const transactions = await this.getFilteredTransactions(filters);

    const data = transactions.filter(
      (transaction) => transaction.status === 'FAILED',
    );

    return {
      report: 'Failed Transaction Report',
      filters,
      total: data.length,
      data,
    };
  }

  async highValueTransactions(filters: ReportQueryDto): Promise<unknown> {
    const transactions = await this.getFilteredTransactions(filters);

    const minAmount = filters.minAmount
      ? Number(filters.minAmount)
      : 50000;

    const data = transactions.filter(
      (transaction) => transaction.amount >= minAmount,
    );

    return {
      report: 'High Value Transaction Report',
      filters: {
        ...filters,
        minAmount,
      },
      total: data.length,
      data,
    };
  }

  async branchWise(filters: ReportQueryDto): Promise<unknown> {
    const transactions = await this.getFilteredTransactions(filters);

    const branchMap = new Map<
      string,
      { transactionCount: number; totalAmount: number }
    >();

    for (const transaction of transactions) {
      const existing = branchMap.get(transaction.branch);

      if (existing) {
        existing.transactionCount += 1;
        existing.totalAmount += transaction.amount;
      } else {
        branchMap.set(transaction.branch, {
          transactionCount: 1,
          totalAmount: transaction.amount,
        });
      }
    }

    const data = Array.from(branchMap.entries()).map(
      ([branch, summary]) => ({
        branch,
        ...summary,
      }),
    );

    return {
      report: 'Branch-wise Transaction Report',
      filters,
      totalBranches: data.length,
      data,
    };
  }

  async channelWise(filters: ReportQueryDto): Promise<unknown> {
    const transactions = await this.getFilteredTransactions(filters);

    const channelMap = new Map<
      string,
      { transactionCount: number; totalAmount: number }
    >();

    for (const transaction of transactions) {
      const existing = channelMap.get(transaction.channel);

      if (existing) {
        existing.transactionCount += 1;
        existing.totalAmount += transaction.amount;
      } else {
        channelMap.set(transaction.channel, {
          transactionCount: 1,
          totalAmount: transaction.amount,
        });
      }
    }

    const data = Array.from(channelMap.entries()).map(
      ([channel, summary]) => ({
        channel,
        ...summary,
      }),
    );

    return {
      report: 'Channel-wise Transaction Report',
      filters,
      totalChannels: data.length,
      data,
    };
  }
}
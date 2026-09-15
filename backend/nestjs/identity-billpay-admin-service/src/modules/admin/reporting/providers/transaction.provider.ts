
import { Injectable } from '@nestjs/common';

export type TransactionStatus = 'SUCCESS' | 'FAILED' | 'PENDING';
export type TransactionType = 'CREDIT' | 'DEBIT';

export interface ReportTransaction {
  txn_id: string;
  utr: string;
  channel: string;
  payment_mode: string;
  sender_cif: string;
  sender_name: string;
  sender_account: string;
  receiver_name: string;
  receiver_account: string;
  receiver_bank: string;
  amount: number;
  status: TransactionStatus;
  transaction_type: TransactionType;
  branch: string;
  created_at: string;
  switch_response_code: string;
  risk_score: number;
}

@Injectable()
export class TransactionProvider {
  async getTransactions(): Promise<ReportTransaction[]> {
    return [
      {
        txn_id: 'TXN-20260907-001',
        utr: 'UTR-IMPS-001',
        channel: 'MOBILE_APP',
        payment_mode: 'IMPS',
        sender_cif: 'CIF100001',
        sender_name: 'Arjun Mehta',
        sender_account: '101000000012',
        receiver_name: 'Sneha Mehta',
        receiver_account: '99182390129182',
        receiver_bank: 'Bharat Co-operative Bank',
        amount: 5000,
        status: 'SUCCESS',
        transaction_type: 'DEBIT',
        branch: 'MUMBAI_MAIN',
        created_at: '2026-09-07T06:15:00Z',
        switch_response_code: '00',
        risk_score: 12,
      },
      {
        txn_id: 'TXN-20260907-002',
        utr: 'UTR-NEFT-002',
        channel: 'MOBILE_APP',
        payment_mode: 'NEFT',
        sender_cif: 'CIF100002',
        sender_name: 'Rahul Sharma',
        sender_account: '101000000013',
        receiver_name: 'Amit Verma',
        receiver_account: '99182390129183',
        receiver_bank: 'Bharat Co-operative Bank',
        amount: 15000,
        status: 'FAILED',
        transaction_type: 'DEBIT',
        branch: 'DELHI_MAIN',
        created_at: '2026-09-07T07:20:00Z',
        switch_response_code: '91',
        risk_score: 35,
      },
      {
        txn_id: 'TXN-20260907-003',
        utr: 'UTR-UPI-003',
        channel: 'MOBILE_APP',
        payment_mode: 'UPI',
        sender_cif: 'CIF100003',
        sender_name: 'Priya Singh',
        sender_account: '101000000014',
        receiver_name: 'Neha Gupta',
        receiver_account: '99182390129184',
        receiver_bank: 'Bharat Co-operative Bank',
        amount: 2500,
        status: 'PENDING',
        transaction_type: 'DEBIT',
        branch: 'MUMBAI_MAIN',
        created_at: '2026-09-07T08:10:00Z',
        switch_response_code: '05',
        risk_score: 18,
      },
      {
        txn_id: 'TXN-20260907-004',
        utr: 'UTR-IMPS-004',
        channel: 'MOBILE_APP',
        payment_mode: 'IMPS',
        sender_cif: 'CIF100004',
        sender_name: 'Vikas Kumar',
        sender_account: '101000000015',
        receiver_name: 'Rohit Kumar',
        receiver_account: '99182390129185',
        receiver_bank: 'Bharat Co-operative Bank',
        amount: 75000,
        status: 'SUCCESS',
        transaction_type: 'DEBIT',
        branch: 'BANGALORE_MAIN',
        created_at: '2026-09-07T09:30:00Z',
        switch_response_code: '00',
        risk_score: 8,
      },
      {
        txn_id: 'TXN-20260907-005',
        utr: 'UTR-NEFT-005',
        channel: 'MOBILE_APP',
        payment_mode: 'NEFT',
        sender_cif: 'CIF100005',
        sender_name: 'Neeraj Jain',
        sender_account: '101000000016',
        receiver_name: 'Karan Malhotra',
        receiver_account: '99182390129186',
        receiver_bank: 'Bharat Co-operative Bank',
        amount: 125000,
        status: 'SUCCESS',
        transaction_type: 'DEBIT',
        branch: 'DELHI_MAIN',
        created_at: '2026-09-07T10:45:00Z',
        switch_response_code: '00',
        risk_score: 22,
      },
      {
        txn_id: 'TXN-20260908-006',
        utr: 'UTR-UPI-006',
        channel: 'MOBILE_APP',
        payment_mode: 'UPI',
        sender_cif: 'CIF100006',
        sender_name: 'Ankit Patel',
        sender_account: '101000000017',
        receiver_name: 'Manish Shah',
        receiver_account: '99182390129187',
        receiver_bank: 'Bharat Co-operative Bank',
        amount: 3500,
        status: 'FAILED',
        transaction_type: 'CREDIT',
        branch: 'AHMEDABAD_MAIN',
        created_at: '2026-09-08T06:30:00Z',
        switch_response_code: '12',
        risk_score: 45,
      },
      {
        txn_id: 'TXN-20260908-007',
        utr: 'UTR-IMPS-007',
        channel: 'MOBILE_APP',
        payment_mode: 'IMPS',
        sender_cif: 'CIF100007',
        sender_name: 'Pooja Nair',
        sender_account: '101000000018',
        receiver_name: 'Kavya Nair',
        receiver_account: '99182390129188',
        receiver_bank: 'Bharat Co-operative Bank',
        amount: 22000,
        status: 'SUCCESS',
        transaction_type: 'CREDIT',
        branch: 'BANGALORE_MAIN',
        created_at: '2026-09-08T08:00:00Z',
        switch_response_code: '00',
        risk_score: 10,
      },
    ];
  }
}


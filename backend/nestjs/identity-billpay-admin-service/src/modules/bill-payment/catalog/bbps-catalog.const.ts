export const BBPS_CATEGORIES = ['ELECTRICITY', 'GAS', 'WATER'] as const;

export type BbpsCategory = (typeof BBPS_CATEGORIES)[number];

export interface BbpsCatalogEntry {
  billerCode: string;
  billerName: string;
  category: BbpsCategory;
  consumerNumber: string;
  registeredMobile: string;
  billNumber: string;
  customerName: string;
  amount: number;
  dueDate: string;
}

/** Two billers per category — used for category list, fetch, and pay (mock BBPS). */
export const BBPS_CATALOG: BbpsCatalogEntry[] = [
  {
    billerCode: 'ELEC-MSEDCL-01',
    billerName: 'Maharashtra State Electricity (MSEDCL)',
    category: 'ELECTRICITY',
    consumerNumber: '100000000001',
    registeredMobile: '9000000001',
    billNumber: 'BBPS-ELEC-001',
    customerName: 'Demo Customer Elec 1',
    amount: 1250.5,
    dueDate: '2026-12-31',
  },
  {
    billerCode: 'ELEC-BESCOM-01',
    billerName: 'BESCOM Electricity',
    category: 'ELECTRICITY',
    consumerNumber: '100000000002',
    registeredMobile: '9000000002',
    billNumber: 'BBPS-ELEC-002',
    customerName: 'Demo Customer Elec 2',
    amount: 980,
    dueDate: '2026-12-31',
  },
  {
    billerCode: 'GAS-GAIL-01',
    billerName: 'GAIL Gas',
    category: 'GAS',
    consumerNumber: '100000000011',
    registeredMobile: '9000000011',
    billNumber: 'BBPS-GAS-001',
    customerName: 'Demo Customer Gas 1',
    amount: 900,
    dueDate: '2026-12-31',
  },
  {
    billerCode: 'GAS-IGL-01',
    billerName: 'Indraprastha Gas (IGL)',
    category: 'GAS',
    consumerNumber: '100000000012',
    registeredMobile: '9000000012',
    billNumber: 'BBPS-GAS-002',
    customerName: 'Demo Customer Gas 2',
    amount: 650.75,
    dueDate: '2026-12-31',
  },
  {
    billerCode: 'WATER-DJB-01',
    billerName: 'Delhi Jal Board',
    category: 'WATER',
    consumerNumber: '100000000021',
    registeredMobile: '9000000021',
    billNumber: 'BBPS-WATER-001',
    customerName: 'Demo Customer Water 1',
    amount: 480,
    dueDate: '2026-12-31',
  },
  {
    billerCode: 'WATER-BWSSB-01',
    billerName: 'Bangalore Water Supply (BWSSB)',
    category: 'WATER',
    consumerNumber: '100000000022',
    registeredMobile: '9000000022',
    billNumber: 'BBPS-WATER-002',
    customerName: 'Demo Customer Water 2',
    amount: 520.25,
    dueDate: '2026-12-31',
  },
];

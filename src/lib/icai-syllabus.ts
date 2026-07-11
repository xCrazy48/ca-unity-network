// ICAI New Scheme syllabus — CA Final chapters (as per current ICAI Study
// Material / BoS). CA Inter chapters live in the `chapters` DB table and are
// already New Scheme, so we do not repeat them here.
//
// Weightage bands come from the ICAI syllabus skill assessment matrix.
// Update this file whenever ICAI revises the New Scheme syllabus.

export type SyllabusChapter = {
  name: string;
  weightage_min: number;
  weightage_max: number;
};

export const FINAL_CHAPTERS: Record<string, SyllabusChapter[]> = {
  // Paper 1 — Financial Reporting
  f1: [
    { name: "Framework for Preparation & Presentation of Financial Statements (Ind AS)", weightage_min: 5, weightage_max: 10 },
    { name: "Ind AS on Presentation of Items in Financial Statements (Ind AS 1, 34, 7)", weightage_min: 5, weightage_max: 10 },
    { name: "Ind AS on Measurement based on Accounting Policies (Ind AS 8, 10, 113)", weightage_min: 5, weightage_max: 10 },
    { name: "Ind AS 115 — Revenue from Contracts with Customers", weightage_min: 5, weightage_max: 10 },
    { name: "Ind AS on Assets (Ind AS 2, 16, 116, 23, 36, 105, 38, 40)", weightage_min: 10, weightage_max: 15 },
    { name: "Ind AS on Liabilities (Ind AS 19, 37)", weightage_min: 5, weightage_max: 10 },
    { name: "Ind AS on Items impacting Financial Statements (Ind AS 12, 21)", weightage_min: 5, weightage_max: 10 },
    { name: "Ind AS on Disclosures (Ind AS 24, 33, 108, 17)", weightage_min: 5, weightage_max: 10 },
    { name: "Accounting & Reporting of Financial Instruments (Ind AS 32, 109, 107)", weightage_min: 10, weightage_max: 15 },
    { name: "Business Combinations & Corporate Restructuring (Ind AS 103)", weightage_min: 10, weightage_max: 15 },
    { name: "Consolidated Financial Statements (Ind AS 110, 111, 28, 27, 112)", weightage_min: 10, weightage_max: 15 },
    { name: "First-time Adoption of Ind AS (Ind AS 101)", weightage_min: 5, weightage_max: 10 },
    { name: "Analysis of Financial Statements", weightage_min: 5, weightage_max: 10 },
    { name: "Integrated Reporting", weightage_min: 5, weightage_max: 10 },
    { name: "Corporate Social Responsibility Reporting", weightage_min: 5, weightage_max: 10 },
  ],
  // Paper 2 — Advanced Financial Management
  f2: [
    { name: "Financial Policy & Corporate Strategy", weightage_min: 5, weightage_max: 10 },
    { name: "Risk Management", weightage_min: 5, weightage_max: 10 },
    { name: "Advanced Capital Budgeting Decisions", weightage_min: 10, weightage_max: 15 },
    { name: "Security Analysis", weightage_min: 5, weightage_max: 10 },
    { name: "Security Valuation", weightage_min: 10, weightage_max: 15 },
    { name: "Portfolio Management", weightage_min: 10, weightage_max: 15 },
    { name: "Securitization", weightage_min: 5, weightage_max: 10 },
    { name: "Mutual Funds", weightage_min: 5, weightage_max: 10 },
    { name: "Derivatives Analysis & Valuation", weightage_min: 10, weightage_max: 15 },
    { name: "Foreign Exchange Exposure & Risk Management", weightage_min: 10, weightage_max: 15 },
    { name: "International Financial Management", weightage_min: 5, weightage_max: 10 },
    { name: "Interest Rate Risk Management", weightage_min: 5, weightage_max: 10 },
    { name: "Business Valuation", weightage_min: 10, weightage_max: 15 },
    { name: "Mergers, Acquisitions & Corporate Restructuring", weightage_min: 10, weightage_max: 15 },
    { name: "Startup Finance", weightage_min: 5, weightage_max: 10 },
  ],
  // Paper 3 — Advanced Auditing, Assurance and Professional Ethics
  f3: [
    { name: "Quality Control (SQC 1, SA 220)", weightage_min: 5, weightage_max: 10 },
    { name: "General Auditing Principles & Auditor's Responsibilities", weightage_min: 5, weightage_max: 10 },
    { name: "Audit Planning, Strategy & Execution", weightage_min: 10, weightage_max: 15 },
    { name: "Materiality, Risk Assessment & Internal Control", weightage_min: 10, weightage_max: 15 },
    { name: "Audit Evidence", weightage_min: 5, weightage_max: 10 },
    { name: "Completion & Review", weightage_min: 5, weightage_max: 10 },
    { name: "Reporting (SA 700 series, CARO 2020)", weightage_min: 10, weightage_max: 15 },
    { name: "Specialised Areas (SAs 800/805/810)", weightage_min: 5, weightage_max: 10 },
    { name: "Audit-related Services (SREs, SAEs, SRSs)", weightage_min: 5, weightage_max: 10 },
    { name: "Review of Financial Information", weightage_min: 5, weightage_max: 10 },
    { name: "Prospective Financial Information & Other Assurance Services", weightage_min: 5, weightage_max: 10 },
    { name: "Digital Auditing & Assurance", weightage_min: 5, weightage_max: 10 },
    { name: "Group Audits", weightage_min: 5, weightage_max: 10 },
    { name: "Special Features of Audit of Banks & NBFCs", weightage_min: 5, weightage_max: 10 },
    { name: "Overview of Audit of PSUs", weightage_min: 5, weightage_max: 10 },
    { name: "Internal Audit", weightage_min: 5, weightage_max: 10 },
    { name: "Due Diligence, Investigation & Forensic Accounting", weightage_min: 5, weightage_max: 10 },
    { name: "Sustainable Development Goals (SDG) & Environment, Social and Governance (ESG) Assurance", weightage_min: 5, weightage_max: 10 },
    { name: "Professional Ethics & Liabilities of Auditors", weightage_min: 15, weightage_max: 20 },
  ],
  // Paper 4 — Direct Tax Laws & International Taxation
  f4: [
    { name: "Basis of Charge, Residential Status, Income Deemed to Accrue/Arise", weightage_min: 5, weightage_max: 10 },
    { name: "Incomes which do not form part of Total Income", weightage_min: 5, weightage_max: 10 },
    { name: "Salaries, House Property, Capital Gains, Other Sources", weightage_min: 5, weightage_max: 10 },
    { name: "Profits & Gains of Business or Profession", weightage_min: 10, weightage_max: 15 },
    { name: "Income of Other Persons included in Assessee's Total Income; Aggregation, Set-off & Carry Forward of Losses", weightage_min: 5, weightage_max: 10 },
    { name: "Deductions, Rebates & Reliefs", weightage_min: 5, weightage_max: 10 },
    { name: "Taxation of Companies, LLPs & Business Trusts", weightage_min: 10, weightage_max: 15 },
    { name: "Taxation of Non-residents", weightage_min: 10, weightage_max: 15 },
    { name: "Assessment Procedure", weightage_min: 5, weightage_max: 10 },
    { name: "Appeals, Revisions, Dispute Resolution", weightage_min: 5, weightage_max: 10 },
    { name: "Penalties, Offences & Prosecution", weightage_min: 5, weightage_max: 10 },
    { name: "Liability in Special Cases; Miscellaneous Provisions", weightage_min: 5, weightage_max: 10 },
    { name: "Tax Deduction & Collection at Source; Advance Tax; Refunds", weightage_min: 5, weightage_max: 10 },
    { name: "Tax Planning, Tax Avoidance & Tax Evasion (incl. GAAR)", weightage_min: 5, weightage_max: 10 },
    { name: "Transfer Pricing", weightage_min: 10, weightage_max: 15 },
    { name: "Non-resident Taxation & DTAAs", weightage_min: 10, weightage_max: 15 },
    { name: "Model Tax Conventions (OECD, UN, US)", weightage_min: 5, weightage_max: 10 },
    { name: "Application & Interpretation of Tax Treaties", weightage_min: 5, weightage_max: 10 },
    { name: "Fundamentals of BEPS", weightage_min: 5, weightage_max: 10 },
    { name: "Overview of Model GAAR", weightage_min: 5, weightage_max: 10 },
    { name: "Latest Developments in International Taxation", weightage_min: 5, weightage_max: 10 },
  ],
  // Paper 5 — Indirect Tax Laws
  f5: [
    { name: "GST — Constitutional Framework, Concept & Charge", weightage_min: 5, weightage_max: 10 },
    { name: "Supply under GST", weightage_min: 5, weightage_max: 10 },
    { name: "Charge of GST & Reverse Charge", weightage_min: 5, weightage_max: 10 },
    { name: "Place of Supply", weightage_min: 5, weightage_max: 10 },
    { name: "Time & Value of Supply", weightage_min: 5, weightage_max: 10 },
    { name: "Input Tax Credit", weightage_min: 10, weightage_max: 15 },
    { name: "Registration", weightage_min: 5, weightage_max: 10 },
    { name: "Tax Invoice, Credit & Debit Notes; E-way Bill", weightage_min: 5, weightage_max: 10 },
    { name: "Accounts, Records & E-invoicing", weightage_min: 5, weightage_max: 10 },
    { name: "Payment of Tax (incl. TDS/TCS)", weightage_min: 5, weightage_max: 10 },
    { name: "Returns", weightage_min: 5, weightage_max: 10 },
    { name: "Import & Export under GST; Refunds", weightage_min: 5, weightage_max: 10 },
    { name: "Job Work", weightage_min: 5, weightage_max: 10 },
    { name: "Assessment & Audit", weightage_min: 5, weightage_max: 10 },
    { name: "Inspection, Search, Seizure & Arrest; Demands & Recovery", weightage_min: 5, weightage_max: 10 },
    { name: "Liability to Pay in Certain Cases; Offences & Penalties", weightage_min: 5, weightage_max: 10 },
    { name: "Advance Ruling; Appeals & Revision", weightage_min: 5, weightage_max: 10 },
    { name: "Miscellaneous Provisions under GST", weightage_min: 5, weightage_max: 10 },
    { name: "Customs — Levy, Types of Duties, Classification & Valuation", weightage_min: 10, weightage_max: 15 },
    { name: "Customs — Importation, Exportation & Transportation", weightage_min: 5, weightage_max: 10 },
    { name: "Customs — Duty Drawback, Refunds", weightage_min: 5, weightage_max: 10 },
    { name: "Foreign Trade Policy — Basic Concepts, Export Promotion Schemes", weightage_min: 5, weightage_max: 10 },
  ],
  // Paper 6 — Integrated Business Solutions (multi-disciplinary case study)
  f6: [
    { name: "Integrated Case Studies — Financial Reporting & Ind AS", weightage_min: 15, weightage_max: 20 },
    { name: "Integrated Case Studies — Advanced Financial Management", weightage_min: 15, weightage_max: 20 },
    { name: "Integrated Case Studies — Advanced Auditing & Professional Ethics", weightage_min: 10, weightage_max: 15 },
    { name: "Integrated Case Studies — Direct Tax & International Taxation", weightage_min: 15, weightage_max: 20 },
    { name: "Integrated Case Studies — Indirect Tax Laws (GST & Customs)", weightage_min: 10, weightage_max: 15 },
    { name: "Integrated Case Studies — Corporate & Economic Laws", weightage_min: 10, weightage_max: 15 },
    { name: "Integrated Case Studies — Strategic Cost & Performance Management", weightage_min: 10, weightage_max: 15 },
    { name: "Integrated Case Studies — Risk Management, Governance & Sustainability (ESG)", weightage_min: 5, weightage_max: 10 },
  ],
};

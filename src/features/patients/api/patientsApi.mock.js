// Synthetic data copied from docs/prototype/Sky_Claims_login_and_roles_v2.html (PATIENTS, TL).
// Shapes match the NEEDED endpoints described in docs/03 - Doctor and Staff/doctor_flow_apis.md.

export const MOCK_PATIENTS = [
  {
    user_id: 'SYN-P-1042',
    sex: 'F',
    age: 46,
    diagnosis: { code: 'K80.2', name: 'Calculus of gall bladder' },
    procedure_name: 'Laparoscopic cholecystectomy',
    treating_doctor: 'Dr. S. Menon',
    claim_id: 'SUV-261028-01',
    claim_stage: 'Pre-submission',
    admission_date: '2026-10-08',
    discharge_date: '2026-10-11',
  },
  {
    user_id: 'SYN-P-1077',
    sex: 'M',
    age: 61,
    diagnosis: { code: 'I21.0', name: 'Acute STEMI, anterior wall' },
    procedure_name: 'PTCA with single DES',
    treating_doctor: 'Dr. R. Varma',
    claim_id: 'SUV-261027-03',
    claim_stage: 'In treatment',
    admission_date: '2026-10-26',
    discharge_date: null,
  },
  {
    user_id: 'SYN-P-1103',
    sex: 'F',
    age: 32,
    diagnosis: { code: 'O82', name: 'Delivery by caesarean section' },
    procedure_name: 'Elective LSCS',
    treating_doctor: 'Dr. S. Menon',
    claim_id: 'SUV-261026-02',
    claim_stage: 'Discharge',
    admission_date: '2026-10-24',
    discharge_date: '2026-10-27',
  },
  {
    user_id: 'SYN-P-1120',
    sex: 'M',
    age: 54,
    diagnosis: { code: 'H25.1', name: 'Age-related nuclear cataract' },
    procedure_name: 'Phaco with foldable IOL, right eye',
    treating_doctor: 'Dr. P. Nair',
    claim_id: 'SUV-261025-05',
    claim_stage: 'Settled',
    admission_date: '2026-10-20',
    discharge_date: '2026-10-20',
  },
]

const src = (file_id, original_filename, page_number = 1) => ({
  file_id,
  original_filename,
  page_number,
})

export const MOCK_TIMELINES = {
  'SYN-P-1042': [
    {
      date: '2026-10-04',
      title: 'OPD consultation',
      text: 'Symptomatic cholelithiasis, surgery advised',
      source: src('f-1042-01', 'opd_consultation.pdf'),
    },
    {
      date: '2026-10-05',
      title: 'USG abdomen',
      text: 'Multiple calculi, largest 14 mm',
      source: src('f-1042-02', 'usg_abdomen.pdf'),
    },
    {
      date: '2026-10-08',
      title: 'Admitted',
      text: 'Planned admission',
      source: src('f-1042-01', 'opd_consultation.pdf'),
    },
    {
      date: '2026-10-09',
      title: 'Surgery',
      text: 'Laparoscopic cholecystectomy under GA',
      source: src('f-1042-03', 'operation_note.pdf'),
    },
    {
      date: '2026-10-11',
      title: 'Discharged',
      text: 'Uneventful recovery; histopathology awaited',
      source: src('f-1042-05', 'discharge_summary.pdf'),
    },
  ],
  'SYN-P-1077': [
    {
      date: '2026-10-26',
      title: 'Admitted via ER',
      text: 'Chest pain 2 h; STEMI on ECG',
      source: src('f-1077-01', 'admission_note.pdf'),
    },
    {
      date: '2026-10-26',
      title: 'Troponin',
      text: 'hs-TnI 4,820 ng/L',
      source: src('f-1077-03', 'troponin_lab.pdf'),
    },
    {
      date: '2026-10-27',
      title: 'Cath lab',
      text: 'PTCA, one DES to proximal LAD',
      source: src('f-1077-04', 'angiography_report.pdf'),
    },
  ],
  'SYN-P-1103': [
    {
      date: '2026-10-24',
      title: 'Admitted',
      text: '38 weeks, previous LSCS',
      source: src('f-1103-01', 'antenatal_card.jpg'),
    },
    {
      date: '2026-10-24',
      title: 'Surgery',
      text: 'Elective repeat LSCS, spinal',
      source: src('f-1103-02', 'lscs_operation_note.pdf'),
    },
    {
      date: '2026-10-25',
      title: 'Lab',
      text: 'Hb 10.8 g/dL POD 1',
      source: src('f-1103-03', 'cbc_report.pdf'),
    },
    {
      date: '2026-10-27',
      title: 'Discharged',
      text: 'Mother and baby stable',
      source: src('f-1103-04', 'discharge_summary.pdf'),
    },
  ],
  'SYN-P-1120': [
    {
      date: '2026-10-20',
      title: 'Biometry',
      text: 'IOL +21.5 D',
      source: src('f-1120-01', 'a_scan_biometry.pdf'),
    },
    {
      date: '2026-10-20',
      title: 'Surgery',
      text: 'Phaco + foldable IOL, right eye',
      source: src('f-1120-03', 'op_note.pdf'),
    },
    {
      date: '2026-10-20',
      title: 'Consent',
      text: 'Scan couldn’t be read, re-scan needed',
      source: src('f-1120-02', 'consent_form.jpg'),
    },
  ],
}

// Suggested questions per patient (prototype ASKQ). Used until the backend suggests them.
export const SUGGESTED_QUESTIONS_BY_PATIENT = {
  'SYN-P-1042': [
    'What procedure was done, and when?',
    'Is the anaesthesia record signed?',
    'Was the histopathology report received?',
  ],
  'SYN-P-1077': ['What did the angiography show?', 'What was the troponin level?'],
  'SYN-P-1103': ['What anaesthesia was used for the LSCS?'],
  'SYN-P-1120': ['What IOL power was planned?'],
}

export const DEFAULT_SUGGESTED_QUESTIONS = [
  'What procedure was done, and when?',
  'What is the final diagnosis?',
  'What was advised on discharge?',
]

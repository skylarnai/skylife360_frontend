export const MOCK_USERS = [
  {
    id: 'usr-admin-01',
    name: 'A. Rao',
    email: 'a.rao@suvidha.demo',
    title: 'Claims admin',
    role: 'ADMIN',
    tenant_id: 'tenant SYN-HOSP-01',
    is_active: true,
  },
  {
    id: 'usr-doc-01',
    name: 'Dr. S. Menon',
    email: 's.menon@suvidha.demo',
    title: 'Consultant, General Surgery',
    role: 'DOCTOR',
    tenant_id: 'tenant SYN-HOSP-01',
    is_active: true,
  },
  {
    id: 'usr-staff-01',
    name: 'K. Iyer',
    email: 'k.iyer@suvidha.demo',
    title: 'Medical records staff',
    role: 'RECORDS_STAFF',
    tenant_id: 'tenant SYN-HOSP-01',
    is_active: true,
  },
]

export const ROLE_CAPABILITY_MATRIX = [
  ['Upload claim files and retry failed ones', '✓', 'Medical records staff'],
  ['Find patient documents and read their text', '✓', '✓'],
  ['Ask questions about a patient', '✓', '✓ own patients'],
  ['See claim amounts and payer details', '✓', '–'],
  ['See gap check results', '✓', 'Only items sent to them'],
  ['See integrity findings', '✓', '–'],
  ['Approve and submit claims', '✓', '–'],
  ['Complete document requests and payer queries', 'View', '✓'],
  ['Manage users and roles', '✓', '–'],
]

// ==========================================
// Portal do Aluno — Shared TypeScript Types
// ==========================================

export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  cpf: string;
  rg?: string;
  classId: string;
  status: 'active' | 'inactive' | 'cancelled';
  registrationDate: string;
  photo?: string;
  addressZip?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  enrollmentNumber?: string;
  portalPassword?: string;
  discount?: number;
  guardianName?: string;
  guardianCpf?: string;
  guardianPhone?: string;
  guardianEmail?: string;
}

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  discount?: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  paidDate?: string;
  type: 'monthly' | 'registration' | 'other';
  installmentNumber?: number;
  totalInstallments?: number;
  description?: string;
  asaasPaymentId?: string;
  asaasPaymentUrl?: string;
  transactionReceiptUrl?: string;
}

export interface Grade {
  id: string;
  studentId: string;
  subjectId: string;
  value: number;
  period: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  classId: string;
  date: string; // ISO String (UTC)
  photo?: string;
  verified: boolean;
  type?: 'presence' | 'absence';
  justification?: string; // string (upload em base64 ou texto do motivo)
}

export interface Class {
  id: string;
  name: string;
  courseId: string;
  teacher: string;
  schedule: string;
}

export interface Course {
  id: string;
  name: string;
  duration: string;
  monthlyFee: number;
}

export interface Contract {
  id: string;
  studentId: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface Certificate {
  id: string;
  studentId: string;
  description?: string;
  issueDate: string;
}

export interface Subject {
  id: string;
  name: string;
  classId?: string;
}

export interface SchoolProfile {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  cnpj: string;
  phone: string;
  email: string;
}

export interface Boleto {
  id: string;
  aluno_id: string;
  asaas_customer_id?: string;
  asaas_payment_id?: string;
  asaas_installment_id?: string;
  valor: number;
  vencimento: string;
  link_boleto?: string;
  link_carne?: string;
  status: string;
  created_at: string;
}

export interface AuthUser {
  studentId: string;
  enrollmentNumber: string;
  name: string;
}

// ==========================================
// Novas Interfaces — SchoolData (EduManager)
// ==========================================

export interface Lesson {
  id: string;
  classId: string;
  date: string; // ISO Date YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  status: 'scheduled' | 'cancelled' | 'completed' | 'rescheduled';
  type: 'regular' | 'reposicao';
  cancelReason?: string;
  originalLessonId?: string;
}

export interface Notification {
  id: string;
  studentId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string; // ISO string
}
